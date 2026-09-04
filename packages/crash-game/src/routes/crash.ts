import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { crashEngine } from '../services/crashEngine';
import { verifyCrashPoint, generateCrashPoint, generateServerSeed, generateClientSeed } from '../utils/provablyFair';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';

const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try { (req as any).user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /crash/state
router.get('/state', (_req, res) => {
  res.json({ success: true, state: crashEngine.getState() });
});

// GET /crash/history
router.get('/history', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, round_number, server_seed_hash, client_seed, crash_point, status,
             started_at, crashed_at, created_at
      FROM crash_rounds
      WHERE status = 'crashed'
      ORDER BY round_number DESC
      LIMIT 50
    `);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// GET /crash/my-bets
router.get('/my-bets', auth, async (req, res, next) => {
  try {
    const userId = (req as any).user.id || (req as any).user.userId;
    const { rows } = await pool.query(`
      SELECT cb.*, cr.round_number, cr.crash_point, cr.created_at as round_date
      FROM crash_bets cb
      JOIN crash_rounds cr ON cr.id = cb.round_id
      WHERE cb.user_id = $1
      ORDER BY cb.created_at DESC
      LIMIT 50
    `, [userId]);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// GET /crash/verify/:roundId
router.get('/verify/:roundId', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, round_number, server_seed, server_seed_hash, client_seed, crash_point
       FROM crash_rounds WHERE id=$1 AND status='crashed'`,
      [req.params.roundId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Round not found or not yet finished' }); return; }
    const r = rows[0];
    const valid = verifyCrashPoint(r.server_seed, r.client_seed, parseFloat(r.crash_point));
    res.json({
      success: true,
      data: {
        roundNumber: r.round_number,
        serverSeed: r.server_seed,
        serverSeedHash: r.server_seed_hash,
        clientSeed: r.client_seed,
        crashPoint: parseFloat(r.crash_point),
        verified: valid,
      }
    });
  } catch (e) { next(e); }
});

// GET /crash/test-distribution?count=10000
router.get('/test-distribution', (req, res) => {
  const count = Math.min(100000, Math.max(100, parseInt(req.query.count as string) || 10000));
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    points.push(generateCrashPoint(generateServerSeed(), generateClientSeed()));
  }
  const below2 = points.filter(p => p < 2).length;
  const b2to4 = points.filter(p => p >= 2 && p < 4).length;
  const b4to10 = points.filter(p => p >= 4 && p < 10).length;
  const b10to50 = points.filter(p => p >= 10 && p < 50).length;
  const above50 = points.filter(p => p >= 50).length;
  const avg = points.reduce((a, b) => a + b, 0) / count;
  const pct = (n: number) => (n / count * 100).toFixed(1) + '%';
  res.json({
    count,
    below2x: pct(below2),
    '2x_to_4x': pct(b2to4),
    '4x_to_10x': pct(b4to10),
    '10x_to_50x': pct(b10to50),
    above50x: pct(above50),
    average: avg.toFixed(2) + 'x',
    houseEdge: (1 - 1 / avg * 0.99).toFixed(2) + '%',
  });
});

export default router;
