import cron from 'node-cron';
import axios from 'axios';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import { COINS, CoinSymbol } from './hdwallet.service';
import { notifyDeposit } from './telegram.service';

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || '';
const PRICE_CACHE: Record<string, { price: number; ts: number }> = {};

async function getCoinPriceUSD(coin: string): Promise<number> {
  const map: Record<string, string> = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', LTC: 'litecoin', SOL: 'solana' };
  const id = map[coin] || coin.toLowerCase();
  const cached = PRICE_CACHE[id];
  if (cached && Date.now() - cached.ts < 60_000) return cached.price;
  try {
    const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, { timeout: 5000 });
    const price = r.data?.[id]?.usd || 0;
    PRICE_CACHE[id] = { price, ts: Date.now() };
    return price;
  } catch { return cached?.price || 0; }
}

async function fetchBTCTransactions(address: string): Promise<{ txid: string; amount: number; confirmations: number }[]> {
  try {
    const r = await axios.get(`https://blockstream.info/api/address/${address}/txs`, { timeout: 8000 });
    const tipR = await axios.get('https://blockstream.info/api/blocks/tip/height', { timeout: 5000 });
    const tip = Number(tipR.data);
    return r.data.map((tx: any) => {
      const vout = tx.vout.filter((o: any) => o.scriptpubkey_address === address);
      const amount = vout.reduce((s: number, o: any) => s + o.value, 0) / 1e8;
      const confirmations = tx.status.confirmed ? tip - tx.status.block_height + 1 : 0;
      return { txid: tx.txid, amount, confirmations };
    }).filter((t: any) => t.amount > 0);
  } catch { return []; }
}

async function fetchLTCTransactions(address: string): Promise<{ txid: string; amount: number; confirmations: number }[]> {
  try {
    const r = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=10`, { timeout: 8000 });
    return (r.data.txs || []).map((tx: any) => {
      const out = (tx.outputs || []).filter((o: any) => o.addresses?.includes(address));
      const amount = out.reduce((s: number, o: any) => s + (o.value || 0), 0) / 1e8;
      return { txid: tx.hash, amount, confirmations: tx.confirmations || 0 };
    }).filter((t: any) => t.amount > 0);
  } catch { return []; }
}

async function fetchETHTransactions(address: string): Promise<{ txid: string; amount: number; confirmations: number }[]> {
  try {
    const r = await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&apikey=${ETHERSCAN_KEY}`,
      { timeout: 8000 }
    );
    const tipR = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_KEY}`, { timeout: 5000 });
    const tip = parseInt(tipR.data?.result || '0', 16);
    return (r.data?.result || []).filter((tx: any) => tx.to?.toLowerCase() === address.toLowerCase()).map((tx: any) => ({
      txid: tx.hash,
      amount: Number(ethers.formatEther(tx.value)),
      confirmations: tx.blockNumber ? tip - Number(tx.blockNumber) + 1 : 0,
    })).filter((t: any) => t.amount > 0);
  } catch { return []; }
}

async function fetchERC20Transactions(address: string, contractAddress: string): Promise<{ txid: string; amount: number; confirmations: number }[]> {
  try {
    const r = await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${contractAddress}&address=${address}&sort=desc&apikey=${ETHERSCAN_KEY}`,
      { timeout: 8000 }
    );
    const tipR = await axios.get(`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_KEY}`, { timeout: 5000 });
    const tip = parseInt(tipR.data?.result || '0', 16);
    return (r.data?.result || []).filter((tx: any) => tx.to?.toLowerCase() === address.toLowerCase()).map((tx: any) => ({
      txid: tx.hash,
      amount: Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal)),
      confirmations: tx.blockNumber ? tip - Number(tx.blockNumber) + 1 : 0,
    })).filter((t: any) => t.amount > 0);
  } catch { return []; }
}

