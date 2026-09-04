import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123casino2024';

const USER_URL = process.env.USER_SERVICE_URL || 'http://user-service.railway.internal:3001';
const WALLET_URL = process.env.WALLET_SERVICE_URL || 'http://wallet-service.railway.internal:3002';
const KYC_URL = process.env.KYC_SERVICE_URL || 'http://kyc-service.railway.internal:3003';
const BONUS_URL = process.env.BONUS_SERVICE_URL || 'http://bonus-engine.railway.internal:3005';
const AFFILIATE_URL = process.env.AFFILIATE_SERVICE_URL || 'http://affiliate-service.railway.internal:3006';
const CRASH_URL = process.env.CRASH_SERVICE_URL || 'http://crash-game.railway.internal:3008';
const BACCARAT_URL = process.env.BACCARAT_SERVICE_URL || 'http://baccarat-game.railway.internal:3009';
const PLINKO_URL = process.env.PLINKO_SERVICE_URL || 'http://plinko-game.railway.internal:3010';
const MINES_URL = process.env.MINES_SERVICE_URL || 'http://mines-game.railway.internal:3011';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: false }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ service: 'api-gateway', version: '1.0.0' }));

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try { (req as any).user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
  next();
};

const proxy = (target: string, pathFilter: string | string[], pathRewrite: Record<string, string>) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter,
    pathRewrite,
    on: {
      error: (_err, _req, res) => {
        (res as Response).status(502).json({ error: 'Service unavailable' });
      }
    }
  });

// Public auth routes
app.use(proxy(USER_URL, '/api/auth', { '^/api/auth': '/auth' }));

// Seed (public, one-time)
app.use(proxy(USER_URL, '/api/admin/seed', { '^/api/admin/seed': '/admin/seed' }));

// Protected routes — wallet
app.use('/api/wallet', verifyToken);
app.use(proxy(WALLET_URL, '/api/wallet', { '^/api/wallet': '/wallet' }));

// Protected routes — kyc
app.use('/api/kyc', verifyToken);
app.use(proxy(KYC_URL, '/api/kyc', { '^/api/kyc': '/kyc' }));

// Protected routes — bonus
app.use('/api/bonus', verifyToken);
app.use(proxy(BONUS_URL, '/api/bonus', { '^/api/bonus': '/bonus' }));

// Protected routes — affiliate
app.use('/api/affiliate', verifyToken);
app.use(proxy(AFFILIATE_URL, '/api/affiliate', { '^/api/affiliate': '/affiliate' }));

// Admin routes — auth middleware
app.use('/api/admin', verifyToken, adminOnly);

// Admin routes — balance adjustment (wallet-service) — direct route before generic players proxy
app.post('/api/admin/players/:id/test-deposit', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${WALLET_URL}/admin/players/${req.params.id}/test-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/players/:id/balance', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${WALLET_URL}/admin/players/${req.params.id}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Admin routes — user
app.use(proxy(USER_URL, '/api/admin/players', { '^/api/admin': '/admin' }));
app.use(proxy(USER_URL, '/api/admin/stats-users', { '^/api/admin/stats-users': '/admin/stats' }));

// Admin routes — wallet (direct routes for POST with :id params)
app.post('/api/admin/withdrawals/:id/approve', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${WALLET_URL}/admin/withdrawals/${req.params.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/withdrawals/:id/reject', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${WALLET_URL}/admin/withdrawals/${req.params.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.use(proxy(WALLET_URL, ['/api/admin/withdrawals', '/api/admin/transactions'], { '^/api/admin': '/admin' }));
app.use(proxy(WALLET_URL, '/api/admin/stats-wallet', { '^/api/admin/stats-wallet': '/admin/stats' }));

// Admin routes — kyc
app.use(proxy(KYC_URL, '/api/admin/kyc', { '^/api/admin/kyc': '/admin/kyc' }));

// Admin routes — bonus
app.use(proxy(BONUS_URL, '/api/admin/bonuses', { '^/api/admin': '/admin' }));

// Admin routes — affiliate payouts (direct routes for POST with :id params)
app.post('/api/admin/affiliate/payouts/:id/approve', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${AFFILIATE_URL}/admin/affiliate/payouts/${req.params.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/admin/affiliate/payouts/:id/reject', verifyToken, adminOnly, express.json(), async (req, res) => {
  try {
    const r = await fetch(`${AFFILIATE_URL}/admin/affiliate/payouts/${req.params.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.use(proxy(AFFILIATE_URL, ['/api/admin/affiliate', '/api/admin/affiliates'], { '^/api/admin': '/admin' }));

// Crash game — public routes (history, state, verify)
app.use(proxy(CRASH_URL, '/api/crash', { '^/api/crash': '/crash' }));

// Baccarat game
app.use(proxy(BACCARAT_URL, '/api/baccarat', { '^/api/baccarat': '/baccarat' }));

// Plinko game
app.use(proxy(PLINKO_URL, '/api/plinko', { '^/api/plinko': '/plinko' }));

// Mines game
app.use(proxy(MINES_URL, '/api/mines', { '^/api/mines': '/mines' }));

// Combined admin stats
app.get('/api/admin/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    const headers = { Authorization: req.headers.authorization || '', 'Content-Type': 'application/json' };
    const [usersRes, walletRes] = await Promise.allSettled([
      fetch(`${USER_URL}/admin/stats`, { headers }),
      fetch(`${WALLET_URL}/admin/stats`, { headers }),
    ]);
    const users: Record<string, unknown> = usersRes.status === 'fulfilled' && usersRes.value.ok ? await usersRes.value.json() as Record<string, unknown> : {};
    const wallet: Record<string, unknown> = walletRes.status === 'fulfilled' && walletRes.value.ok ? await walletRes.value.json() as Record<string, unknown> : {};
    res.json({ ...users, ...wallet });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


app.listen(PORT, () => console.log(`api-gateway running on port ${PORT}`));
export default app;
