import { EventEmitter } from 'events';
import { pool } from '../db/pool';
import { generateCrashPoint, generateServerSeed, generateClientSeed, hashServerSeed } from '../utils/provablyFair';
import { v4 as uuidv4 } from 'uuid';

const HOUSE_EDGE = 0.01;
const BETTING_PHASE_MS = 10000;
const TICK_MS = 100;
const MAX_MULTIPLIER = 1000;

interface Bet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutAt?: number;
  profit?: number;
}

export class CrashEngine extends EventEmitter {
  private currentRoundId: string | null = null;
  private currentRoundNumber: number = 0;
  private serverSeedHash: string = '';
  private clientSeed: string = '';
  private status: 'waiting' | 'betting' | 'running' | 'crashed' = 'waiting';
  private bets: Map<string, Bet> = new Map();
  private startTime: number = 0;
  private crashPoint: number = 1;
  private currentMultiplier: number = 1;
  private tickInterval: NodeJS.Timeout | null = null;
  private bettingEndsAt: number = 0;

  async start() {
    console.log('Crash engine starting...');
    await this.migrate();
    await this.startNewRound();
  }

  private async migrate() {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crash_rounds (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        round_number    BIGSERIAL UNIQUE,
        server_seed     TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        client_seed     TEXT NOT NULL,
        crash_point     NUMERIC(10,2) NOT NULL,
        status          TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','betting','running','crashed')),
        started_at      TIMESTAMPTZ,
        crashed_at      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crash_bets (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        round_id    UUID NOT NULL REFERENCES crash_rounds(id),
        user_id     UUID NOT NULL,
        username    TEXT NOT NULL,
        bet_amount  NUMERIC(20,8) NOT NULL,
        auto_cashout NUMERIC(10,2),
        cashout_at  NUMERIC(10,2),
        profit      NUMERIC(20,8),
        status      TEXT DEFAULT 'active' CHECK (status IN ('active','cashed_out','lost')),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_crash_bets_round ON crash_bets(round_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_crash_bets_user ON crash_bets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_crash_rounds_status ON crash_rounds(status)`);
    console.log('Crash DB ready');
  }

  private async startNewRound() {
    this.status = 'waiting';
    this.bets.clear();
    this.currentMultiplier = 1.00;

    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    this.crashPoint = generateCrashPoint(serverSeed, clientSeed);
    this.clientSeed = clientSeed;
    this.serverSeedHash = serverSeedHash;

    const { rows } = await pool.query(
      `INSERT INTO crash_rounds (id, server_seed, server_seed_hash, client_seed, crash_point, status)
       VALUES ($1,$2,$3,$4,$5,'betting') RETURNING id, round_number`,
      [uuidv4(), serverSeed, serverSeedHash, clientSeed, this.crashPoint]
    );
    this.currentRoundId = rows[0].id;
    this.currentRoundNumber = Number(rows[0].round_number);

    this.bettingEndsAt = Date.now() + BETTING_PHASE_MS;
    this.status = 'betting';

    this.emit('round_start', {
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
      serverSeedHash,
      clientSeed,
      bettingEndsIn: BETTING_PHASE_MS,
      bettingEndsAt: this.bettingEndsAt,
    });

    setTimeout(() => this.runRound(), BETTING_PHASE_MS);
  }

  private async runRound() {
    if (!this.currentRoundId) return;

    this.status = 'running';
    this.startTime = Date.now();
    this.currentMultiplier = 1.00;

    await pool.query(
      "UPDATE crash_rounds SET status='running', started_at=NOW() WHERE id=$1",
      [this.currentRoundId]
    );

    this.emit('round_running', { roundId: this.currentRoundId, startTime: this.startTime });
    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private async tick() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.currentMultiplier = Math.floor(Math.pow(Math.E, 0.06 * elapsed) * 100) / 100;

    // Auto cashouts
    for (const [userId, bet] of this.bets) {
      if (!bet.cashedOut && bet.autoCashout && this.currentMultiplier >= bet.autoCashout) {
        await this.processCashout(userId, bet.autoCashout).catch(console.error);
      }
    }

    this.emit('tick', { multiplier: this.currentMultiplier, elapsed: Math.floor(elapsed * 1000) });

    if (this.currentMultiplier >= this.crashPoint || this.currentMultiplier >= MAX_MULTIPLIER) {
      await this.crash();
    }
  }

  private async crash() {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    this.status = 'crashed';

    for (const [, bet] of this.bets) {
      if (!bet.cashedOut) {
        await pool.query("UPDATE crash_bets SET status='lost' WHERE id=$1", [bet.id]).catch(console.error);
      }
    }

    const { rows } = await pool.query(
      `UPDATE crash_rounds SET status='crashed', crashed_at=NOW() WHERE id=$1
       RETURNING server_seed, client_seed, crash_point`,
      [this.currentRoundId]
    );

    this.emit('crashed', {
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
      crashPoint: this.crashPoint,
      serverSeed: rows[0].server_seed,
      clientSeed: rows[0].client_seed,
      bets: Array.from(this.bets.values()).map(b => ({
        username: b.username,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutAt: b.cashoutAt,
        profit: b.profit,
      })),
    });

    setTimeout(() => this.startNewRound(), 3000);
  }

  async placeBet(userId: string, username: string, amount: number, autoCashout?: number): Promise<string> {
    if (this.status !== 'betting') throw new Error('Betting phase ended');
    if (this.bets.has(userId)) throw new Error('Already placed a bet this round');
    if (amount <= 0) throw new Error('Invalid amount');

    const betId = uuidv4();
    const bet: Bet = { id: betId, userId, username, amount, autoCashout, cashedOut: false };

    await pool.query(
      `INSERT INTO crash_bets (id, round_id, user_id, username, bet_amount, auto_cashout)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [betId, this.currentRoundId, userId, username, amount, autoCashout ?? null]
    );

    this.bets.set(userId, bet);
    this.emit('bet_placed', { userId, username, amount, autoCashout, totalBets: this.bets.size });
    return betId;
  }

  async cashout(userId: string): Promise<number> {
    if (this.status !== 'running') throw new Error('Round not running');
    return this.processCashout(userId, this.currentMultiplier);
  }

  private async processCashout(userId: string, multiplier: number): Promise<number> {
    const bet = this.bets.get(userId);
    if (!bet || bet.cashedOut) throw new Error('Cannot cashout');

    bet.cashedOut = true;
    bet.cashoutAt = multiplier;
    const profit = Math.floor(bet.amount * multiplier * (1 - HOUSE_EDGE) * 100) / 100;
    bet.profit = profit;

    await pool.query(
      "UPDATE crash_bets SET status='cashed_out', cashout_at=$1, profit=$2 WHERE id=$3",
      [multiplier, profit, bet.id]
    );

    this.emit('cashout', { userId, username: bet.username, amount: bet.amount, multiplier, profit });
    return profit;
  }

  getState() {
    return {
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
      status: this.status,
      multiplier: this.currentMultiplier,
      serverSeedHash: this.serverSeedHash,
      clientSeed: this.clientSeed,
      bettingEndsAt: this.bettingEndsAt,
      startTime: this.startTime,
      bets: Array.from(this.bets.values()).map(b => ({
        username: b.username,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutAt: b.cashoutAt,
      })),
    };
  }

  hasBet(userId: string): boolean {
    return this.bets.has(userId);
  }

  getBet(userId: string): Bet | undefined {
    return this.bets.get(userId);
  }
}

export const crashEngine = new CrashEngine();
