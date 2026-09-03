import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'api-gateway', version: '1.0.0' });
});

// Proxy routes to downstream services
const services: Record<string, string> = {
  users: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:3002',
  kyc: process.env.KYC_SERVICE_URL || 'http://localhost:3003',
  providers: process.env.PROVIDER_SERVICE_URL || 'http://localhost:3004',
  bonuses: process.env.BONUS_SERVICE_URL || 'http://localhost:3005',
  affiliates: process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3006',
  'responsible-gambling': process.env.RG_SERVICE_URL || 'http://localhost:3007',
};

app.get('/services', (_req, res) => {
  res.json({ services: Object.keys(services) });
});

app.listen(PORT, () => {
  console.log(`api-gateway running on port ${PORT}`);
});

export default app;
