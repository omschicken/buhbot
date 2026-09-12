import { Context, InlineKeyboard } from 'grammy'
import { userRepo, subRepo, paymentRepo } from '../db/database'
import { generateUUID } from '../xray/panel'
import { createPayment as createYookassa } from '../payments/yookassa'
import { createInvoice as createCryptomus } from '../payments/cryptomus'
import { PLANS } from './start'

export async function handleSubscribe(ctx: Context) {
  const kb = new InlineKeyboard()
  for (const plan of PLANS) {
    kb.text(`${plan.label} — ${plan.price}₽ (${plan.desc})`, `plan:${plan.id}`).row()
  }
  kb.text('← Назад', 'back_start')

  await ctx.editMessageText('💳 Выбери тариф:', { reply_markup: kb }).catch(() =>
    ctx.reply('💳 Выбери тариф:', { reply_markup: kb })
  )
}

export async function handlePlanSelect(ctx: Context, planId: string) {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return

  const kb = new InlineKeyboard()
    .text('💳 Карта (РФ)', `pay:yookassa:${planId}`).row()
    .text('₿ Крипта (USDT)', `pay:crypto:${planId}`).row()
    .text('← Назад', 'subscribe')

  await ctx.editMessageText(
    `📦 <b>${plan.label}</b> — ${plan.price}₽\n\nВыбери способ оплаты:`,
    { parse_mode: 'HTML', reply_markup: kb }
  )
}

export async function handlePayment(ctx: Context, provider: 'yookassa' | 'crypto', planId: string) {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return

  const tgId = ctx.from!.id
  const user = userRepo.upsert(tgId, ctx.from!.username, ctx.from!.first_name)

  const uuid = generateUUID()
  const email = `user_${user.id}_${Date.now()}`

  const sub = subRepo.create(user.id, planId, uuid, email)
  const payment = paymentRepo.create(user.id, sub.id, provider, plan.price * 100)

  await ctx.editMessageText('⏳ Создаю ссылку на оплату...').catch(() => {})

  try {
    if (provider === 'yookassa') {
      const result = await createYookassa(
        plan.price * 100,
        `VPN ${plan.label}`,
        `https://t.me/${ctx.me.username}`
      )
      paymentRepo.setProviderId(payment.id, result.id)

      const kb = new InlineKeyboard()
        .url('💳 Оплатить', result.confirmationUrl).row()
        .text('✅ Проверить оплату', `check:yookassa:${payment.id}`)

      await ctx.editMessageText(
        `💳 Оплата ${plan.price}₽\n\nНажми кнопку для перехода на страницу оплаты.\nПосле оплаты нажми "Проверить".`,
        { reply_markup: kb }
      )
    } else {
      const callbackUrl = process.env.WEBHOOK_URL + '/crypto-webhook'
      const result = await createCryptomus(plan.price * 100, `pay_${payment.id}`, callbackUrl)
      paymentRepo.setProviderId(payment.id, result.uuid)

      const kb = new InlineKeyboard()
        .url('₿ Оплатить криптой', result.url).row()
        .text('✅ Проверить оплату', `check:crypto:${payment.id}`)

      await ctx.editMessageText(
        `₿ Оплата криптой (~${(plan.price / 90).toFixed(2)} USDT)\n\nНажми кнопку для перехода к оплате.\nПосле оплаты нажми "Проверить".`,
        { reply_markup: kb }
      )
    }
  } catch (err) {
    console.error('Payment creation error:', err)
    await ctx.editMessageText('❌ Ошибка создания платежа. Попробуй позже или напиши /support').catch(() => {})
  }
}
