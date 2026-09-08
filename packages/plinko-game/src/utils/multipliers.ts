export const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [13, 3.1, 1.2, 0.65, 0.47, 0.65, 1.2, 3.1, 13],
    12: [66, 12, 3.8, 1.9, 1.05, 0.53, 0.38, 0.53, 1.05, 1.9, 3.8, 12, 66],
    16: [264, 48, 17, 7.2, 3.4, 1.45, 0.72, 0.43, 0.24, 0.43, 0.72, 1.45, 3.4, 7.2, 17, 48, 264],
  },
  medium: {
    8:  [46, 4.6, 0.92, 0.21, 0.11, 0.21, 0.92, 4.6, 46],
    12: [115, 23, 8, 2.3, 0.69, 0.21, 0.11, 0.21, 0.69, 2.3, 8, 23, 115],
    16: [710, 118, 28, 9.5, 3.8, 1.4, 0.59, 0.19, 0.07, 0.19, 0.59, 1.4, 3.8, 9.5, 28, 118, 710],
  },
  high: {
    8:  [97, 1.9, 0.36, 0.02, 0.02, 0.02, 0.36, 1.9, 97],
    12: [389, 39, 7.8, 1.75, 0.34, 0.06, 0.04, 0.06, 0.34, 1.75, 7.8, 39, 389],
    16: [3029, 227, 45, 10.6, 3.0, 1.06, 0.3, 0.08, 0.05, 0.08, 0.3, 1.06, 3.0, 10.6, 45, 227, 3029],
  },
};

export function getMultiplier(risk: string, rows: number, bucket: number): number {
  return MULTIPLIERS[risk][rows][bucket];
}

export function bucketColor(multiplier: number): string {
  if (multiplier >= 10) return '#ff3333';
  if (multiplier >= 3)  return '#ff8c00';
  if (multiplier >= 1)  return '#e4a832';
  return '#1a6b3c';
}

function binomial(n: number, k: number): number {
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

export function verifyEV(risk: string, rows: number): number {
  const mults = MULTIPLIERS[risk][rows];
  const total = Math.pow(2, rows);
  let ev = 0;
  for (let i = 0; i <= rows; i++) {
    const prob = binomial(rows, i) / total;
    ev += prob * mults[i];
  }
  return ev;
}
