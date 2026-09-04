import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { baccaratService } from '../services/baccarat.service';

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
    body: JSON.stringify({ userId, amount, type: 'bet', game: 'baccarat', referenceId }),
  });
  return res.ok;
}

async function credit(userId: string, amount: number, referenceId: string): Promise<void> {
  if (amount <= 0) return;
  const res = await fetch(`${WALLET_URL}/wallet/internal/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, type: 'win', game: 'baccarat', referenceId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Credit failed ${res.status}: ${body}`);
    throw new Error(`Credit failed: ${res.status}`);
  }
}

// POST /baccarat/play
router.post('/play', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { betPlayer = 0, betBanker = 0, betTie = 0, clientSeed } = req.body;
    const totalBet = Number(betPlayer) + Number(betBanker) + Number(betTie);

    if (totalBet <= 0) {
      res.status(400).json({ success: false, error: 'Place at least one bet' }); return;
    }

    const tempId = require('uuid').v4();
    const debited = await debit(userId, totalBet, `baccarat_${tempId}`);
    if (!debited) {
      res.status(402).json({ success: false, error: 'Insufficient funds' }); return;
    }

    const result = await baccaratService.play(userId, {
      betPlayer: Number(betPlayer),
      betBanker: Number(betBanker),
      betTie: Number(betTie),
      clientSeed,
    });

    if (result.payout > 0) {
      await credit(userId, result.payout, `baccarat_win_${result.roundId}`);
    }

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// GET /baccarat/history
router.get('/history', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const data = await baccaratService.getHistory((req as any).userId, page);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /baccarat/stats
router.get('/stats', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await baccaratService.getStats((req as any).userId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /baccarat/verify/:roundId
router.get('/verify/:roundId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await baccaratService.verify(req.params.roundId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

export default router;
