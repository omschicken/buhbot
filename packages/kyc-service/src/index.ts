import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

app.use(helmet());
app.use(cors());
app.use(express.json());

pool.query(`
  CREATE TABLE IF NOT EXISTS kyc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    level INTEGER DEFAULT 0,
    status TEXT DEFAULT 'not_started',
    document_path TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kyc-service' }));

app.get('/kyc/status', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    let result = await pool.query('SELECT * FROM kyc_records WHERE user_id=$1', [userId]);
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO kyc_records (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
      result = await pool.query('SELECT * FROM kyc_records WHERE user_id=$1', [userId]);
    }
    res.json(result.rows[0] || { level: 0, status: 'not_started' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/admin/kyc/pending', auth, adminOnly, async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM kyc_records WHERE status='in_review' ORDER BY updated_at");
    res.json({ records: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/kyc/:userId/review', auth, adminOnly, async (req, res) => {
  try {
    const { approved, level, reason } = req.body;
    await pool.query(
      'UPDATE kyc_records SET status=$1, level=$2, reason=$3, updated_at=NOW() WHERE user_id=$4',
      [approved ? 'approved' : 'rejected', approved ? level : 0, reason || null, req.params.userId]
    );
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`kyc-service running on port ${PORT}`));
export default app;
