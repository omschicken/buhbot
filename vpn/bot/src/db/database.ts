import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH || './data/vpn.db'

if (DB_PATH !== ':memory:') {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id           INTEGER UNIQUE NOT NULL,
    username        TEXT,
    first_name      TEXT,
    referrer_id     INTEGER REFERENCES users(id),
    ref_bonus_given INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    plan        TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    starts_at   TEXT,
    expires_at  TEXT,
    xray_uuid   TEXT,
    xray_email  TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    subscription_id INTEGER REFERENCES subscriptions(id),
    provider        TEXT NOT NULL,
    provider_id     TEXT UNIQUE,
    amount          INTEGER NOT NULL,
    status          TEXT DEFAULT 'pending',
    created_at      TEXT DEFAULT (datetime('now')),
    paid_at         TEXT
  );
`)

// Migrate existing DBs: add columns if they don't exist
try {
  db.exec(`ALTER TABLE users ADD COLUMN referrer_id INTEGER REFERENCES users(id)`)
} catch {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN ref_bonus_given INTEGER DEFAULT 0`)
} catch {}

export type UserRow = {
  id: number
  tg_id: number
  username: string | null
  first_name: string | null
  referrer_id: number | null
  ref_bonus_given: number
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
  upsert(tgId: number, username?: string, firstName?: string, referrerId?: number): UserRow {
    db.prepare(`
      INSERT INTO users (tg_id, username, first_name, referrer_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(tg_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name
    `).run(tgId, username ?? null, firstName ?? null, referrerId ?? null)
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId) as UserRow
  },

  findByTgId(tgId: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE tg_id = ?').get(tgId) as UserRow | undefined
  },

  findById(id: number): UserRow | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  },

  count(): number {
    return (db.prepare('SELECT COUNT(*) as n FROM users').get() as any).n
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

  extendActive(userId: number, days: number): boolean {
    const sub = db.prepare(`
      SELECT * FROM subscriptions WHERE user_id=? AND status='active' AND expires_at > datetime('now')
      ORDER BY expires_at DESC LIMIT 1
    `).get(userId) as SubscriptionRow | undefined
    if (!sub) return false
    db.prepare(`
      UPDATE subscriptions SET expires_at=datetime(expires_at, '+${days} days') WHERE id=?
    `).run(sub.id)
    return true
  },

  getActive(userId: number): SubscriptionRow | undefined {
    return db.prepare(`
      SELECT * FROM subscriptions
      WHERE user_id=? AND status='active' AND expires_at > datetime('now')
      ORDER BY expires_at DESC LIMIT 1
    `).get(userId) as SubscriptionRow | undefined
  },

  countActive(): number {
    return (db.prepare(`SELECT COUNT(*) as n FROM subscriptions WHERE status='active' AND expires_at > datetime('now')`).get() as any).n
  },

  expireOld(): number {
    const r = db.prepare(`
      UPDATE subscriptions SET status='expired'
      WHERE status='active' AND expires_at <= datetime('now')
    `).run()
    return r.changes
  },

  hasAnyPaid(userId: number): boolean {
    const r = db.prepare(`
      SELECT COUNT(*) as n FROM subscriptions s
      JOIN payments p ON p.subscription_id = s.id
      WHERE s.user_id=? AND p.status='paid'
    `).get(userId) as any
    return r.n > 0
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

  totalRevenue(): { total: number; last30d: number } {
    const r = db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN paid_at >= datetime('now', '-30 days') THEN amount ELSE 0 END), 0) as last30d
      FROM payments WHERE status='paid'
    `).get() as any
    return { total: r.total, last30d: r.last30d }
  },
}
