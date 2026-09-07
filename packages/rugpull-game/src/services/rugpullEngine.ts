import { EventEmitter } from 'events';
import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import {
  generateServerSeed, hashServerSeed,
  generateClientSeed, generateRugPoint
} from '../utils/provablyFair';

const HOUSE_EDGE = 0.05;
const BETTING_PHASE_MS = 30000;
const TICK_MS = 100;
const LAST_OUT_BONUS = [0.50, 0.30, 0.20];

interface Bet {
  id: string;
  userId: string;
  username: string;
  amount: number;
  autoCashout?: number;
  cashedOut: boolean;
  cashoutAt?: number;
  cashoutOrder?: number;
}

export class RugPullEngine extends EventEmitter {
  private currentRoundId: string | null = null;
  private currentRoundNumber: number = 0;
  private status: 'waiting' | 'betting' | 'running' | 'pulled' = 'waiting';
  private bets: Map<string, Bet> = new Map();
  private startTime: number = 0;
  private rugPoint: number = 1;
  private currentMultiplier: number = 1;
  private tickInterval: NodeJS.Timeout | null = null;
  private cashoutOrder: number = 0;
  private totalPool: number = 0;

  async start() {
    console.log('Rug Pull engine starting...');
    await this.initDB();
    await this.startNewRound();
  }