async function fetchSOLTransactions(address: string): Promise<{ txid: string; amount: number; confirmations: number }[]> {
  try {
    const r = await axios.post('https://api.mainnet-beta.solana.com', {
      jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress',
      params: [address, { limit: 10 }]
    }, { timeout: 8000 });
    const sigs = r.data?.result || [];
    const results = [];
    for (const sig of sigs.slice(0, 5)) {
      const txR = await axios.post('https://api.mainnet-beta.solana.com', {
        jsonrpc: '2.0', id: 1, method: 'getTransaction',
        params: [sig.signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]
      }, { timeout: 8000 });
      const tx = txR.data?.result;
      if (!tx) continue;
      const accounts = tx.transaction?.message?.accountKeys || [];
      const idx = accounts.indexOf(address);
      if (idx < 0) continue;
      const pre = tx.meta?.preBalances?.[idx] || 0;
      const post = tx.meta?.postBalances?.[idx] || 0;
      const amount = (post - pre) / 1e9;
      if (amount > 0) results.push({ txid: sig.signature, amount, confirmations: sig.confirmationStatus === 'finalized' ? 1 : 0 });
    }
    return results;
  } catch { return []; }
}

async function creditDeposit(pool: Pool, userId: string, coin: CoinSymbol, txid: string, amount: number, amountUSD: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO crypto_deposits (user_id, coin, tx_hash, amount, amount_usd, status)
       VALUES ($1,$2,$3,$4,$5,'confirmed')
       ON CONFLICT (tx_hash, coin) DO NOTHING`,
      [userId, coin, txid, amount, amountUSD]
    );
    const inserted = await client.query('SELECT id FROM crypto_deposits WHERE tx_hash=$1 AND coin=$2 AND credited=false', [txid, coin]);
    if (!inserted.rows[0]) { await client.query('ROLLBACK'); return; }
    await client.query('UPDATE crypto_deposits SET credited=true WHERE tx_hash=$1 AND coin=$2', [txid, coin]);
    await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
    await client.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [amountUSD, userId]);
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, status, description, reference_id)
       VALUES ($1,$2,'deposit','completed',$3,$4)`,
      [userId, amountUSD, `${coin} deposit (${amount} ${coin})`, txid]
    );
    await client.query('COMMIT');
    notifyDeposit({ username: userId, amountUSD, amountCrypto: amount, coin, txHash: txid }).catch(console.error);
    console.log(`Credited ${amountUSD} USD (${amount} ${coin}) to user ${userId}`);
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

export function startBlockchainMonitor(pool: Pool) {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const addresses = await pool.query('SELECT user_id, coin, address FROM player_addresses');
      for (const row of addresses.rows) {
        const { user_id, coin, address } = row;
        const conf = COINS[coin as CoinSymbol];
        if (!conf) continue;
        let txs: { txid: string; amount: number; confirmations: number }[] = [];

        if (coin === 'BTC') txs = await fetchBTCTransactions(address);
        else if (coin === 'LTC') txs = await fetchLTCTransactions(address);
        else if (coin === 'ETH') txs = await fetchETHTransactions(address);
        else if (coin === 'USDT' || coin === 'USDC') {
          const c = COINS[coin as 'USDT' | 'USDC'] as any;
          txs = await fetchERC20Transactions(address, c.contractAddress);
        }
        else if (coin === 'SOL') txs = await fetchSOLTransactions(address);

        for (const tx of txs) {
          if (tx.confirmations < conf.confirmations) continue;
          const already = await pool.query('SELECT credited FROM crypto_deposits WHERE tx_hash=$1 AND coin=$2', [tx.txid, coin]);
          if (already.rows[0]?.credited) continue;
          const price = await getCoinPriceUSD(coin);
          const amountUSD = tx.amount * price;
          await creditDeposit(pool, user_id, coin as CoinSymbol, tx.txid, tx.amount, amountUSD);
        }
      }
    } catch (e) { console.error('Monitor error:', e); }
  });
  console.log('Blockchain monitor started (every 30s)');
}
