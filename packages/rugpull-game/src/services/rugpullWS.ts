import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { rugPullEngine } from './rugpullEngine';
import { pool } from '../db/pool';

interface GameSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive?: boolean;
}

export function initRugPullWS(server: any) {
  const wss = new WebSocketServer({ server, path: '/rugpull' });

  const broadcast = (data: object) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach((ws: GameSocket) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    });
  };

  rugPullEngine.on('round_start', data => broadcast({ type: 'round_start', ...data }));
  rugPullEngine.on('round_running', data => broadcast({ type: 'round_running', ...data }));
  rugPullEngine.on('tick', data => broadcast({ type: 'tick', ...data }));
  rugPullEngine.on('pulled', data => broadcast({ type: 'pulled', ...data }));
  rugPullEngine.on('bet_placed', data => broadcast({ type: 'bet_placed', ...data }));
  rugPullEngine.on('cashout', data => broadcast({ type: 'cashout', ...data }));
  rugPullEngine.on('pool_update', data => broadcast({ type: 'pool_update', ...data }));
  rugPullEngine.on('round_cancelled', data => broadcast({ type: 'round_cancelled', ...data }));

  wss.on('connection', async (ws: GameSocket, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecret') as any;
        ws.userId = payload.userId || payload.id;
        ws.username = payload.username || 'Player';
      } catch {}
    }

    ws.send(JSON.stringify({ type: 'init', state: rugPullEngine.getState() }));

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'bet') {
          if (!ws.userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }

          const amount = parseFloat(msg.amount);
          if (isNaN(amount) || amount <= 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid amount' }));
            return;
          }

          const res = await fetch(`${process.env.WALLET_SERVICE_URL}/wallet/internal/debit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: ws.userId,
              amount,
              type: 'bet',
              game: 'rugpull',
              referenceId: `rugpull_${rugPullEngine.getState().roundId}_${ws.userId}`
            })
          });

          if (!res.ok) {
            ws.send(JSON.stringify({ type: 'error', message: 'Insufficient funds' }));
            return;
          }

          await rugPullEngine.placeBet(
            ws.userId, ws.username!, amount, msg.autoCashout ? parseFloat(msg.autoCashout) : undefined
          );
          ws.send(JSON.stringify({ type: 'bet_accepted', amount }));
        }

        if (msg.type === 'cashout') {
          if (!ws.userId) return;
          const payout = await rugPullEngine.cashout(ws.userId);
          ws.send(JSON.stringify({ type: 'cashout_confirmed', payout }));
        }

        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }

      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    });
  });

  setInterval(() => {
    wss.clients.forEach((ws: GameSocket) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  console.log('Rug Pull WebSocket ready on /rugpull');
}
