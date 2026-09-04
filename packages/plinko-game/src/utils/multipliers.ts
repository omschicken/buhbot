export const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8:  [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [141, 22, 5, 2, 0.5, 0.2, 0.2, 0.5, 2, 5, 22, 141],
    16: [999, 130, 26, 9, 4, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 4, 9, 26, 130, 999],
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
