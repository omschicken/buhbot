import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

app.use(helmet());
app.use(cors());
app.use(express.json());

pool.query(`
  CREATE TABLE IF NOT EXISTS bonus_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC(18,2),
    percent NUMERIC(5,2),
    wagering INTEGER DEFAULT 30,
    min_deposit NUMERIC(18,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    expires_days INTEGER DEFAULT 7,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS user_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    template_id UUID REFERENCES bonus_templates(id),
    name TEXT,
    amount NUMERIC(18,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    wagering INTEGER DEFAULT 30,
    wagered_amount NUMERIC(18,2) DEFAULT 0,
    wagering_target NUMERIC(18,2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS vip_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    level INTEGER DEFAULT 0,
    xp NUMERIC(18,2) DEFAULT 0,
    next_xp NUMERIC(18,2) DEFAULT 1000,
    name TEXT DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'bonus-engine' }));

app.get('/bonus/bonuses/my', auth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_bonuses WHERE user_id=$1 AND status='active'", [(req as any).user.id]);
    res.json({ bonuses: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/bonus/vip', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    let result = await pool.query('SELECT * FROM vip_records WHERE user_id=$1', [userId]);
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO vip_records (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      result = await pool.query('SELECT * FROM vip_records WHERE user_id=$1', [userId]);
    }
    res.json(result.rows[0] || { level: 0, xp: 0, next_xp: 1000, name: 'Bronze' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin bonuses
app.get('/admin/bonuses', auth, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bonus_templates ORDER BY created_at DESC');
    res.json({ bonuses: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/bonuses', auth, adminOnly, async (req, res) => {
  try {
    const { name, type, amount, percent, wagering, min_deposit, currency, expires_days } = req.body;
    const result = await pool.query(
      'INSERT INTO bonus_templates (name, type, amount, percent, wagering, min_deposit, currency, expires_days) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, type, amount || null, percent || null, wagering || 30, min_deposit || 0, currency || 'USD', expires_days || 7]
    );
    res.json({ bonus: result.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/bonuses/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, type, amount, percent, wagering, min_deposit, currency, expires_days, active } = req.body;
    const result = await pool.query(
      'UPDATE bonus_templates SET name=$1, type=$2, amount=$3, percent=$4, wagering=$5, min_deposit=$6, currency=$7, expires_days=$8, active=$9 WHERE id=$10 RETURNING *',
      [name, type, amount, percent, wagering, min_deposit, currency, expires_days, active, req.params.id]
    );
    res.json({ bonus: result.rows[0] });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin/bonuses/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM bonus_templates WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`bonus-engine running on port ${PORT}`));
export default app;
