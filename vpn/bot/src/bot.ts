import 'dotenv/config'
import { webhookCallback, InlineKeyboard } from 'grammy'
import http from 'http'
import cron from 'node-cron'
import { bot } from './bot-instance'
import { handleStart } from './commands/start'
import { handleSubscribe, handlePlanSelect, handlePayment } from './commands/subscribe'
import { handleCheckPayment } from './commands/check'
import { sendConfig } from './commands/config'
import { showStatus } from './commands/status'
import { handleAdminStats, handleAdminUsers, handleAdminBroadcast, handleBroadcastMessage } from './commands/admin'
import { handleRef } from './commands/referral'
import { handleFaq, handleFaqAnswer } from './commands/faq'
import { userRepo, subRepo, db } from './db/database'
import { initPanel } from './xray/panel'
import { verifyWebhook } from './payments/cryptomus'
import { paymentRepo } from './db/database'
import { activateSubscription } from './payments/activate'
import dayjs from 'dayjs'

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command('start', handleStart)

bot.command('subscribe', handleSubscribe)

bot.command('config', async (ctx) => {
  const user = userRepo.findByTgId(ctx.from!.id)
  if (!user) return ctx.reply('Сначала /start')
  const sub = subRepo.getActive(user.id)
  if (!sub) return ctx.reply('❌ Нет активной подписки.\n/subscribe — оформить')
  await sendConfig(bot, ctx.from!.id, sub)
})

bot.command('status', showStatus)

bot.command('support', async (ctx) => {
  const support = process.env.SUPPORT_USERNAME || 'your_admin'
  await ctx.reply(
    `💬 <b>Поддержка</b>\n\n` +
    `Напиши администратору: @${support}\n\n` +
    `Или посмотри ответы на частые вопросы:`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('❓ FAQ', 'faq') }
  )
})

bot.command('ref', handleRef)
bot.command('faq', handleFaq)

// Admin commands
bot.command('admin_stats', handleAdminStats)
bot.command('admin_users', handleAdminUsers)
bot.command('admin_broadcast', handleAdminBroadcast)

// ── Callback queries ──────────────────────────────────────────────────────────

bot.callbackQuery('subscribe', handleSubscribe)

bot.callbackQuery('get_config', async (ctx) => {
  await ctx.answerCallbackQuery()
  const user = userRepo.findByTgId(ctx.from!.id)
  if (!user) return
  const sub = subRepo.getActive(user.id)
  if (!sub) return ctx.reply('Нет активной подписки. /subscribe')
  await sendConfig(bot, ctx.from!.id, sub)
})

bot.callbackQuery('status', async (ctx) => {
  await ctx.answerCallbackQuery()
  await showStatus(ctx)
})

bot.callbackQuery('back_start', async (ctx) => {
  await ctx.answerCallbackQuery()
  await handleStart(ctx)
})

bot.callbackQuery('support', async (ctx) => {
  await ctx.answerCallbackQuery()
  const support = process.env.SUPPORT_USERNAME || 'your_admin'
  await ctx.reply(
    `💬 <b>Поддержка</b>\n\nНапиши: @${support}`,
    { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('❓ FAQ', 'faq') }
  )
})

bot.callbackQuery('faq', async (ctx) => {
  await ctx.answerCallbackQuery()
  await handleFaq(ctx)
})

bot.callbackQuery('referral', async (ctx) => {
  await ctx.answerCallbackQuery()
  await handleRef(ctx)
})

bot.callbackQuery(/^faq:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  await handleFaqAnswer(ctx, ctx.match[1])
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

// ── Message handler (admin broadcast) ────────────────────────────────────────

bot.on('message:text', async (ctx, next) => {
  const handled = await handleBroadcastMessage(ctx)
  if (!handled) await next()
})

// ── Cron: expire subscriptions ────────────────────────────────────────────────

cron.schedule('*/30 * * * *', () => {
  const expired = subRepo.expireOld()
  if (expired > 0) console.log(`[cron] Expired ${expired} subscriptions`)
})

// ── Cron: warn users 3 days before expiry ─────────────────────────────────────

cron.schedule('0 10 * * *', async () => {
  const soon = db.prepare(`
    SELECT s.*, u.tg_id FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE s.status='active'
      AND s.expires_at BETWEEN datetime('now') AND datetime('now', '+3 days')
  `).all() as any[]

  for (const sub of soon) {
    const days = dayjs(sub.expires_at).diff(dayjs(), 'day')
    const kb = new InlineKeyboard().text('🔄 Продлить', 'subscribe')
    await bot.api.sendMessage(
      sub.tg_id,
      `⚠️ <b>Подписка скоро истекает!</b>\n\nОсталось: <b>${days} дн.</b>\n\nПродли чтобы не потерять доступ.`,
      { parse_mode: 'HTML', reply_markup: kb }
    ).catch(() => {})
  }
})

// ── HTTP server (webhooks + health) ──────────────────────────────────────────

const PORT = Number(process.env.PORT || 3000)
const WEBHOOK_PATH = '/webhook'
const startTime = Date.now()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url!, `http://localhost`)

  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      users: userRepo.count(),
      active_subs: subRepo.countActive(),
    }))
    return
  }

  // Cryptomus payment webhook
  if (url.pathname === '/crypto-webhook' && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        if (verifyWebhook(data) && data.payment_status === 'paid') {
          const orderId: string = data.order_id
          const dbId = Number(orderId.replace('pay_', ''))
          const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(dbId) as any
          if (payment && payment.status !== 'paid') {
            paymentRepo.markPaid(dbId)
            await activateSubscription(dbId)
          }
        }
      } catch (e) {
        console.error('[webhook] Crypto webhook error:', e)
      }
      res.end('ok')
    })
    return
  }

  // YooKassa webhook
  if (url.pathname === '/yookassa-webhook' && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        if (data.event === 'payment.succeeded' && data.object?.id) {
          const payment = paymentRepo.findByProviderId(data.object.id)
          if (payment && payment.status !== 'paid') {
            paymentRepo.markPaid(payment.id)
            await activateSubscription(payment.id)
          }
        }
      } catch (e) {
        console.error('[webhook] YooKassa webhook error:', e)
      }
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
  await initPanel().catch((e) => console.warn('[panel] Init failed (will retry on demand):', e.message))

  if (process.env.WEBHOOK_URL) {
    await bot.api.setWebhook(`${process.env.WEBHOOK_URL}${WEBHOOK_PATH}`)
    server.listen(PORT, () => console.log(`[bot] Webhook server on :${PORT}`))
  } else {
    console.log('[bot] Starting in polling mode...')
    server.listen(PORT, () => console.log(`[bot] Health/webhook server on :${PORT}`))
    bot.start()
  }
}

main().catch((e) => {
  console.error('[bot] Fatal startup error:', e)
  process.exit(1)
})
