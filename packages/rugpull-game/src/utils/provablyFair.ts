import crypto from 'crypto';

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateRugPoint(serverSeed: string, clientSeed: string): number {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(clientSeed);
  const hash = hmac.digest('hex');

  // 5% instant rug
  if (parseInt(hash.slice(0, 8), 16) % 20 === 0) {
    return 1.00;
  }

  const h = parseInt(hash.slice(0, 8), 16);
  const e = Math.pow(2, 32);
  const houseEdge = 0.05;

  const result = Math.floor((100 * e - h) / (e - h) * (1 - houseEdge)) / 100;
  return Math.max(1.01, result);
}
