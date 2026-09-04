import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import {
  generateServerSeed, hashServerSeed, generateClientSeed,
  generatePath, pathToBucket,
} from '../utils/provablyFair';
import { getMultiplier } from '../utils/multipliers';

export class PlinkoService {
  async init() {
    // uuid-ossp may require superuser; gen_random_uuid() is built-in (pg 13+)
    try { await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`) } catch { }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plinko_rounds (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL,
        server_seed      TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        client_seed      TEXT NOT NULL,
        nonce            INT NOT NULL,
        bet_amount       NUMERIC(20,8) NOT NULL,
        risk             TEXT NOT NULL CHECK (risk IN ('low','medium','high')),
        rows             INT NOT NULL CHECK (rows IN (8,12,16)),
        path             JSONB NOT NULL,
        bucket           INT NOT NULL,
        multiplier       NUMERIC(10,2) NOT NULL,
        payout           NUMERIC(20,8) NOT NULL,
        profit           NUMERIC(20,8) NOT NULL,
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_plinko_user ON plinko_rounds(user_id)`);
  }

  async play(userId: string, input: {
    betAmount: number;
    risk: 'low' | 'medium' | 'high';
    rows: 8 | 12 | 16;
    clientSeed?: string;
  }) {
    const { betAmount, risk, rows } = input;

    if (betAmount <= 0) throw new Error('Invalid bet amount');
    if (betAmount > 10000) throw new Error('Max bet is $10,000');

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = input.clientSeed || generateClientSeed();
    const nonce = Math.floor(Math.random() * 1000000);

    const path = generatePath(serverSeed, clientSeed, nonce, rows);
    const bucket = pathToBucket(path);
    const multiplier = getMultiplier(risk, rows, bucket);
    const payout = +(betAmount * multiplier).toFixed(8);
    const profit = +(payout - betAmount).toFixed(8);

    const { rows: dbRows } = await pool.query(
      `INSERT INTO plinko_rounds (
        id, user_id, server_seed, server_seed_hash, client_seed, nonce,
        bet_amount, risk, rows, path, bucket, multiplier, payout, profit
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        uuidv4(), userId, serverSeed, serverSeedHash, clientSeed, nonce,
        betAmount, risk, rows,
        JSON.stringify(path), bucket, multiplier, payout, profit,
      ]
    );

    return {
      roundId: dbRows[0].id as string,
      path,
      bucket,
      multiplier,
      payout,
      profit,
      provablyFair: { serverSeed, serverSeedHash, clientSeed, nonce },
    };
  }

  async getHistory(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const { rows } = await pool.query(
      `SELECT id, bet_amount, risk, rows, bucket, multiplier, payout, profit, created_at
       FROM plinko_rounds WHERE user_id=$1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    return { items: rows, page, pageSize };
  }

  async verify(roundId: string) {
    const { rows } = await pool.query('SELECT * FROM plinko_rounds WHERE id=$1', [roundId]);
    if (!rows[0]) throw new Error('Round not found');
    const round = rows[0];

    const path = generatePath(round.server_seed, round.client_seed, round.nonce, round.rows);
    const bucket = pathToBucket(path);

    return {
      serverSeed: round.server_seed,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      nonce: round.nonce,
      path,
      bucket,
      multiplier: round.multiplier,
      verified: bucket === round.bucket,
    };
  }
}

export const plinkoService = new PlinkoService();
