import { Router, Request, Response } from 'express';
import { pool } from '../db/pool';
import { rugPullEngine } from '../services/rugpullEngine';
import { generateRugPoint, hashServerSeed } from '../utils/provablyFair';

const router = Router();

router.get('/state', (_req: Request, res: Response) => {
  res.json(rugPullEngine.getState());
});

router.get('/history', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, round_number, server_seed_hash, client_seed, rug_point,
             status, total_pool, lost_pool, house_take, pulled_at, created_at
      FROM rugpull_rounds
      WHERE status = 'pulled'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-bets', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { rows } = await pool.query(`
      SELECT b.*, r.round_number, r.rug_point, r.pulled_at
      FROM rugpull_bets b
      JOIN rugpull_rounds r ON b.round_id = r.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT 50
    `, [userId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT username, SUM(bonus_payout) as total_bonus,
             COUNT(*) as rounds_played,
             MAX(cashout_at) as best_cashout
      FROM rugpull_bets
      WHERE bonus_payout > 0
      GROUP BY username
      ORDER BY total_bonus DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/verify/:roundId', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM rugpull_rounds WHERE id=$1 OR round_number=$2`,
      [req.params.roundId, parseInt(req.params.roundId) || -1]
    );
    if (!rows.length) return res.status(404).json({ error: 'Round not found' });

    const round = rows[0];
    if (round.status !== 'pulled') return res.status(400).json({ error: 'Round not finished' });

    const computedHash = hashServerSeed(round.server_seed);
    const computedRugPoint = generateRugPoint(round.server_seed, round.client_seed);

    res.json({
      roundId: round.id,
      roundNumber: round.round_number,
      serverSeed: round.server_seed,
      serverSeedHash: round.server_seed_hash,
      computedHash,
      clientSeed: round.client_seed,
      rugPoint: parseFloat(round.rug_point),
      computedRugPoint,
      verified: Math.abs(computedRugPoint - parseFloat(round.rug_point)) < 0.01 &&
                computedHash === round.server_seed_hash
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
