import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

app.use(helmet());
app.use(cors());
app.use(express.json());

// Init tables
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    balance NUMERIC(18,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).catch(console.error);

const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  next();
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Auth
app.post('/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) { res.status(400).json({ error: 'Missing fields' }); return; }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, role, status, created_at',
      [email.toLowerCase(), username, hash]
    );
    const user = result.rows[0];
    await pool.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    if (err.code === '23505') { res.status(400).json({ error: 'Email or username already taken' }); return; }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email?.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    if (user.status !== 'active') { res.status(403).json({ error: `Account ${user.status}` }); return; }
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

app.get('/auth/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, username, role, status, created_at FROM users WHERE id=$1', [(req as any).user.id]);
    res.json({ user: result.rows[0] });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// Seed first admin
app.post('/admin/seed', async (_req, res) => {
  try {
    const existing = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (existing.rows.length > 0) { res.json({ message: 'Admin already exists' }); return; }
    const hash = await bcrypt.hash('Admin123!', 10);
    await pool.query(
      "INSERT INTO users (email, username, password_hash, role) VALUES ('admin@casino.com', 'admin', $1, 'admin') ON CONFLICT (email) DO UPDATE SET role='admin'",
      [hash]
    );
    res.json({ message: 'Admin created: admin@casino.com / Admin123!' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin — players
app.get('/admin/players', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, search = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * 20;
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (search) { params.push(`%${search}%`); where += ` AND (email ILIKE $${params.length} OR username ILIKE $${params.length})`; }
    if (status) { params.push(status); where += ` AND status=$${params.length}`; }
    params.push(20, offset);
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.role, u.status, u.created_at, COALESCE(w.balance,0) as balance
       FROM users u LEFT JOIN wallets w ON w.user_id=u.id ${where} ORDER BY u.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const count = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params.slice(0, -2));
    res.json({ players: result.rows, total: Number(count.rows[0].count) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/players/:id', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.*, COALESCE(w.balance,0) as balance FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE u.id=$1',
      [req.params.id]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ player: result.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/players/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/players/:id/note', auth, adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    await pool.query('UPDATE users SET notes=$1, updated_at=NOW() WHERE id=$2', [note, req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin stats
app.get('/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [players, active, registrations] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE role!=\'admin\''),
      pool.query("SELECT COUNT(*) FROM users WHERE updated_at > NOW()-INTERVAL '1 day' AND role!='admin'"),
      pool.query("SELECT id, email, username, created_at FROM users WHERE role!='admin' ORDER BY created_at DESC LIMIT 10"),
    ]);
    res.json({
      totalPlayers: Number(players.rows[0].count),
      activeToday: Number(active.rows[0].count),
      recentRegistrations: registrations.rows,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`user-service running on port ${PORT}`));
export default app;
