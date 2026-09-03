import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kyc-service', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ service: 'kyc-service', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`kyc-service running on port ${PORT}`);
});

export default app;
