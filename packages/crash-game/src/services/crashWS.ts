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

async function creditWallet(userId: string, amount: number, referenceId: string) {
  await fetch(`${WALLET_URL}/wallet/internal/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, type: 'win', game: 'crash', referenceId }),
  }).catch(console.error);
}

export function initCrashWS(server: any) {
  const wss = new WebSocketServer({ server });
  // userId → набор сокетов (один юзер может быть в нескольких вкладках)
  const userSockets = new Map<string, Set<GameSocket>>();

  const sendToUser = (userId: string, data: object) => {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const msg = JSON.stringify(data);
    sockets.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
  };

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

  // Авто-кешаут: движок эмитит событие, WS кредитует кошелёк и уведомляет юзера
  crashEngine.on('cashout', async (data: any) => {
    broadcast({ type: 'cashout', ...data });
    if (data.userId && data.profit) {
      const state = crashEngine.getState();
      await creditWallet(data.userId, data.profit, `crash_cashout_${state.roundId}_${data.betId}`);
      sendToUser(data.userId, { type: 'cashout_confirmed', betId: data.betId, slotId: data.slotId ?? null, profit: data.profit });
    }
  });

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

    if (ws.userId) {
      if (!userSockets.has(ws.userId)) userSockets.set(ws.userId, new Set());
      userSockets.get(ws.userId)!.add(ws);
    }

    ws.send(JSON.stringify({ type: 'init', state: crashEngine.getState() }));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'bet') {
          if (!ws.userId || !ws.username) {
            ws.send(JSON.stringify({ type: 'error', message: 'Необходима авторизация' })); return;
          }
          const amount = parseFloat(msg.amount);
          const slotId = msg.slotId ?? null;
          const autoCashout = msg.autoCashout ? parseFloat(msg.autoCashout) : undefined;

          if (!amount || amount <= 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Неверная сумма', slotId })); return;
          }
          if (autoCashout !== undefined && autoCashout <= 1) {
            ws.send(JSON.stringify({ type: 'error', message: 'Авто-кешаут должен быть > 1', slotId })); return;
          }

          const state = crashEngine.getState();
          // Используем количество ставок ДО дебита — атомарно считываем здесь
          const betIndex = crashEngine.getUserBetIds(ws.userId).length;

          const debitRes = await fetch(`${WALLET_URL}/wallet/internal/debit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ws.userId,
              amount,
              type: 'bet',
              game: 'crash',
              referenceId: `crash_${state.roundId}_${ws.userId}_slot${slotId ?? betIndex}`,
            }),
          });

          if (!debitRes.ok) {
            const err = await debitRes.json().catch(() => ({ error: 'Недостаточно средств' }));
            ws.send(JSON.stringify({ type: 'error', message: (err as any).error || 'Недостаточно средств', slotId })); return;
          }

          try {
            const betId = await crashEngine.placeBet(ws.userId, ws.username, amount, autoCashout, slotId);
            ws.send(JSON.stringify({ type: 'bet_accepted', betId, slotId, amount }));
          } catch (e: any) {
            // Откат дебита если ставка не прошла
            await fetch(`${WALLET_URL}/wallet/internal/credit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: ws.userId, amount, type: 'refund', game: 'crash',
                referenceId: `crash_refund_${state.roundId}_${ws.userId}_slot${slotId ?? betIndex}`,
              }),
            }).catch(console.error);
            ws.send(JSON.stringify({ type: 'error', message: e.message, slotId }));
          }
        }

        if (msg.type === 'cashout') {
          if (!ws.userId) return;
          const betId: string | undefined = msg.betId;
          // Кошелёк и уведомление обрабатываются в on('cashout') листенере
          // чтобы не дублировать кредит между авто и ручным кешаутом
          await crashEngine.cashout(ws.userId, betId);
        }

        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));

      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        userSockets.get(ws.userId)?.delete(ws);
        if (userSockets.get(ws.userId)?.size === 0) userSockets.delete(ws.userId);
      }
    });
    ws.on('error', () => {});
  });

  setInterval(() => {
    wss.clients.forEach((ws: GameSocket) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  console.log('Crash WebSocket ready');
}
