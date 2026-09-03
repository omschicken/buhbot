import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

app.use(helmet());
app.use(cors());
app.use(express.json());

pool.query(`
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
`).catch(console.error);

const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try { (req as any).user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'affiliate-service' }));

app.get('/affiliate/dashboard', auth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    let result = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [userId]);
    if (result.rows.length === 0) {
      const code = 'REF-' + userId.slice(0, 8).toUpperCase();
      await pool.query('INSERT INTO affiliates (user_id, referral_code) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, code]);
      result = await pool.query('SELECT * FROM affiliates WHERE user_id=$1', [userId]);
    }
    const aff = result.rows[0];
    const baseUrl = process.env.FRONTEND_URL || 'https://buhbot-git-claude-casino-monorepo-setup-uaxxfz-oms13.vercel.app';
    res.json({
      dashboard: {
        code: aff.referral_code,
        link: `${baseUrl}?ref=${aff.referral_code}`,
        commission: Number(aff.commission_rate),
        referrals: aff.total_referrals,
        active: aff.active_referrals,
        earned: Number(aff.total_earned),
        monthly: aff.monthly_earnings || Array(12).fill(0),
      }
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`affiliate-service running on port ${PORT}`));
export default app;
