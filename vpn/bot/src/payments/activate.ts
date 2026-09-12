import dayjs from 'dayjs'
import { subRepo, paymentRepo, userRepo, db } from '../db/database'
import { addUser } from '../xray/panel'
import { bot } from '../bot-instance'
import { sendConfig } from '../commands/config'

export async function activateSubscription(paymentId: number) {
  const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as any
  if (!payment || payment.status !== 'paid') return

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(payment.subscription_id) as any
  if (!sub || sub.status === 'active') return

  const months = sub.plan === '1m' ? 1 : sub.plan === '3m' ? 3 : 6
  const expiresAt = dayjs().add(months, 'month')

  await addUser(sub.xray_email, sub.xray_uuid, 0, expiresAt.valueOf())
  subRepo.activate(sub.id, sub.plan)

  const user = userRepo.findById(sub.user_id)
  if (!user) return

  await bot.api.sendMessage(
    user.tg_id,
    `✅ <b>Оплата прошла!</b>\n\n` +
    `Подписка активна до <b>${expiresAt.format('DD.MM.YYYY')}</b>.\n` +
    `Отправляю конфиг...`,
    { parse_mode: 'HTML' }
  )

  const freshSub = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(sub.id) as any
  await sendConfig(bot, user.tg_id, freshSub)

  // Referral bonus: if this is the user's first paid subscription and they have a referrer
  const isFirst = !subRepo.hasAnyPaid(user.id) || (() => {
    // count paid subscriptions EXCLUDING the current one
    const r = db.prepare(`
      SELECT COUNT(*) as n FROM subscriptions s
      JOIN payments p ON p.subscription_id = s.id
      WHERE s.user_id=? AND p.status='paid' AND p.id != ?
    `).get(user.id, paymentId) as any
    return r.n === 0
  })()

  if (isFirst && user.referrer_id && !user.ref_bonus_given) {
    const referrer = userRepo.findById(user.referrer_id)
    if (referrer) {
      const extended = subRepo.extendActive(referrer.id, 7)
      db.prepare('UPDATE users SET ref_bonus_given=1 WHERE id=?').run(user.id)
      if (extended) {
        await bot.api.sendMessage(
          referrer.tg_id,
          `🎁 <b>Реферальный бонус!</b>\n\n` +
          `Твой друг оплатил подписку — ты получил <b>+7 дней</b> к своей подписке!`,
          { parse_mode: 'HTML' }
        ).catch(() => {})
      }
    }
  }
}
