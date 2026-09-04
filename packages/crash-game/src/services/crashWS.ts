import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { crashEngine } from './crashEngine';
import { pool } from '../db/pool';

interface GameSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://wallet-service.railway.internal:3002';

export function initCrashWS(server: any) {
  const wss = new WebSocketServer({ server });

  const broadcast = (data: object) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  };

  crashEngine.on('round_start', data => broadcast({ type: 'round_start', ...data }));
  crashEngine.on('round_running', data => broadcast({ type: 'round_running', ...data }));
  crashEngine.on('tick', data => broadcast({ type: 'tick', ...data }));
  crashEngine.on('crashed', data => broadcast({ type: 'crashed', ...data }));
  crashEngine.on('bet_placed', data => broadcast({ type: 'bet_placed', ...data }));
  crashEngine.on('cashout', data => broadcast({ type: 'cashout', ...data }));

  wss.on('connection', async (ws: GameSocket, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        ws.userId = payload.id || payload.userId;
        const { rows } = await pool.query('SELECT username FROM users WHERE id=$1', [ws.userId]);
        ws.username = rows[0]?.username || 'Player';
      } catch { /* anonymous */ }
    }

    ws.send(JSON.stringify({ type: 'init', state: crashEngine.getState() }));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'bet') {
          if (!ws.userId || !ws.username) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' })); return;
          }
          const amount = parseFloat(msg.amount);
          const slotId = msg.slotId ?? null; // frontend slot identifier
          if (!amount || amount <= 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid amount', slotId })); return;
          }

          const state = crashEngine.getState();
          const existingBets = crashEngine.getUserBetIds(ws.userId).length;
          const debitRes = await fetch(`${WALLET_URL}/wallet/internal/debit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ws.userId,
              amount,
              type: 'bet',
              game: 'crash',
              referenceId: `crash_${state.roundId}_${ws.userId}_${existingBets}`,
            }),
          });

          if (!debitRes.ok) {
            const err = await debitRes.json().catch(() => ({ error: 'Insufficient funds' }));
            ws.send(JSON.stringify({ type: 'error', message: (err as any).error || 'Insufficient funds', slotId })); return;
          }

          const betId = await crashEngine.placeBet(ws.userId, ws.username, amount, msg.autoCashout ?? undefined);
          ws.send(JSON.stringify({ type: 'bet_accepted', betId, slotId, amount }));
        }

        if (msg.type === 'cashout') {
          if (!ws.userId) return;
          const betId: string | undefined = msg.betId;
          const slotId = msg.slotId ?? null;
          const state = crashEngine.getState();
          const profit = await crashEngine.cashout(ws.userId, betId);

          await fetch(`${WALLET_URL}/wallet/internal/credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ws.userId,
              amount: profit,
              type: 'win',
              game: 'crash',
              referenceId: `crash_cashout_${state.roundId}_${betId || ws.userId}`,
            }),
          }).catch(console.error);

          ws.send(JSON.stringify({ type: 'cashout_confirmed', betId, slotId, profit }));
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }

      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {});
    ws.on('error', () => {});
  });

  setInterval(() => {
    wss.clients.forEach((ws: GameSocket) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  console.log('Crash WebSocket ready on /crash');
}
