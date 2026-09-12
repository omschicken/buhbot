import dayjs from 'dayjs'
import { subRepo, paymentRepo, db } from '../db/database'
import { addUser } from '../xray/panel'
import { bot } from '../bot'
import { sendConfig } from '../commands/config'

export async function activateSubscription(paymentId: number) {
  const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(paymentId) as any
  if (!payment || payment.status !== 'paid') return

  const sub = db.prepare('SELECT * FROM subscriptions WHERE id=?').get(payment.subscription_id) as any
  if (!sub || sub.status === 'active') return

  const months = sub.plan === '1m' ? 1 : sub.plan === '3m' ? 3 : 6
  const expiresAt = dayjs().add(months, 'month')

  await addUser(
    sub.xray_email,
    sub.xray_uuid,
    0,
    expiresAt.valueOf()
  )

  subRepo.activate(sub.id, sub.plan)

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(sub.user_id) as any
  if (user) {
    await bot.api.sendMessage(
      user.tg_id,
      `✅ Оплата прошла! Подписка активна до ${expiresAt.format('DD.MM.YYYY')}.\n\nОтправляю конфиг...`
    )
    await sendConfig(bot, user.tg_id, sub)
  }
}
