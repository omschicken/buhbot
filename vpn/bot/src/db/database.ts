import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || './data/vpn.db'
const dir = path.dirname(DB_PATH)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id       INTEGER UNIQUE NOT NULL,
    username    TEXT,
    first_name  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    plan        TEXT NOT NULL,          -- '1m' | '3m' | '6m'
    status      TEXT DEFAULT 'pending', -- 'active' | 'expired' | 'pending'
    starts_at   TEXT,
    expires_at  TEXT,
    xray_uuid   TEXT,                   -- UUID for VLESS config
    xray_email  TEXT,                   -- unique email on xray panel
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    provider        TEXT NOT NULL,   -- 'yookassa' | 'cryptomus'
    provider_id     TEXT UNIQUE,     -- external payment id
    amount          INTEGER NOT NULL, -- in RUB kopecks
    status          TEXT DEFAULT 'pending', -- 'pending' | 'paid' | 'failed'
    created_at      TEXT DEFAULT (datetime('now')),
    paid_at         TEXT
  );
`)

export type UserRow = {
  id: number
  tg_id: number
  username: string | null
  first_name: string | null
  created_at: string
}

export type SubscriptionRow = {
  id: number
  user_id: number
  plan: string
  status: string
  starts_at: string | null
  expires_at: string | null
  xray_uuid: string | null
  xray_email: string | null
  created_at: string
}

export type PaymentRow = {
  id: number
  user_id: number
  subscription_id: number | null
  provider: string
  provider_id: string | null
  amount: number
  status: string
  created_at: string
  paid_at: string | null
}

export const userRepo = {
  upsert(tgId: number, username?: string, firstName?: string): UserRow {
    db.prepare(`
      INSERT INTO users (tg_id, username, first_name)
      VALUES (?, ?, ?)
      ON CONFLICT(tg_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name
    `).run(tgId, username ?? null, firstName ?? null)
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId) as UserRow
  },

  findByTgId(tgId: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId) as UserRow | undefined
  },
}

export const subRepo = {
  create(userId: number, plan: string, xrayUuid: string, xrayEmail: string): SubscriptionRow {
    const r = db.prepare(`
      INSERT INTO subscriptions (user_id, plan, status, xray_uuid, xray_email)
      VALUES (?, ?, 'pending', ?, ?)
    `).run(userId, plan, xrayUuid, xrayEmail)
    return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(r.lastInsertRowid) as SubscriptionRow
  },

  activate(id: number, plan: string): void {
    const months = plan === '1m' ? 1 : plan === '3m' ? 3 : 6
    db.prepare(`
      UPDATE subscriptions
      SET status='active',
          starts_at=datetime('now'),
          expires_at=datetime('now', '+${months} months')
      WHERE id=?
    `).run(id)
  },

  getActive(userId: number): SubscriptionRow | undefined {
    return db.prepare(`
      SELECT * FROM subscriptions
      WHERE user_id=? AND status='active' AND expires_at > datetime('now')
      ORDER BY expires_at DESC LIMIT 1
    `).get(userId) as SubscriptionRow | undefined
  },

  expireOld(): number {
    const r = db.prepare(`
      UPDATE subscriptions SET status='expired'
      WHERE status='active' AND expires_at <= datetime('now')
    `).run()
    return r.changes
  },
}

export const paymentRepo = {
  create(userId: number, subId: number, provider: string, amount: number): PaymentRow {
    const r = db.prepare(`
      INSERT INTO payments (user_id, subscription_id, provider, amount)
      VALUES (?, ?, ?, ?)
    `).run(userId, subId, provider, amount)
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(r.lastInsertRowid) as PaymentRow
  },

  setProviderId(id: number, providerId: string): void {
    db.prepare('UPDATE payments SET provider_id=? WHERE id=?').run(providerId, id)
  },

  findByProviderId(providerId: string): PaymentRow | undefined {
    return db.prepare('SELECT * FROM payments WHERE provider_id=?').get(providerId) as PaymentRow | undefined
  },

  markPaid(id: number): void {
    db.prepare(`UPDATE payments SET status='paid', paid_at=datetime('now') WHERE id=?`).run(id)
  },
}
