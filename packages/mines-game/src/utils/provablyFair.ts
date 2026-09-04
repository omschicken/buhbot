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

export function generateMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  minesCount: number
): number[] {
  const positions = Array.from({ length: 25 }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${i}`);
    const hash = hmac.digest('hex');
    const rand = parseInt(hash.slice(0, 8), 16);
    const j = rand % (i + 1);
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions.slice(0, minesCount);
}

export function calculateMultiplier(totalCells: number, minesCount: number, openedCount: number): number {
  if (openedCount === 0) return 1.0;
  let multiplier = 1.0;
  for (let i = 0; i < openedCount; i++) {
    const safeCells = totalCells - minesCount - i;
    const remainingCells = totalCells - i;
    multiplier *= remainingCells / safeCells;
  }
  return Math.floor(multiplier * 0.99 * 100) / 100;
}

export function nextMultiplier(totalCells: number, minesCount: number, openedCount: number): number {
  return calculateMultiplier(totalCells, minesCount, openedCount + 1);
}
