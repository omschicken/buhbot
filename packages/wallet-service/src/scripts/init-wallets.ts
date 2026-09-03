import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import { HDWalletService, COINS, CoinSymbol } from '../services/hdwallet.service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false });

const reset = process.argv.includes('--reset');

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crypto_wallets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coin TEXT UNIQUE NOT NULL,
      xpub TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS player_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      coin TEXT NOT NULL,
      address TEXT NOT NULL,
      address_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, coin),
      UNIQUE(coin, address)
    );
    CREATE TABLE IF NOT EXISTS crypto_deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      coin TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      amount NUMERIC(20,8) NOT NULL,
      amount_usd NUMERIC(18,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      credited BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tx_hash, coin)
    );
  `);

  if (reset) {
    console.log('Resetting all wallets and addresses...');
    await pool.query('DELETE FROM player_addresses');
    await pool.query('DELETE FROM crypto_wallets');
  }

  const svc = new HDWalletService(pool);

  console.log('\n=== HD WALLET INITIALIZATION ===\n');
  console.log('WARNING: Save all mnemonics in a secure offline location.');
  console.log('ANYONE WITH THESE MNEMONICS CAN STEAL ALL FUNDS.\n');

  for (const coin of Object.keys(COINS) as CoinSymbol[]) {
    const existing = await pool.query('SELECT xpub FROM crypto_wallets WHERE coin=$1', [coin]);
    if (existing.rows[0]) {
      console.log(`${coin}: already initialized (xpub: ${existing.rows[0].xpub.slice(0, 20)}...)`);
      continue;
    }
    const { mnemonic, xpub } = await svc.generateMasterWallet(coin);
    await pool.query('INSERT INTO crypto_wallets (coin, xpub) VALUES ($1,$2)', [coin, xpub]);
    console.log(`\n${coin}:`);
    console.log(`  MNEMONIC (SAVE THIS!): ${mnemonic}`);
    console.log(`  xpub: ${xpub.slice(0, 30)}...`);
  }

  console.log('\n=== DONE ===');
  console.log('ВАЖНО: mnemonic нужно сохранить в БЕЗОПАСНОМ месте — это доступ ко всем средствам.\n');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
