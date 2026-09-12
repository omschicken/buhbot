import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Use in-memory SQLite for tests
beforeAll(() => {
  process.env.DATABASE_PATH = ':memory:'
  process.env.BOT_TOKEN = 'test:token'
})

describe('Database repositories', () => {
  it('userRepo.upsert creates and retrieves a user', async () => {
    const { userRepo } = await import('../db/database')

    const user = userRepo.upsert(123456, 'testuser', 'Test')
    expect(user.tg_id).toBe(123456)
    expect(user.username).toBe('testuser')
    expect(user.first_name).toBe('Test')
    expect(user.id).toBeGreaterThan(0)
  })

  it('userRepo.upsert updates existing user', async () => {
    const { userRepo } = await import('../db/database')

    userRepo.upsert(111111, 'oldname', 'Old')
    const updated = userRepo.upsert(111111, 'newname', 'New')
    expect(updated.username).toBe('newname')
    expect(updated.first_name).toBe('New')
  })

  it('userRepo.findByTgId returns undefined for missing user', async () => {
    const { userRepo } = await import('../db/database')
    expect(userRepo.findByTgId(9999999)).toBeUndefined()
  })

  it('subRepo.create and getActive lifecycle', async () => {
    const { userRepo, subRepo, paymentRepo } = await import('../db/database')

    const user = userRepo.upsert(222222, 'subtest', 'SubTest')
    const sub = subRepo.create(user.id, '1m', 'test-uuid-1', 'user_1_test')

    expect(sub.status).toBe('pending')
    expect(sub.xray_uuid).toBe('test-uuid-1')

    // Should not be active yet
    expect(subRepo.getActive(user.id)).toBeUndefined()

    // Activate it
    subRepo.activate(sub.id, '1m')
    const active = subRepo.getActive(user.id)
    expect(active).toBeDefined()
    expect(active!.status).toBe('active')
  })

  it('subRepo.extendActive adds days to expiry', async () => {
    const { userRepo, subRepo, db } = await import('../db/database')

    const user = userRepo.upsert(333333, 'exttest', 'ExtTest')
    const sub = subRepo.create(user.id, '1m', 'test-uuid-2', 'user_2_test')
    subRepo.activate(sub.id, '1m')

    const before = subRepo.getActive(user.id)!
    subRepo.extendActive(user.id, 7)
    const after = subRepo.getActive(user.id)!

    // After extending, expires_at should be 7 days later
    expect(after.expires_at! > before.expires_at!).toBe(true)
  })

  it('paymentRepo.create and markPaid', async () => {
    const { userRepo, subRepo, paymentRepo } = await import('../db/database')

    const user = userRepo.upsert(444444, 'paytest', 'PayTest')
    const sub = subRepo.create(user.id, '3m', 'test-uuid-3', 'user_3_test')
    const payment = paymentRepo.create(user.id, sub.id, 'yookassa', 79900)

    expect(payment.status).toBe('pending')
    expect(payment.amount).toBe(79900)

    paymentRepo.setProviderId(payment.id, 'yk_test_123')
    const found = paymentRepo.findByProviderId('yk_test_123')
    expect(found).toBeDefined()

    paymentRepo.markPaid(payment.id)
    const paid = paymentRepo.findByProviderId('yk_test_123')
    expect(paid!.status).toBe('paid')
    expect(paid!.paid_at).not.toBeNull()
  })

  it('subRepo.countActive returns correct count', async () => {
    const { subRepo } = await import('../db/database')
    const count = subRepo.countActive()
    // At least 1 from the tests above
    expect(count).toBeGreaterThanOrEqual(1)
  })

  it('subscription plan month calculation', async () => {
    const { userRepo, subRepo, db } = await import('../db/database')

    const user = userRepo.upsert(555555, 'plantest', 'PlanTest')

    for (const [plan, expectedMonths] of [['1m', 1], ['3m', 3], ['6m', 6]] as const) {
      const sub = subRepo.create(user.id, plan, `uuid-${plan}`, `email-${plan}`)
      subRepo.activate(sub.id, plan)
      const active = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(sub.id) as any

      expect(active.status).toBe('active')
      // expires_at should be roughly expectedMonths months from now
      const expiresDate = new Date(active.expires_at)
      const now = new Date()
      const monthDiff = (expiresDate.getFullYear() - now.getFullYear()) * 12 +
        (expiresDate.getMonth() - now.getMonth())
      expect(monthDiff).toBe(expectedMonths)
    }
  })
})
