import { Context, InlineKeyboard } from 'grammy'
import { db, userRepo, subRepo, paymentRepo } from '../db/database'
import { bot } from '../bot-instance'

function isAdmin(ctx: Context): boolean {
  const adminId = process.env.ADMIN_CHAT_ID
  if (!adminId) return false
  return String(ctx.from?.id) === adminId
}

export async function handleAdminStats(ctx: Context) {
  if (!isAdmin(ctx)) return ctx.reply('❌ Нет доступа')

  const totalUsers = userRepo.count()
  const activeSubs = subRepo.countActive()
  const revenue = paymentRepo.totalRevenue()

  const topPlan = db.prepare(`
    SELECT plan, COUNT(*) as cnt FROM subscriptions WHERE status='active'
    GROUP BY plan ORDER BY cnt DESC LIMIT 1
  `).get() as any

  await ctx.reply(
    `📊 <b>Статистика бота</b>\n\n` +
    `👥 Пользователей: <b>${totalUsers}</b>\n` +
    `✅ Активных подписок: <b>${activeSubs}</b>\n` +
    `💰 Доход всего: <b>${(revenue.total / 100).toFixed(0)} ₽</b>\n` +
    `📅 Доход за 30 дней: <b>${(revenue.last30d / 100).toFixed(0)} ₽</b>\n` +
    `🏆 Популярный тариф: <b>${topPlan?.plan ?? 'нет'}</b>`,
    { parse_mode: 'HTML' }
  )
}

export async function handleAdminUsers(ctx: Context) {
  if (!isAdmin(ctx)) return ctx.reply('❌ Нет доступа')

  const args = ctx.message?.text?.split(' ').slice(1)
  const limit = 20

  const users = db.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM subscriptions WHERE user_id=u.id AND status='active') as active_subs,
      (SELECT MAX(expires_at) FROM subscriptions WHERE user_id=u.id AND status='active') as expires_at
    FROM users u ORDER BY u.id DESC LIMIT ?
  `).all(limit) as any[]

  if (users.length === 0) return ctx.reply('Пользователей нет.')

  const text = users.map((u) =>
    `${u.active_subs > 0 ? '✅' : '⭕'} #${u.id} ` +
    `${u.username ? '@' + u.username : u.first_name || 'Unknown'}` +
    `${u.expires_at ? ` — до ${u.expires_at.slice(0, 10)}` : ''}`
  ).join('\n')

  await ctx.reply(
    `👥 <b>Последние ${limit} пользователей:</b>\n\n${text}`,
    { parse_mode: 'HTML' }
  )
}

// In-memory state for pending broadcasts
const pendingBroadcast = new Set<number>()

export function isPendingBroadcast(tgId: number): boolean {
  return pendingBroadcast.has(tgId)
}

export async function handleAdminBroadcast(ctx: Context) {
  if (!isAdmin(ctx)) return ctx.reply('❌ Нет доступа')

  const text = ctx.message?.text?.replace(/^\/admin_broadcast\s*/i, '').trim()

  if (text) {
    await executeBroadcast(ctx, text)
  } else {
    pendingBroadcast.add(ctx.from!.id)
    await ctx.reply(
      '📢 Отправь текст рассылки следующим сообщением.\n\nПоддерживается HTML-форматирование.\nОтправь /cancel для отмены.'
    )
  }
}

export async function handleBroadcastMessage(ctx: Context) {
  if (!isPendingBroadcast(ctx.from!.id)) return false

  const text = ctx.message?.text
  if (!text) {
    pendingBroadcast.delete(ctx.from!.id)
    return true
  }

  if (text === '/cancel') {
    pendingBroadcast.delete(ctx.from!.id)
    await ctx.reply('❌ Рассылка отменена.')
    return true
  }

  pendingBroadcast.delete(ctx.from!.id)
  await executeBroadcast(ctx, text)
  return true
}

async function executeBroadcast(ctx: Context, text: string) {
  const users = db.prepare('SELECT tg_id FROM users').all() as { tg_id: number }[]
  let sent = 0, failed = 0

  const statusMsg = await ctx.reply(`📢 Начинаю рассылку на ${users.length} пользователей...`)

  for (const u of users) {
    try {
      await bot.api.sendMessage(u.tg_id, text, { parse_mode: 'HTML' })
      sent++
    } catch {
      failed++
    }
  }

  await ctx.reply(
    `📢 <b>Рассылка завершена</b>\n\n✅ Отправлено: <b>${sent}</b>\n❌ Ошибок: <b>${failed}</b>`,
    { parse_mode: 'HTML' }
  )
}
