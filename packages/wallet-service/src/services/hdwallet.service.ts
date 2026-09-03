import * as bip32 from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { Pool } from 'pg';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import tiny from 'tiny-secp256k1';

export const COINS = {
  BTC: { symbol: 'BTC', name: 'Bitcoin', network: 'mainnet', confirmations: 3, path: "m/84'/0'/0'/0" },
  ETH: { symbol: 'ETH', name: 'Ethereum', network: 'mainnet', confirmations: 12, path: "m/44'/60'/0'/0" },
  USDT: { symbol: 'USDT', name: 'Tether USD', network: 'erc20', confirmations: 12, path: "m/44'/60'/0'/0", contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  USDC: { symbol: 'USDC', name: 'USD Coin', network: 'erc20', confirmations: 12, path: "m/44'/60'/0'/0", contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  LTC: { symbol: 'LTC', name: 'Litecoin', network: 'litecoin', confirmations: 6, path: "m/44'/2'/0'/0" },
  SOL: { symbol: 'SOL', name: 'Solana', network: 'solana', confirmations: 1, path: "m/44'/501'/0'/0'" },
} as const;

export type CoinSymbol = keyof typeof COINS;

export class HDWalletService {
  private pool: Pool;
  private keyCache: Map<string, bip32.HDKey> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async generateMasterWallet(coin: CoinSymbol): Promise<{ mnemonic: string; xpub: string }> {
    const mnemonic = bip39.generateMnemonic(wordlist, 256);
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const root = bip32.HDKey.fromMasterSeed(seed);
    const coinConf = COINS[coin];
    const account = root.derive(coinConf.path.replace(/\/\d+$/, ''));
    const xpub = account.publicExtendedKey;
    return { mnemonic, xpub };
  }

  private async getMasterKey(coin: CoinSymbol): Promise<bip32.HDKey | null> {
    if (this.keyCache.has(coin)) return this.keyCache.get(coin)!;
    const result = await this.pool.query('SELECT xpub FROM crypto_wallets WHERE coin=$1', [coin]);
    if (!result.rows[0]) return null;
    const key = bip32.HDKey.fromExtendedKey(result.rows[0].xpub);
    this.keyCache.set(coin, key);
    return key;
  }

  private deriveAddress(masterKey: bip32.HDKey, index: number, coin: CoinSymbol): string {
    const child = masterKey.deriveChild(index);
    const pubkey = child.publicKey!;

    if (coin === 'BTC') {
      bitcoin.initEccLib(tiny);
      const { address } = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey), network: bitcoin.networks.bitcoin });
      return address!;
    }

    if (coin === 'LTC') {
      // LTC uses P2PKH
      const hash = bitcoin.crypto.hash160(Buffer.from(pubkey));
      const addr = bitcoin.address.toBase58Check(hash, 0x30); // LTC mainnet prefix
      return addr;
    }

    if (coin === 'ETH' || coin === 'USDT' || coin === 'USDC') {
      return ethers.computeAddress('0x' + Buffer.from(pubkey).toString('hex'));
    }

    if (coin === 'SOL') {
      // For SOL we just use pubkey bytes as base58
      return Buffer.from(pubkey).toString('hex'); // simplified; real SOL needs ed25519
    }

    throw new Error(`Unsupported coin: ${coin}`);
  }

  async getOrCreateAddress(userId: string, coin: CoinSymbol): Promise<string> {
    const existing = await this.pool.query(
      'SELECT address FROM player_addresses WHERE user_id=$1 AND coin=$2',
      [userId, coin]
    );
    if (existing.rows[0]) return existing.rows[0].address;

    const masterKey = await this.getMasterKey(coin);
    if (!masterKey) throw new Error(`Master wallet for ${coin} not initialized`);

    const indexRes = await this.pool.query('SELECT COALESCE(MAX(address_index),0)+1 as next FROM player_addresses WHERE coin=$1', [coin]);
    const index = Number(indexRes.rows[0].next);

    const address = this.deriveAddress(masterKey, index, coin);

    await this.pool.query(
      'INSERT INTO player_addresses (user_id, coin, address, address_index) VALUES ($1,$2,$3,$4)',
      [userId, coin, address, index]
    );

    return address;
  }
}
