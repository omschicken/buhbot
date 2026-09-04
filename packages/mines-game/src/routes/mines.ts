import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { minesService } from '../services/mines.service';

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
    body: JSON.stringify({ userId, amount, type: 'bet', game: 'mines', referenceId }),
  });
  return res.ok;
}

async function credit(userId: string, amount: number, referenceId: string): Promise<void> {
  if (amount <= 0) return;
  const res = await fetch(`${WALLET_URL}/wallet/internal/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, type: 'win', game: 'mines', referenceId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Credit failed ${res.status}: ${body}`);
    throw new Error(`Credit failed: ${res.status}`);
  }
}

// POST /mines/start
router.post('/start', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { betAmount, minesCount, clientSeed } = req.body;
    const bet = Number(betAmount);

    if (!bet || bet <= 0) {
      res.status(400).json({ success: false, error: 'Invalid bet amount' }); return;
    }

    const tempId = uuidv4();
    const debited = await debit(userId, bet, `mines_${tempId}`);
    if (!debited) {
      res.status(402).json({ success: false, error: 'Insufficient funds' }); return;
    }

    const result = await minesService.startRound(userId, { betAmount: bet, minesCount: Number(minesCount), clientSeed });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// POST /mines/open
router.post('/open', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { roundId, cellIndex } = req.body;

    if (roundId === undefined || cellIndex === undefined) {
      res.status(400).json({ success: false, error: 'roundId and cellIndex required' }); return;
    }

    const result = await minesService.openCell(userId, roundId, Number(cellIndex));

    if (result.isMine) {
      // money already lost — no credit needed
      res.json({ success: true, data: result });
      return;
    }

    if ((result as any).allOpened) {
      // auto cash out — credit payout
      await credit(userId, (result as any).payout, `mines_win_${roundId}`);
    }

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// POST /mines/cashout
router.post('/cashout', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { roundId } = req.body;

    if (!roundId) {
      res.status(400).json({ success: false, error: 'roundId required' }); return;
    }

    const result = await minesService.cashOut(userId, roundId);
    await credit(userId, result.payout, `mines_win_${roundId}`);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// GET /mines/active
router.get('/active', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await minesService.getActiveRound((req as any).userId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /mines/history
router.get('/history', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const data = await minesService.getHistory((req as any).userId, page);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// GET /mines/verify/:roundId
router.get('/verify/:roundId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await minesService.verify(req.params.roundId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

export default router;
