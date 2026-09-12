import { Context, InlineKeyboard } from 'grammy'
import { userRepo, subRepo, db } from '../db/database'

export async function handleRef(ctx: Context) {
  const tgId = ctx.from!.id
  const user = userRepo.findByTgId(tgId)
  if (!user) return ctx.reply('Сначала /start')

  const refCount = (db.prepare(
    `SELECT COUNT(*) as n FROM users WHERE referrer_id=?`
  ).get(user.id) as any).n

  const paidRefCount = (db.prepare(`
    SELECT COUNT(DISTINCT u.id) as n FROM users u
    JOIN subscriptions s ON s.user_id = u.id
    JOIN payments p ON p.subscription_id = s.id
    WHERE u.referrer_id = ? AND p.status = 'paid'
  `).get(user.id) as any).n

  const link = `https://t.me/${ctx.me.username}?start=ref_${tgId}`

  const kb = new InlineKeyboard()
    .url('📤 Поделиться', `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Отличный VPN для обхода блокировок!')}`)

  await ctx.reply(
    `🔗 <b>Реферальная программа</b>\n\n` +
    `Приглашай друзей и получай <b>+7 дней</b> к подписке за каждого!\n\n` +
    `📎 Твоя ссылка:\n<code>${link}</code>\n\n` +
    `📊 Статистика:\n` +
    `👥 Приглашено: <b>${refCount}</b>\n` +
    `💰 Оплатили: <b>${paidRefCount}</b>`,
    { parse_mode: 'HTML', reply_markup: kb }
  )
}
