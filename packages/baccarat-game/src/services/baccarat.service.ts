import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import {
  generateServerSeed, hashServerSeed, generateClientSeed,
  generateShoe, handScore, cardValue
} from '../utils/provablyFair';

const HOUSE_EDGE_BANKER = 0.05;

interface BetInput {
  betPlayer: number;
  betBanker: number;
  betTie: number;
  clientSeed?: string;
}

export class BaccaratService {
  private async migrate() {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS baccarat_rounds (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id         UUID NOT NULL,
        server_seed     TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        client_seed     TEXT NOT NULL,
        nonce           INT NOT NULL DEFAULT 0,
        bet_player      NUMERIC(20,8) DEFAULT 0,
        bet_banker      NUMERIC(20,8) DEFAULT 0,
        bet_tie         NUMERIC(20,8) DEFAULT 0,
        total_bet       NUMERIC(20,8) NOT NULL,
        player_cards    JSONB NOT NULL DEFAULT '[]',
        banker_cards    JSONB NOT NULL DEFAULT '[]',
        player_score    INT NOT NULL DEFAULT 0,
        banker_score    INT NOT NULL DEFAULT 0,
        winner          TEXT CHECK (winner IN ('player','banker','tie')),
        payout          NUMERIC(20,8) DEFAULT 0,
        profit          NUMERIC(20,8) DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_baccarat_user ON baccarat_rounds(user_id)`);
    console.log('Baccarat DB ready');
  }

  async init() {
    await this.migrate();
  }

  async play(userId: string, input: BetInput) {
    const { betPlayer, betBanker, betTie } = input;
    const totalBet = betPlayer + betBanker + betTie;

    if (totalBet <= 0) throw new Error('No bet placed');
    if (totalBet > 10000) throw new Error('Max bet is $10,000');
    if (betPlayer < 0 || betBanker < 0 || betTie < 0) throw new Error('Invalid bet');

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = input.clientSeed || generateClientSeed();
    const nonce = Math.floor(Math.random() * 1000000);
    const shoe = generateShoe(serverSeed, clientSeed, nonce);

    const playerCards = [shoe[0], shoe[2]];
    const bankerCards = [shoe[1], shoe[3]];
    let shoeIndex = 4;

    let playerScore = handScore(playerCards);
    let bankerScore = handScore(bankerCards);

    const isNatural = playerScore >= 8 || bankerScore >= 8;

    if (!isNatural) {
      let playerThirdCard: number | null = null;
      if (playerScore <= 5) {
        playerThirdCard = shoe[shoeIndex++];
        playerCards.push(playerThirdCard);
        playerScore = handScore(playerCards);
      }

      if (this.shouldBankerDraw(bankerScore, playerThirdCard)) {
        bankerCards.push(shoe[shoeIndex++]);
        bankerScore = handScore(bankerCards);
      }
    }

    let winner: 'player' | 'banker' | 'tie';
    if (playerScore > bankerScore) winner = 'player';
    else if (bankerScore > playerScore) winner = 'banker';
    else winner = 'tie';

    let payout = 0;
    if (winner === 'player') {
      if (betPlayer > 0) payout += betPlayer * 2;
      // Banker bet lost on player win
    } else if (winner === 'banker') {
      if (betBanker > 0) payout += betBanker * 2 * (1 - HOUSE_EDGE_BANKER);
      // Player bet lost on banker win
    } else {
      // Tie: player/banker bets always pushed (returned), tie bet pays 8:1
      payout += betPlayer + betBanker;
      if (betTie > 0) payout += betTie * 9;
    }

    payout = Math.floor(payout * 100) / 100;
    const profit = Math.floor((payout - totalBet) * 100) / 100;

    const { rows } = await pool.query(
      `INSERT INTO baccarat_rounds (
        id, user_id, server_seed, server_seed_hash, client_seed, nonce,
        bet_player, bet_banker, bet_tie, total_bet,
        player_cards, banker_cards, player_score, banker_score,
        winner, payout, profit
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id`,
      [
        uuidv4(), userId, serverSeed, serverSeedHash, clientSeed, nonce,
        betPlayer, betBanker, betTie, totalBet,
        JSON.stringify(playerCards), JSON.stringify(bankerCards),
        playerScore, bankerScore, winner, payout, profit
      ]
    );

    return {
      roundId: rows[0].id,
      playerCards,
      bankerCards,
      playerScore,
      bankerScore,
      winner,
      payout,
      profit,
      isNatural,
      provablyFair: { serverSeed, serverSeedHash, clientSeed, nonce }
    };
  }

  private shouldBankerDraw(bankerScore: number, playerThirdCard: number | null): boolean {
    if (bankerScore >= 7) return false;
    if (bankerScore <= 2) return true;
    if (playerThirdCard === null) return bankerScore <= 5;

    const ptc = cardValue(playerThirdCard);
    if (bankerScore === 3) return ptc !== 8;
    if (bankerScore === 4) return ptc >= 2 && ptc <= 7;
    if (bankerScore === 5) return ptc >= 4 && ptc <= 7;
    if (bankerScore === 6) return ptc === 6 || ptc === 7;
    return false;
  }

  async getHistory(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const { rows } = await pool.query(
      `SELECT id, bet_player, bet_banker, bet_tie, total_bet,
              player_cards, banker_cards, player_score, banker_score,
              winner, payout, profit, created_at
       FROM baccarat_rounds WHERE user_id=$1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) FROM baccarat_rounds WHERE user_id=$1', [userId]
    );
    return { items: rows, total: parseInt(countRows[0].count), page, pageSize };
  }

  async getStats(userId: string) {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) as total_rounds,
        COALESCE(SUM(total_bet),0) as total_wagered,
        COALESCE(SUM(profit),0) as total_profit,
        SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN profit < 0 THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN winner='tie' THEN 1 ELSE 0 END) as ties,
        COALESCE(MAX(profit),0) as biggest_win
       FROM baccarat_rounds WHERE user_id=$1`,
      [userId]
    );
    return rows[0];
  }

  async verify(roundId: string) {
    const { rows } = await pool.query('SELECT * FROM baccarat_rounds WHERE id=$1', [roundId]);
    if (!rows[0]) throw new Error('Round not found');
    const r = rows[0];
    const shoe = generateShoe(r.server_seed, r.client_seed, r.nonce);
    return {
      serverSeed: r.server_seed,
      serverSeedHash: r.server_seed_hash,
      clientSeed: r.client_seed,
      nonce: r.nonce,
      shoe: shoe.slice(0, 8),
      playerCards: r.player_cards,
      bankerCards: r.banker_cards,
      winner: r.winner,
      verified: true
    };
  }
}

export const baccaratService = new BaccaratService();
