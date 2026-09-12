import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const panel = axios.create({
  baseURL: process.env.XRAY_PANEL_URL,
  timeout: 10_000,
})

let sessionCookie = ''

async function login() {
  const r = await panel.post('/login', {
    username: process.env.XRAY_PANEL_USER,
    password: process.env.XRAY_PANEL_PASS,
  })
  const setCookie = r.headers['set-cookie']
  if (setCookie) sessionCookie = setCookie[0].split(';')[0]
}

function authHeaders() {
  return { Cookie: sessionCookie }
}

export async function addUser(email: string, uuid: string, limitGB = 0, expiryMs = 0) {
  try {
    await panel.post(
      `/xui/inbound/addClient`,
      {
        id: Number(process.env.XRAY_INBOUND_ID),
        settings: JSON.stringify({
          clients: [{
            id: uuid,
            email,
            limitIp: 3,
            totalGB: limitGB,
            expiryTime: expiryMs,
            enable: true,
            tgId: '',
            subId: '',
          }],
        }),
      },
      { headers: authHeaders() }
    )
  } catch (err: any) {
    if (err.response?.status === 401) {
      await login()
      return addUser(email, uuid, limitGB, expiryMs)
    }
    throw err
  }
}

export async function removeUser(email: string) {
  try {
    const inboundId = Number(process.env.XRAY_INBOUND_ID)
    await panel.post(
      `/xui/inbound/${inboundId}/delClient/${email}`,
      {},
      { headers: authHeaders() }
    )
  } catch (err: any) {
    if (err.response?.status === 401) {
      await login()
      return removeUser(email)
    }
  }
}

export async function resetTraffic(email: string) {
  try {
    const inboundId = Number(process.env.XRAY_INBOUND_ID)
    await panel.post(
      `/xui/inbound/${inboundId}/resetClientTraffic/${email}`,
      {},
      { headers: authHeaders() }
    )
  } catch {}
}

export function generateUUID() {
  return uuidv4()
}

export async function initPanel() {
  await login()
}
