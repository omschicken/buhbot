import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

app.use(helmet());
app.use(cors());
app.use(express.json());

pool.query(`
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
    const { amount, method, destination } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }
    const wallet = await pool.query('SELECT id, balance FROM wallets WHERE user_id=$1', [userId]);
    if (!wallet.rows[0] || Number(wallet.rows[0].balance) < amount) {
      res.status(400).json({ error: 'Insufficient balance' }); return;
    }
    await pool.query('UPDATE wallets SET balance=balance-$1 WHERE user_id=$2', [amount, userId]);
    await pool.query(
      'INSERT INTO transactions (user_id, wallet_id, amount, type, status, description, method, destination) VALUES ($1,$2,$3,\'withdrawal\',\'pending\',$4,$5,$6)',
      [userId, wallet.rows[0].id, amount, `Withdrawal via ${method}`, method, destination]
    );
    // Create withdrawal request
    await pool.query(
      `CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        method TEXT,
        destination TEXT,
        status TEXT DEFAULT 'pending',
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );
    await pool.query(
      'INSERT INTO withdrawal_requests (user_id, amount, method, destination) VALUES ($1,$2,$3,$4)',
      [userId, amount, method, destination]
    );
    res.json({ ok: true });
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
    await pool.query(`CREATE TABLE IF NOT EXISTS withdrawal_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, amount NUMERIC(18,2) NOT NULL, method TEXT, destination TEXT, status TEXT DEFAULT 'pending', reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    const { status = '' } = req.query;
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (status) { params.push(status); where += ` AND wr.status=$${params.length}`; }
    const result = await pool.query(
      `SELECT wr.*, u.email, u.username FROM withdrawal_requests wr LEFT JOIN transactions t ON t.user_id=wr.user_id AND t.type='withdrawal' LEFT JOIN pg_catalog.pg_description d ON false JOIN (SELECT id, email, username FROM wallets w2 LEFT JOIN (SELECT user_id, email, username FROM pg_catalog.pg_description WHERE false) u2 ON false) dummy ON false, (SELECT wr2.user_id FROM withdrawal_requests wr2 WHERE wr2.id=wr.id) x ${where} ORDER BY wr.created_at DESC LIMIT 50`,
      params
    );
    // Simpler query
    const r2 = await pool.query(
      `SELECT wr.* FROM withdrawal_requests wr ${where} ORDER BY wr.created_at DESC LIMIT 50`,
      params
    );
    res.json({ withdrawals: r2.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/withdrawals/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    await pool.query("UPDATE withdrawal_requests SET status='approved' WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/withdrawals/:id/reject', auth, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const wr = await pool.query('SELECT * FROM withdrawal_requests WHERE id=$1', [req.params.id]);
    if (wr.rows[0]?.status === 'pending') {
      await pool.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [wr.rows[0].amount, wr.rows[0].user_id]);
    }
    await pool.query("UPDATE withdrawal_requests SET status='rejected', reason=$1 WHERE id=$2", [reason, req.params.id]);
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

app.listen(PORT, () => console.log(`wallet-service running on port ${PORT}`));
export default app;
