import 'dotenv/config'
import { Bot, webhookCallback } from 'grammy'
import http from 'http'
import cron from 'node-cron'
import { handleStart } from './commands/start'
import { handleSubscribe, handlePlanSelect, handlePayment } from './commands/subscribe'
import { handleCheckPayment } from './commands/check'
import { sendConfig } from './commands/config'
import { userRepo, subRepo } from './db/database'
import { initPanel, removeUser } from './xray/panel'
import { verifyWebhook } from './payments/cryptomus'
import { paymentRepo } from './db/database'
import { activateSubscription } from './payments/activate'

export const bot = new Bot(process.env.BOT_TOKEN!)

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command('start', handleStart)

bot.command('subscribe', (ctx) => ctx.reply('💳', { reply_markup: undefined }).then(() => handleSubscribe(ctx)))

bot.command('config', async (ctx) => {
  const user = userRepo.findByTgId(ctx.from!.id)
  if (!user) return ctx.reply('Сначала /start')
  const sub = subRepo.getActive(user.id)
  if (!sub) return ctx.reply('У тебя нет активной подписки. /subscribe')
  await sendConfig(bot, ctx.from!.id, sub)
})

bot.command('status', async (ctx) => {
  const user = userRepo.findByTgId(ctx.from!.id)
  if (!user) return ctx.reply('Сначала /start')
  const sub = subRepo.getActive(user.id)
  if (!sub) {
    return ctx.reply('❌ Нет активной подписки.\n/subscribe — оформить')
  }
  const { dayjs } = await import('dayjs')
  const expires = dayjs(sub.expires_at!)
  const daysLeft = expires.diff(dayjs(), 'day')
  await ctx.reply(
    `📊 <b>Статус подписки</b>\n\n` +
    `✅ Активна\n` +
    `📅 До: <b>${expires.format('DD.MM.YYYY')}</b>\n` +
    `⏳ Осталось: <b>${daysLeft} дн.</b>\n` +
    `📦 Тариф: ${sub.plan}`,
    { parse_mode: 'HTML' }
  )
})

bot.command('support', async (ctx) => {
  await ctx.reply(
    '❓ <b>Поддержка</b>\n\n' +
    'Напиши администратору: @your_admin_username\n\n' +
    'Часто задаваемые вопросы:\n' +
    '• VPN не подключается → проверь настройки клиента по /config\n' +
    '• Медленно работает → смени сервер в настройках клиента\n' +
    '• Не пришёл конфиг → напиши /config',
    { parse_mode: 'HTML' }
  )
})

// ── Callback queries ──────────────────────────────────────────────────────────

bot.callbackQuery('subscribe', handleSubscribe)
bot.callbackQuery('get_config', async (ctx) => {
  await ctx.answerCallbackQuery()
  const user = userRepo.findByTgId(ctx.from!.id)
  if (!user) return
  const sub = subRepo.getActive(user.id)
  if (!sub) return ctx.reply('Нет активной подписки.')
  await sendConfig(bot, ctx.from!.id, sub)
})
bot.callbackQuery('status', async (ctx) => {
  await ctx.answerCallbackQuery()
  await bot.api.sendMessage(ctx.from!.id, '/status')
})
bot.callbackQuery('back_start', async (ctx) => {
  await ctx.answerCallbackQuery()
  await handleStart(ctx)
})
bot.callbackQuery('support', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.reply('Напиши @your_admin_username')
})

bot.callbackQuery(/^plan:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  await handlePlanSelect(ctx, ctx.match[1])
})

bot.callbackQuery(/^pay:(yookassa|crypto):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  await handlePayment(ctx, ctx.match[1] as any, ctx.match[2])
})

bot.callbackQuery(/^check:(.+):(\d+)$/, async (ctx) => {
  await handleCheckPayment(ctx, ctx.match[1], Number(ctx.match[2]))
})

// ── Cron: expire subscriptions ────────────────────────────────────────────────

cron.schedule('*/30 * * * *', async () => {
  const expired = subRepo.expireOld()
  if (expired > 0) {
    console.log(`Expired ${expired} subscriptions`)
  }
})

// ── Cron: warn users 3 days before expiry ─────────────────────────────────────

cron.schedule('0 10 * * *', async () => {
  const soon = (await import('./db/database')).db.prepare(`
    SELECT s.*, u.tg_id FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.status='active'
      AND s.expires_at BETWEEN datetime('now') AND datetime('now', '+3 days')
  `).all() as any[]

  for (const sub of soon) {
    const { default: dayjs } = await import('dayjs')
    const days = dayjs(sub.expires_at).diff(dayjs(), 'day')
    await bot.api.sendMessage(
      sub.tg_id,
      `⚠️ Твоя подписка истекает через <b>${days} дн.</b>\n/subscribe — продлить`,
      { parse_mode: 'HTML' }
    ).catch(() => {})
  }
})

// ── HTTP server (webhooks) ────────────────────────────────────────────────────

const PORT = Number(process.env.PORT || 3000)
const WEBHOOK_PATH = '/webhook'

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost`)

  // Cryptomus webhook
  if (url.pathname === '/crypto-webhook' && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        if (verifyWebhook(data) && data.payment_status === 'paid') {
          const orderId: string = data.order_id // 'pay_123'
          const dbId = Number(orderId.replace('pay_', ''))
          const payment = (await import('./db/database')).db.prepare('SELECT * FROM payments WHERE id=?').get(dbId) as any
          if (payment && payment.status !== 'paid') {
            paymentRepo.markPaid(dbId)
            await activateSubscription(dbId)
          }
        }
      } catch (e) { console.error('Crypto webhook error:', e) }
      res.end('ok')
    })
    return
  }

  // Telegram webhook
  if (url.pathname === WEBHOOK_PATH) {
    await webhookCallback(bot, 'http')(req, res)
    return
  }

  res.writeHead(404).end()
})

async function main() {
  await initPanel().catch((e) => console.warn('Panel init failed (will retry):', e.message))

  if (process.env.WEBHOOK_URL) {
    await bot.api.setWebhook(`${process.env.WEBHOOK_URL}${WEBHOOK_PATH}`)
    server.listen(PORT, () => console.log(`Bot webhook on :${PORT}`))
  } else {
    console.log('Starting in polling mode...')
    bot.start()
  }
}

main().catch(console.error)
