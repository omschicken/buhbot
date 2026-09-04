import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { plinkoService } from '../services/plinko.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://wallet-service.railway.internal:3002';

function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.id || payload.userId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

async function debit(userId: string, amount: number, referenceId: string): Promise<boolean> {
  const res = await fetch(`${WALLET_URL}/wallet/internal/debit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, type: 'bet', game: 'plinko', referenceId }),
  });
  return res.ok;
}

async function credit(userId: string, amount: number, referenceId: string): Promise<void> {
  if (amount <= 0) return;
  const res = await fetch(`${WALLET_URL}/wallet/internal/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, type: 'win', game: 'plinko', referenceId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Credit failed ${res.status}: ${body}`);
    throw new Error(`Credit failed: ${res.status}`);
  }
}

// POST /plinko/play
router.post('/play', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { betAmount, risk = 'medium', rows = 16, clientSeed } = req.body;
    const bet = Number(betAmount);

    if (!bet || bet <= 0) {
      res.status(400).json({ success: false, error: 'Invalid bet amount' }); return;
    }
    if (!['low', 'medium', 'high'].includes(risk)) {
      res.status(400).json({ success: false, error: 'Invalid risk' }); return;
    }
    if (![8, 12, 16].includes(Number(rows))) {
      res.status(400).json({ success: false, error: 'Invalid rows' }); return;
    }

    const tempId = uuidv4();
    const debited = await debit(userId, bet, `plinko_${tempId}`);
    if (!debited) {
      res.status(402).json({ success: false, error: 'Insufficient funds' }); return;
    }

    const result = await plinkoService.play(userId, {
      betAmount: bet,
      risk: risk as 'low' | 'medium' | 'high',
      rows: Number(rows) as 8 | 12 | 16,
      clientSeed,
    });

    if (result.payout > 0) {
      await credit(userId, result.payout, `plinko_win_${result.roundId}`);
    }

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// GET /plinko/history
router.get('/history', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const data = await plinkoService.getHistory((req as any).userId, page);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /plinko/verify/:roundId
router.get('/verify/:roundId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await plinkoService.verify(req.params.roundId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /plinko/config
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { risks: ['low', 'medium', 'high'], rowOptions: [8, 12, 16], minBet: 0.10, maxBet: 10000 },
  });
});

export default router;
