import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { crashEngine } from '../services/crashEngine';
import { verifyCrashPoint } from '../utils/provablyFair';
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

export default router;
