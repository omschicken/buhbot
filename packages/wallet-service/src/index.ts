import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { HDWalletService, COINS, CoinSymbol } from './services/hdwallet.service';
import { startBlockchainMonitor } from './services/blockchain.monitor';
import { notifyWithdrawalRequest, notifyWithdrawalApproved, notifyWithdrawalRejected, sendDailyStats, setupBotCommands } from './services/telegram.service';
import cron from 'node-cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });
const hdWallet = new HDWalletService(pool);

app.use(helmet());
app.use(cors());
app.use(express.json());

pool.query(`
  CREATE TABLE IF NOT EXISTS crypto_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin TEXT UNIQUE NOT NULL,
    xpub TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS player_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    coin TEXT NOT NULL,
    address TEXT NOT NULL,
    address_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coin),
    UNIQUE(coin, address)
  );
  CREATE TABLE IF NOT EXISTS crypto_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    coin TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    amount_usd NUMERIC(18,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    credited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tx_hash, coin)
  );
  CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    balance NUMERIC(18,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    wallet_id UUID,
    amount NUMERIC(18,2) NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    description TEXT,
    reference_id TEXT,
    method TEXT,
    destination TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    method TEXT,
    destination TEXT,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).catch(console.error);

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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'wallet-service' }));

app.get('/wallet/balance', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    let result = await pool.query('SELECT balance, currency FROM wallets WHERE user_id=$1', [userId]);
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      result = await pool.query('SELECT balance, currency FROM wallets WHERE user_id=$1', [userId]);
    }
    res.json({ balance: Number(result.rows[0]?.balance || 0), currency: result.rows[0]?.currency || 'USD' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/wallet/transactions', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, pageSize, offset]
    );
    res.json({ transactions: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/wallet/withdraw', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = (req as any).user;
    const { amount, coin, address } = req.body;
    if (!amount || amount < 10) { res.status(400).json({ error: 'Minimum withdrawal is $10' }); return; }
    if (!coin || !address) { res.status(400).json({ error: 'Coin and address are required' }); return; }
    const wallet = await pool.query('SELECT id, balance FROM wallets WHERE user_id=$1', [userId]);
    if (!wallet.rows[0] || Number(wallet.rows[0].balance) < amount) {
      res.status(400).json({ error: 'Insufficient balance' }); return;
    }
    await pool.query('UPDATE wallets SET balance=balance-$1 WHERE user_id=$2', [amount, userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, wallet_id, amount, type, status, description, method, destination) VALUES ($1,$2,$3,\'withdrawal\',\'pending\',$4,$5,$6)',
      [userId, wallet.rows[0].id, amount, `Withdrawal ${coin} to ${address}`, coin, address]
    );
    const wr = await pool.query(
      'INSERT INTO withdrawal_requests (user_id, amount, method, destination) VALUES ($1,$2,$3,$4) RETURNING id',
      [userId, amount, coin, address]
    );
    notifyWithdrawalRequest({
      withdrawalId: wr.rows[0].id,
      userId,
      username: user.username || user.email || 'Unknown',
      email: user.email || '',
      amount,
      coin,
      address,
      userBalance: Number(wallet.rows[0].balance) - amount,
    }).catch(console.error);
    res.json({ ok: true, withdrawalId: wr.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/wallet/withdrawals/my', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await pool.query(
      'SELECT id, amount, method as coin, destination as address, status, reason, created_at FROM withdrawal_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({ withdrawals: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin
app.get('/admin/stats', auth, adminOnly, async (_req, res) => {
  try {
    const [ggr, ggrMonth, pending] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(CASE WHEN type='bet' THEN amount ELSE 0 END) - SUM(CASE WHEN type='win' THEN amount ELSE 0 END),0) as ggr FROM transactions WHERE created_at > NOW()-INTERVAL '1 day'"),
      pool.query("SELECT COALESCE(SUM(CASE WHEN type='bet' THEN amount ELSE 0 END) - SUM(CASE WHEN type='win' THEN amount ELSE 0 END),0) as ggr FROM transactions WHERE created_at > NOW()-INTERVAL '30 days'"),
      pool.query("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as sum FROM withdrawal_requests WHERE status='pending' LIMIT 1"),
    ]);
    const recentTx = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10');
    const ggr30 = await pool.query(`
      SELECT DATE(created_at) as day,
        COALESCE(SUM(CASE WHEN type='bet' THEN amount ELSE 0 END) - SUM(CASE WHEN type='win' THEN amount ELSE 0 END),0) as ggr
      FROM transactions WHERE created_at > NOW()-INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY day
    `);
    res.json({
      ggrToday: Number(ggr.rows[0].ggr),
      ggrMonth: Number(ggrMonth.rows[0].ggr),
      pendingWithdrawals: { count: Number(pending.rows[0]?.count || 0), sum: Number(pending.rows[0]?.sum || 0) },
      recentTransactions: recentTx.rows,
      ggrChart: ggr30.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/withdrawals', auth, adminOnly, async (req, res) => {
  try {
    const { status = '' } = req.query;
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (status) { params.push(status); where += ` AND wr.status=$${params.length}`; }
    const result = await pool.query(
      `SELECT wr.* FROM withdrawal_requests wr ${where} ORDER BY wr.created_at DESC LIMIT 50`,
      params
    );
    res.json({ withdrawals: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/withdrawals/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const wr = await pool.query('SELECT * FROM withdrawal_requests WHERE id=$1', [req.params.id]);
    if (!wr.rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    await pool.query("UPDATE withdrawal_requests SET status='approved' WHERE id=$1", [req.params.id]);
    notifyWithdrawalApproved({
      username: wr.rows[0].user_id,
      amount: Number(wr.rows[0].amount),
      coin: wr.rows[0].method || 'BTC',
      address: wr.rows[0].destination || '',
    }).catch(console.error);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/withdrawals/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const wr = await pool.query('SELECT * FROM withdrawal_requests WHERE id=$1', [req.params.id]);
    if (!wr.rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    if (wr.rows[0].status === 'pending') {
      await pool.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [wr.rows[0].amount, wr.rows[0].user_id]);
    }
    await pool.query("UPDATE withdrawal_requests SET status='rejected', reason=$1 WHERE id=$2", [reason || 'No reason', req.params.id]);
    notifyWithdrawalRejected({
      username: wr.rows[0].user_id,
      amount: Number(wr.rows[0].amount),
      reason: reason || 'No reason provided',
    }).catch(console.error);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/players/:id/balance', auth, adminOnly, async (req, res) => {
  try {
    const { amount, type, reason } = req.body;
    const adj = type === 'credit' ? amount : -amount;
    await pool.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [adj, req.params.id]);
    await pool.query(
      'INSERT INTO transactions (user_id, amount, type, status, description) VALUES ($1,$2,$3,\'completed\',$4)',
      [req.params.id, Math.abs(amount), type === 'credit' ? 'deposit' : 'withdrawal', reason || 'Admin adjustment']
    );
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/transactions', auth, adminOnly, async (req, res) => {
  try {
    const { type = '', from = '', to = '', search = '' } = req.query;
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (type) { params.push(type); where += ` AND type=$${params.length}`; }
    if (from) { params.push(from); where += ` AND created_at>=$${params.length}`; }
    if (to) { params.push(to); where += ` AND created_at<=$${params.length}`; }
    if (search) { params.push(search); where += ` AND (user_id::text=$${params.length} OR reference_id=$${params.length})`; }
    const result = await pool.query(`SELECT * FROM transactions ${where} ORDER BY created_at DESC LIMIT 200`, params);
    res.json({ transactions: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Deposit routes
app.get('/wallet/deposit/address/:coin', auth, async (req, res) => {
  try {
    const coin = req.params.coin.toUpperCase() as CoinSymbol;
    if (!COINS[coin]) { res.status(400).json({ error: 'Unsupported coin' }); return; }
    const userId = (req as any).user.id;
    const address = await hdWallet.getOrCreateAddress(userId, coin);
    const qr = await QRCode.toDataURL(address);
    const conf = COINS[coin];
    res.json({ coin, address, qr, confirmations: conf.confirmations, name: conf.name });
  } catch (err: any) {
    if (err.message?.includes('not initialized')) {
      res.status(503).json({ error: `${req.params.coin} wallet not initialized. Run init-wallets script.` });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/wallet/deposit/history', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await pool.query(
      'SELECT * FROM crypto_deposits WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json({ deposits: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/wallet/deposit/:txHash/status', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM crypto_deposits WHERE tx_hash=$1 AND user_id=$2',
      [req.params.txHash, (req as any).user.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(result.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/wallet/coins', (_req, res) => {
  res.json({ coins: Object.values(COINS).map(c => ({ symbol: c.symbol, name: c.name, confirmations: c.confirmations })) });
});

startBlockchainMonitor(pool);

// Daily stats at 9:00 MSK (6:00 UTC)
cron.schedule('0 6 * * *', async () => {
  try {
    const [deps, wds, ggrR, active, newP] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='deposit' AND created_at > NOW()-INTERVAL '1 day'"),
      pool.query("SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE type='withdrawal' AND created_at > NOW()-INTERVAL '1 day'"),
      pool.query("SELECT COALESCE(SUM(CASE WHEN type='bet' THEN amount ELSE 0 END)-SUM(CASE WHEN type='win' THEN amount ELSE 0 END),0) as ggr FROM transactions WHERE created_at > NOW()-INTERVAL '1 day'"),
      pool.query("SELECT COUNT(DISTINCT user_id) as c FROM transactions WHERE created_at > NOW()-INTERVAL '1 day'"),
      pool.query("SELECT COUNT(*) as c FROM wallets WHERE created_at > NOW()-INTERVAL '1 day'"),
    ]);
    await sendDailyStats({
      newPlayers: Number(newP.rows[0].c),
      deposits: Number(deps.rows[0].s),
      withdrawals: Number(wds.rows[0].s),
      ggr: Number(ggrR.rows[0].ggr),
      activeUsers: Number(active.rows[0].c),
    });
  } catch (e) { console.error('Daily stats error:', e); }
});

setupBotCommands();
app.listen(PORT, () => console.log(`wallet-service running on port ${PORT}`));
export default app;
