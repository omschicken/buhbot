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

export function generatePath(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number
): number[] {
  const path: number[] = [];
  for (let row = 0; row < rows; row++) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${row}`);
    const hash = hmac.digest('hex');
    const value = parseInt(hash.slice(0, 8), 16);
    path.push(value % 2);
  }
  return path;
}

export function pathToBucket(path: number[]): number {
  return path.reduce((bucket, direction) => bucket + direction, 0);
}
