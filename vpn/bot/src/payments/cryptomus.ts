import axios from 'axios'
import crypto from 'crypto'

const BASE = 'https://api.cryptomus.com/v1'

function sign(body: object): string {
  const json = Buffer.from(JSON.stringify(body)).toString('base64')
  return crypto.createHash('md5').update(json + process.env.CRYPTOMUS_API_KEY).digest('hex')
}

function headers(body: object) {
  return {
    merchant: process.env.CRYPTOMUS_MERCHANT_ID!,
    sign: sign(body),
    'Content-Type': 'application/json',
  }
}

export async function createInvoice(amountRub: number, orderId: string, callbackUrl: string) {
  // Approximate RUB → USDT (1 USDT ≈ 90 RUB, caller can improve)
  const amountUsdt = (amountRub / 9000).toFixed(2)
  const body = {
    amount: amountUsdt,
    currency: 'USDT',
    order_id: orderId,
    url_callback: callbackUrl,
    is_payment_multiple: false,
    lifetime: 3600,
    to_currency: 'USDT',
  }
  const r = await axios.post(`${BASE}/payment`, body, { headers: headers(body) })
  return {
    uuid: r.data.result.uuid as string,
    url: r.data.result.url as string,
    status: r.data.result.payment_status as string,
  }
}

export function verifyWebhook(body: Record<string, unknown>): boolean {
  const { sign: receivedSign, ...rest } = body
  const expected = sign(rest)
  return receivedSign === expected
}
