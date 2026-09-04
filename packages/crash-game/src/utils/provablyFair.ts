import crypto from 'crypto';

export function generateCrashPoint(serverSeed: string, clientSeed: string): number {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(clientSeed);
  const hash = hmac.digest('hex');

  const h = parseInt(hash.slice(0, 8), 16);
  const houseEdge = 0.01;
  const result = Math.floor((1 / (1 - (1 - houseEdge) * (h / Math.pow(2, 32)))) * 100) / 100;

  return Math.max(1.00, result);
}

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

export function verifyCrashPoint(serverSeed: string, clientSeed: string, claimedCrashPoint: number): boolean {
  const calculated = generateCrashPoint(serverSeed, clientSeed);
  return Math.abs(calculated - claimedCrashPoint) < 0.01;
}