  private async initDB() {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rugpull_rounds (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        round_number    BIGSERIAL UNIQUE,
        server_seed     TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        client_seed     TEXT NOT NULL,
        rug_point       NUMERIC(10,2) NOT NULL,
        status          TEXT DEFAULT 'waiting'
                        CHECK (status IN ('waiting','betting','running','pulled')),
        total_pool      NUMERIC(20,8) DEFAULT 0,
        lost_pool       NUMERIC(20,8) DEFAULT 0,
        house_take      NUMERIC(20,8) DEFAULT 0,
        started_at      TIMESTAMPTZ,
        pulled_at       TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rugpull_bets (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        round_id        UUID NOT NULL REFERENCES rugpull_rounds(id),
        user_id         UUID NOT NULL,
        username        TEXT NOT NULL,
        bet_amount      NUMERIC(20,8) NOT NULL,
        auto_cashout    NUMERIC(10,2),
        cashout_at      NUMERIC(10,2),
        cashout_order   INT,
        base_payout     NUMERIC(20,8) DEFAULT 0,
        bonus_payout    NUMERIC(20,8) DEFAULT 0,
        total_payout    NUMERIC(20,8) DEFAULT 0,
        profit          NUMERIC(20,8) DEFAULT 0,
        status          TEXT DEFAULT 'active'
                        CHECK (status IN ('active','cashed_out','lost')),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rugpull_bets_round ON rugpull_bets(round_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rugpull_bets_user ON rugpull_bets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rugpull_rounds_status ON rugpull_rounds(status)`);
  }

  private async startNewRound() {
    this.status = 'waiting';
    this.bets.clear();
    this.currentMultiplier = 1.00;
    this.cashoutOrder = 0;
    this.totalPool = 0;

    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    this.rugPoint = generateRugPoint(serverSeed, clientSeed);

    const { rows } = await pool.query(
      `INSERT INTO rugpull_rounds
       (id, server_seed, server_seed_hash, client_seed, rug_point, status)
       VALUES ($1,$2,$3,$4,$5,'betting') RETURNING *`,
      [uuidv4(), serverSeed, serverSeedHash, clientSeed, this.rugPoint]
    );

    this.currentRoundId = rows[0].id;
    this.currentRoundNumber = parseInt(rows[0].round_number);

    this.emit('round_start', {
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
      serverSeedHash,
      clientSeed,
      bettingEndsIn: BETTING_PHASE_MS,
    });

    this.status = 'betting';

    const poolTimer = setInterval(() => {
      this.emit('pool_update', {
        totalPool: this.totalPool,
        playersCount: this.bets.size
      });
    }, 5000);

    setTimeout(() => {
      clearInterval(poolTimer);
      this.runRound();
    }, BETTING_PHASE_MS);
  }

  private async runRound() {
    if (!this.currentRoundId) return;

    if (this.bets.size < 2) {
      await this.cancelRound();
      return;
    }

    this.status = 'running';
    this.startTime = Date.now();
    this.currentMultiplier = 1.00;

    await pool.query(
      "UPDATE rugpull_rounds SET status='running', started_at=NOW() WHERE id=$1",
      [this.currentRoundId]
    );

    this.emit('round_running', {
      roundId: this.currentRoundId,
      totalPool: this.totalPool,
      playersCount: this.bets.size
    });

    this.tickInterval = setInterval(() => this.tick(), TICK_MS);
  }

  private async cancelRound() {
    for (const [, bet] of this.bets) {
      await this.creditWallet(bet.userId, bet.amount, `rugpull_refund_${bet.id}`);
    }

    await pool.query(
      "UPDATE rugpull_rounds SET status='pulled' WHERE id=$1",
      [this.currentRoundId]
    );

    this.emit('round_cancelled', {
      reason: 'Not enough players (minimum 2)',
      roundId: this.currentRoundId
    });

    setTimeout(() => this.startNewRound(), 5000);
  }

  private async tick() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.currentMultiplier = Math.floor(Math.pow(Math.E, 0.06 * elapsed) * 100) / 100;
    if (this.currentMultiplier < 1.00) this.currentMultiplier = 1.00;

    for (const [userId, bet] of this.bets) {
      if (!bet.cashedOut && bet.autoCashout && this.currentMultiplier >= bet.autoCashout) {
        await this.processCashout(userId, this.currentMultiplier);
      }
    }

    this.emit('tick', {
      multiplier: this.currentMultiplier,
      elapsed: Math.floor(elapsed * 1000),
      cashedOut: Array.from(this.bets.values()).filter(b => b.cashedOut).length,
      total: this.bets.size
    });

    if (this.currentMultiplier >= this.rugPoint) {
      await this.rugPull();
    }
  }

  private async rugPull() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.status = 'pulled';

    let lostPool = 0;
    const losers: string[] = [];

    for (const [, bet] of this.bets) {
      if (!bet.cashedOut) {
        lostPool += bet.amount;
        losers.push(bet.username);
        await pool.query(
          "UPDATE rugpull_bets SET status='lost' WHERE id=$1",
          [bet.id]
        );
      }
    }

    const houseTake = this.totalPool * HOUSE_EDGE;
    const bonusPool = Math.max(0, lostPool - houseTake);

    const cashedOutBets = Array.from(this.bets.values())
      .filter(b => b.cashedOut)
      .sort((a, b) => (b.cashoutOrder || 0) - (a.cashoutOrder || 0));

    const bonusPayouts: Record<string, number> = {};
    for (let i = 0; i < Math.min(3, cashedOutBets.length); i++) {
      const bonus = bonusPool * LAST_OUT_BONUS[i];
      bonusPayouts[cashedOutBets[i].userId] = bonus;

      if (bonus > 0) {
        await this.creditWallet(
          cashedOutBets[i].userId,
          bonus,
          `rugpull_bonus_${cashedOutBets[i].id}`
        );

        await pool.query(
          `UPDATE rugpull_bets
           SET bonus_payout=$1, total_payout=base_payout+$1, profit=base_payout+$1-bet_amount
           WHERE id=$2`,
          [bonus, cashedOutBets[i].id]
        );
      }
    }

    await pool.query(
      `UPDATE rugpull_rounds SET
        status='pulled', pulled_at=NOW(),
        total_pool=$1, lost_pool=$2, house_take=$3
       WHERE id=$4`,
      [this.totalPool, lostPool, houseTake, this.currentRoundId]
    );

    const { rows } = await pool.query(
      'SELECT server_seed, client_seed, rug_point FROM rugpull_rounds WHERE id=$1',
      [this.currentRoundId]
    );

    this.emit('pulled', {
      roundId: this.currentRoundId,
      rugPoint: this.rugPoint,
      serverSeed: rows[0].server_seed,
      clientSeed: rows[0].client_seed,
      totalPool: this.totalPool,
      lostPool,
      houseTake,
      bonusPayouts,
      lastThreeOut: cashedOutBets.slice(0, 3).map(b => ({
        username: b.username,
        cashoutAt: b.cashoutAt,
        bonus: bonusPayouts[b.userId] || 0
      })),
      losersCount: losers.length,
      losers
    });

    setTimeout(() => this.startNewRound(), 7000);
  }

  async placeBet(userId: string, username: string, amount: number, autoCashout?: number) {
    if (this.status !== 'betting') throw new Error('Betting phase ended');
    if (this.bets.has(userId)) throw new Error('Already placed a bet this round');
    if (amount <= 0) throw new Error('Invalid amount');

    const betId = uuidv4();
    const bet: Bet = { id: betId, userId, username, amount, autoCashout, cashedOut: false };

    await pool.query(
      `INSERT INTO rugpull_bets
       (id, round_id, user_id, username, bet_amount, auto_cashout)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [betId, this.currentRoundId, userId, username, amount, autoCashout ?? null]
    );

    this.bets.set(userId, bet);
    this.totalPool += amount;

    this.emit('bet_placed', {
      username,
      amount,
      totalPool: this.totalPool,
      playersCount: this.bets.size
    });

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
    this.cashoutOrder++;
    bet.cashoutOrder = this.cashoutOrder;

    const basePayout = bet.amount * multiplier * (1 - HOUSE_EDGE);

    await pool.query(
      `UPDATE rugpull_bets SET
        status='cashed_out', cashout_at=$1, cashout_order=$2,
        base_payout=$3, total_payout=$3, profit=$3-bet_amount
       WHERE id=$4`,
      [multiplier, this.cashoutOrder, basePayout, bet.id]
    );

    await this.creditWallet(userId, basePayout, `rugpull_cashout_${bet.id}`);

    this.emit('cashout', {
      username: bet.username,
      userId,
      amount: bet.amount,
      multiplier,
      basePayout,
      cashoutOrder: this.cashoutOrder
    });

    return basePayout;
  }

  private async creditWallet(userId: string, amount: number, key: string) {
    try {
      await fetch(`${process.env.WALLET_SERVICE_URL}/wallet/credit-internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
        },
        body: JSON.stringify({
          userId, amount, type: 'win',
          referenceId: key,
          idempotencyKey: key
        })
      });
    } catch (err) {
      console.error('creditWallet error:', err);
    }
  }

  getState() {
    return {
      roundId: this.currentRoundId,
      roundNumber: this.currentRoundNumber,
      status: this.status,
      multiplier: this.currentMultiplier,
      totalPool: this.totalPool,
      playersCount: this.bets.size,
      bets: Array.from(this.bets.values()).map(b => ({
        username: b.username,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutAt: b.cashoutAt,
        cashoutOrder: b.cashoutOrder
      }))
    };
  }
}

export const rugPullEngine = new RugPullEngine();
