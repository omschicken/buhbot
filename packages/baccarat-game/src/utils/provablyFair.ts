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

export function generateShoe(serverSeed: string, clientSeed: string, nonce: number): number[] {
  const shoe: number[] = [];
  for (let i = 0; i < 416; i++) {
    shoe.push(i % 13);
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${i}`);
    const hash = hmac.digest('hex');
    const rand = parseInt(hash.slice(0, 8), 16);
    const j = rand % (i + 1);
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

export function cardValue(card: number): number {
  if (card === 0) return 1;   // Ace
  if (card >= 9) return 0;    // 10, J, Q, K
  return card + 1;            // 2-9
}

export function handScore(cards: number[]): number {
  const total = cards.reduce((sum, card) => sum + cardValue(card), 0);
  return total % 10;
}

export function cardName(card: number): string {
  const names = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return names[card];
}
