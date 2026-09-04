import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { startPayoutScheduler } from './services/payout.service';
import { setupAffiliateBot, notifyAffiliatePayoutDone } from './services/telegram.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

app.use(helmet());
app.use(cors());
app.use(express.json());

async function migrate() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      commission_rate NUMERIC(5,2) DEFAULT 35,
      total_referrals INTEGER DEFAULT 0,
      active_referrals INTEGER DEFAULT 0,
      total_earned NUMERIC(18,2) DEFAULT 0,
      monthly_earnings NUMERIC[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payout_address TEXT`);
  await pool.query(`ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS payout_coin TEXT DEFAULT 'USDT'`);
  await pool.query(`ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS min_payout NUMERIC(20,8) DEFAULT 50`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id),
      referred_user_id UUID NOT NULL,
      ngr NUMERIC(20,8) DEFAULT 0,
      commission NUMERIC(20,8) DEFAULT 0,
      period TEXT NOT NULL,
      paid BOOLEAN DEFAULT false,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(affiliate_id, referred_user_id, period)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ac_affiliate ON affiliate_commissions(affiliate_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ac_period ON affiliate_commissions(period)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_payouts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id),
      amount NUMERIC(20,8) NOT NULL,
      coin TEXT NOT NULL DEFAULT 'USDT',
      address TEXT NOT NULL,
      period TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
      tx_hash TEXT,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      affiliate_id UUID NOT NULL REFERENCES affiliates(id),
      referred_user_id UUID NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('Affiliate DB migration complete');
}

const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try { (req as any).user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  next();
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'affiliate-service' }));

// ─── User: dashboard ───────────────────────────────────────────────────────
app.get('/affiliate/dashboard', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id || (req as any).user.userId;
    let result = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [userId]);
    if (result.rows.length === 0) {
      const code = 'REF-' + userId.slice(0, 8).toUpperCase();
      await pool.query(
        'INSERT INTO affiliates (user_id, referral_code) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, code]
      );
      result = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [userId]);
    }
    const aff = result.rows[0];
    const period = new Date().toISOString().slice(0, 7);

    const commRes = await pool.query(
      `SELECT COALESCE(SUM(ngr),0) as ngr, COALESCE(SUM(commission),0) as commission,
              COUNT(DISTINCT referred_user_id) as players
       FROM affiliate_commissions WHERE affiliate_id=$1 AND period=$2`,
      [aff.id, period]
    );
    const cm = commRes.rows[0];

    const clicksRes = await pool.query(
      `SELECT COUNT(*) as count FROM affiliate_referrals WHERE affiliate_id=$1`,
      [aff.id]
    );

    const payoutsRes = await pool.query(
      `SELECT * FROM affiliate_payouts WHERE affiliate_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [aff.id]
    );

    const historyRes = await pool.query(
      `SELECT ac.period,
              COUNT(DISTINCT ac.referred_user_id) as referrals,
              SUM(ac.ngr) as ngr,
              SUM(ac.commission) as commission,
              MAX(ap.status) as payout_status
       FROM affiliate_commissions ac
       LEFT JOIN affiliate_payouts ap ON ap.affiliate_id=ac.affiliate_id AND ap.period=ac.period
       WHERE ac.affiliate_id=$1
       GROUP BY ac.period ORDER BY ac.period DESC LIMIT 12`,
      [aff.id]
    );

    const baseUrl = process.env.FRONTEND_URL || 'https://buhbot-git-claude-casino-monorepo-setup-uaxxfz-oms13.vercel.app';
    res.json({
      dashboard: {
        code: aff.referral_code,
        link: `${baseUrl}?ref=${aff.referral_code}`,
        commission: Number(aff.commission_rate),
        commissionRate: Number(aff.commission_rate),
        referrals: aff.total_referrals,
        active: aff.active_referrals,
        earned: Number(aff.total_earned),
        monthly: aff.monthly_earnings || Array(12).fill(0),
        payoutAddress: aff.payout_address || '',
        payoutCoin: aff.payout_coin || 'USDT',
        minPayout: Number(aff.min_payout),
        currentMonth: {
          clicks: Number(clicksRes.rows[0]?.count || 0),
          registrations: aff.total_referrals,
          activePlayers: Number(cm.players),
          earned: Number(cm.commission),
        },
        payouts: payoutsRes.rows,
        history: historyRes.rows,
      }
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── User: save payout settings ─────────────────────────────────────────────
app.post('/affiliate/payout-settings', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id || (req as any).user.userId;
    const { coin, address, minPayout } = req.body;
    await pool.query(
      `UPDATE affiliates SET payout_coin=$1, payout_address=$2, min_payout=$3 WHERE user_id=$4`,
      [coin, address, Math.max(50, Number(minPayout) || 50), userId]
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Internal: record NGR after round ───────────────────────────────────────
app.post('/affiliate/internal/ngr', async (req, res) => {
  try {
    const { referredUserId, betAmount, winAmount } = req.body;
    const ngr = betAmount - winAmount;
    if (ngr <= 0) { res.json({ ok: true }); return; }
    const period = new Date().toISOString().slice(0, 7);

    const affRes = await pool.query(
      `SELECT a.id, a.commission_rate FROM affiliates a
       JOIN affiliate_referrals ar ON ar.affiliate_id = a.id
       WHERE ar.referred_user_id=$1`,
      [referredUserId]
    );
    if (!affRes.rows[0]) { res.json({ ok: true }); return; }
    const aff = affRes.rows[0];
    const commission = ngr * (Number(aff.commission_rate) / 100);

    await pool.query(
      `INSERT INTO affiliate_commissions (affiliate_id, referred_user_id, ngr, commission, period)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (affiliate_id, referred_user_id, period)
       DO UPDATE SET ngr = affiliate_commissions.ngr + $3,
                     commission = affiliate_commissions.commission + $4,
                     updated_at = NOW()`,
      [aff.id, referredUserId, ngr, commission, period]
    );

    await pool.query(
      `UPDATE affiliates SET total_earned = total_earned + $1 WHERE id=$2`,
      [commission, aff.id]
    );

    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Internal: track referral registration ──────────────────────────────────
app.post('/affiliate/internal/register', async (req, res) => {
  try {
    const { refCode, userId } = req.body;
    if (!refCode || !userId) { res.json({ ok: true }); return; }
    const affRes = await pool.query(
      'SELECT id FROM affiliates WHERE referral_code=$1', [refCode]
    );
    if (!affRes.rows[0]) { res.json({ ok: false }); return; }
    const affId = affRes.rows[0].id;
    await pool.query(
      `INSERT INTO affiliate_referrals (affiliate_id, referred_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [affId, userId]
    );
    await pool.query(
      `UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE id=$1`, [affId]
    );
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: list all affiliates ─────────────────────────────────────────────
app.get('/admin/affiliates', auth, adminOnly, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, u.username, u.email,
        (SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_id=a.id) as referral_count
      FROM affiliates a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.total_earned DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: list payouts ────────────────────────────────────────────────────
app.get('/admin/affiliate/payouts', auth, adminOnly, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const { rows } = await pool.query(`
      SELECT ap.*, a.referral_code as ref_code, a.commission_rate, u.username, u.email
      FROM affiliate_payouts ap
      JOIN affiliates a ON a.id = ap.affiliate_id
      LEFT JOIN users u ON u.id = a.user_id
      WHERE ($1 = 'all' OR ap.status = $1)
      ORDER BY ap.created_at DESC
    `, [status]);
    res.json({ success: true, data: rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: approve payout ──────────────────────────────────────────────────
app.post('/admin/affiliate/payouts/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const { txHash } = req.body;
    if (!txHash) { res.status(400).json({ error: 'txHash required' }); return; }
    const { rows } = await pool.query('SELECT * FROM affiliate_payouts WHERE id=$1', [req.params.id]);
    const payout = rows[0];
    if (!payout) { res.status(404).json({ error: 'Not found' }); return; }
    if (!['pending', 'approved'].includes(payout.status)) {
      res.status(400).json({ error: 'Already processed' }); return;
    }

    const adminId = (req as any).user.id || (req as any).user.userId;
    await pool.query(
      `UPDATE affiliate_payouts SET status='completed', tx_hash=$2, approved_by=$3, approved_at=NOW() WHERE id=$1`,
      [req.params.id, txHash, adminId]
    );
    await pool.query(
      `UPDATE affiliate_commissions SET paid=true, paid_at=NOW()
       WHERE affiliate_id=$1 AND period=$2 AND paid=false`,
      [payout.affiliate_id, payout.period]
    );

    const affRes = await pool.query(
      `SELECT u.username FROM affiliates a JOIN users u ON u.id=a.user_id WHERE a.id=$1`,
      [payout.affiliate_id]
    );
    await notifyAffiliatePayoutDone({
      username: affRes.rows[0]?.username || 'Unknown',
      amount: parseFloat(payout.amount),
      coin: payout.coin,
      txHash,
    });

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: reject payout ───────────────────────────────────────────────────
app.post('/admin/affiliate/payouts/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const { rows } = await pool.query('SELECT * FROM affiliate_payouts WHERE id=$1', [req.params.id]);
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (rows[0].status !== 'pending') { res.status(400).json({ error: 'Already processed' }); return; }
    await pool.query(
      `UPDATE affiliate_payouts SET status='rejected', rejected_reason=$2, approved_at=NOW() WHERE id=$1`,
      [req.params.id, reason || 'Отклонено администратором']
    );
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: manual trigger payout calculation ───────────────────────────────
app.post('/admin/affiliate/payouts/trigger', auth, adminOnly, async (_req, res) => {
  try {
    const { processMonthlyPayouts } = await import('./services/payout.service');
    await processMonthlyPayouts();
    res.json({ success: true, message: 'Payout calculation triggered' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

migrate()
  .then(() => {
    startPayoutScheduler(pool);
    setupAffiliateBot(pool);
    app.listen(PORT, () => console.log(`affiliate-service running on port ${PORT}`));
  })
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });

export default app;
