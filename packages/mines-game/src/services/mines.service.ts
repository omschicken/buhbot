import { pool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import { generateServerSeed, hashServerSeed, generateClientSeed, generateMinePositions, calculateMultiplier, nextMultiplier } from '../utils/provablyFair';

export class MinesService {
  async init() {
    try { await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`) } catch {}
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mines_rounds (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL,
        server_seed      TEXT NOT NULL,
        server_seed_hash TEXT NOT NULL,
        client_seed      TEXT NOT NULL,
        nonce            INT NOT NULL,
        bet_amount       NUMERIC(20,8) NOT NULL,
        mines_count      INT NOT NULL CHECK (mines_count BETWEEN 1 AND 24),
        mine_positions   JSONB NOT NULL,
        opened_cells     JSONB DEFAULT '[]',
        status           TEXT DEFAULT 'active' CHECK (status IN ('active','cashed_out','exploded')),
        current_multiplier NUMERIC(10,4) DEFAULT 1.0,
        payout           NUMERIC(20,8) DEFAULT 0,
        profit           NUMERIC(20,8) DEFAULT 0,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        ended_at         TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mines_user ON mines_rounds(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mines_active ON mines_rounds(user_id, status) WHERE status = 'active'`);
  }

  async startRound(userId: string, input: { betAmount: number; minesCount: number; clientSeed?: string }) {
    const { betAmount, minesCount } = input;
    if (betAmount <= 0) throw new Error('Invalid bet');
    if (betAmount > 10000) throw new Error('Max bet $10,000');
    if (minesCount < 1 || minesCount > 24) throw new Error('Mines must be 1-24');

    const active = await pool.query("SELECT id FROM mines_rounds WHERE user_id=$1 AND status='active'", [userId]);
    if (active.rows[0]) throw new Error('Finish current round first');

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = input.clientSeed || generateClientSeed();
    const nonce = Math.floor(Math.random() * 1000000);
    const minePositions = generateMinePositions(serverSeed, clientSeed, nonce, minesCount);

    const { rows } = await pool.query(
      `INSERT INTO mines_rounds (id,user_id,server_seed,server_seed_hash,client_seed,nonce,bet_amount,mines_count,mine_positions,opened_cells,status,current_multiplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'[]','active',1.0)
       RETURNING id, server_seed_hash, client_seed, bet_amount, mines_count`,
      [uuidv4(), userId, serverSeed, serverSeedHash, clientSeed, nonce, betAmount, minesCount, JSON.stringify(minePositions)]
    );

    const round = rows[0];
    return {
      roundId: round.id,
      serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed,
      betAmount: parseFloat(round.bet_amount),
      minesCount: round.mines_count,
      currentMultiplier: 1.0,
      nextMultiplierValue: nextMultiplier(25, minesCount, 0),
      openedCells: [],
    };
  }

  async openCell(userId: string, roundId: string, cellIndex: number) {
    if (cellIndex < 0 || cellIndex > 24) throw new Error('Invalid cell');
    const { rows } = await pool.query("SELECT * FROM mines_rounds WHERE id=$1 AND user_id=$2 AND status='active'", [roundId, userId]);
    if (!rows[0]) throw new Error('Active round not found');
    const round = rows[0];

    const openedCells: number[] = round.opened_cells;
    const minePositions: number[] = round.mine_positions;
    if (openedCells.includes(cellIndex)) throw new Error('Cell already opened');

    const isMine = minePositions.includes(cellIndex);
    if (isMine) {
      await pool.query(
        `UPDATE mines_rounds SET status='exploded', opened_cells=$1, payout=0, profit=-bet_amount, ended_at=NOW() WHERE id=$2`,
        [JSON.stringify([...openedCells, cellIndex]), roundId]
      );
      return { isMine: true, cellIndex, minePositions, serverSeed: round.server_seed, payout: 0, profit: -parseFloat(round.bet_amount), openedCells: [...openedCells, cellIndex] };
    }

    const newOpenedCells = [...openedCells, cellIndex];
    const newMultiplier = calculateMultiplier(25, round.mines_count, newOpenedCells.length);
    const maxSafeCells = 25 - round.mines_count;
    const allOpened = newOpenedCells.length >= maxSafeCells;

    if (allOpened) {
      const payout = parseFloat(round.bet_amount) * newMultiplier;
      await pool.query(
        `UPDATE mines_rounds SET status='cashed_out', opened_cells=$1, current_multiplier=$2, payout=$3, profit=$4, ended_at=NOW() WHERE id=$5`,
        [JSON.stringify(newOpenedCells), newMultiplier, payout, payout - parseFloat(round.bet_amount), roundId]
      );
      return { isMine: false, cellIndex, openedCells: newOpenedCells, currentMultiplier: newMultiplier, allOpened: true, payout, profit: payout - parseFloat(round.bet_amount), minePositions, serverSeed: round.server_seed };
    }

    await pool.query(`UPDATE mines_rounds SET opened_cells=$1, current_multiplier=$2 WHERE id=$3`, [JSON.stringify(newOpenedCells), newMultiplier, roundId]);
    return { isMine: false, cellIndex, openedCells: newOpenedCells, currentMultiplier: newMultiplier, nextMultiplierValue: nextMultiplier(25, round.mines_count, newOpenedCells.length), potentialPayout: parseFloat(round.bet_amount) * newMultiplier, allOpened: false };
  }

  async cashOut(userId: string, roundId: string) {
    const { rows } = await pool.query("SELECT * FROM mines_rounds WHERE id=$1 AND user_id=$2 AND status='active'", [roundId, userId]);
    if (!rows[0]) throw new Error('Active round not found');
    const round = rows[0];
    const openedCells: number[] = round.opened_cells;
    if (openedCells.length === 0) throw new Error('Open at least one cell first');

    const multiplier = calculateMultiplier(25, round.mines_count, openedCells.length);
    const payout = parseFloat(round.bet_amount) * multiplier;
    const profit = payout - parseFloat(round.bet_amount);

    await pool.query(
      `UPDATE mines_rounds SET status='cashed_out', current_multiplier=$1, payout=$2, profit=$3, ended_at=NOW() WHERE id=$4`,
      [multiplier, payout, profit, roundId]
    );
    return { payout, profit, multiplier, minePositions: round.mine_positions, serverSeed: round.server_seed, openedCells };
  }

  async getActiveRound(userId: string) {
    const { rows } = await pool.query(
      `SELECT id, server_seed_hash, client_seed, bet_amount, mines_count, opened_cells, current_multiplier FROM mines_rounds WHERE user_id=$1 AND status='active'`,
      [userId]
    );
    if (!rows[0]) return null;
    const round = rows[0];
    return {
      roundId: round.id, serverSeedHash: round.server_seed_hash, clientSeed: round.client_seed,
      betAmount: parseFloat(round.bet_amount), minesCount: round.mines_count,
      openedCells: round.opened_cells, currentMultiplier: parseFloat(round.current_multiplier),
      nextMultiplierValue: nextMultiplier(25, round.mines_count, round.opened_cells.length),
      potentialPayout: parseFloat(round.bet_amount) * parseFloat(round.current_multiplier),
    };
  }

  async getHistory(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const { rows } = await pool.query(
      `SELECT id, bet_amount, mines_count, opened_cells, status, current_multiplier, payout, profit, created_at FROM mines_rounds WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );
    return { items: rows, page, pageSize };
  }

  async verify(roundId: string) {
    const { rows } = await pool.query('SELECT * FROM mines_rounds WHERE id=$1', [roundId]);
    if (!rows[0]) throw new Error('Round not found');
    const round = rows[0];
    if (round.status === 'active') throw new Error('Round still active');
    const minePositions = generateMinePositions(round.server_seed, round.client_seed, round.nonce, round.mines_count);
    return {
      serverSeed: round.server_seed, serverSeedHash: round.server_seed_hash,
      clientSeed: round.client_seed, nonce: round.nonce, minesCount: round.mines_count,
      minePositions, verified: JSON.stringify(minePositions.sort()) === JSON.stringify([...round.mine_positions].sort()),
    };
  }
}

export const minesService = new MinesService();
