import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const BASE = 'https://api.yookassa.ru/v3'

function auth() {
  const shopId = process.env.YOKASSA_SHOP_ID!
  const secret = process.env.YOKASSA_SECRET_KEY!
  return Buffer.from(`${shopId}:${secret}`).toString('base64')
}

export async function createPayment(amount: number, description: string, returnUrl: string) {
  const r = await axios.post(
    `${BASE}/payments`,
    {
      amount: { value: (amount / 100).toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: returnUrl },
      description,
      capture: true,
    },
    {
      headers: {
        Authorization: `Basic ${auth()}`,
        'Idempotence-Key': uuidv4(),
        'Content-Type': 'application/json',
      },
    }
  )
  return {
    id: r.data.id as string,
    confirmationUrl: r.data.confirmation.confirmation_url as string,
    status: r.data.status as string,
  }
}

export async function getPaymentStatus(paymentId: string) {
  const r = await axios.get(`${BASE}/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth()}` },
  })
  return r.data.status as string
}
