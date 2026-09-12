import { Context, InlineKeyboard } from 'grammy'
import { paymentRepo, db } from '../db/database'
import { getPaymentStatus } from '../payments/yookassa'
import { activateSubscription } from '../payments/activate'

export async function handleCheckPayment(ctx: Context, provider: string, paymentDbId: number) {
  const payment = db.prepare('SELECT * FROM payments WHERE id=?').get(paymentDbId) as any

  if (!payment) {
    await ctx.answerCallbackQuery('❌ Платёж не найден')
    return
  }

  if (payment.status === 'paid') {
    await ctx.answerCallbackQuery('✅ Уже оплачено!')
    return
  }

  await ctx.answerCallbackQuery('🔍 Проверяю...')

  try {
    let paid = false

    if (provider === 'yookassa' && payment.provider_id) {
      const status = await getPaymentStatus(payment.provider_id)
      paid = status === 'succeeded'
    }

    if (paid) {
      paymentRepo.markPaid(payment.id)
      await activateSubscription(payment.id)
    } else {
      const kb = new InlineKeyboard()
        .text('🔄 Проверить снова', `check:${provider}:${paymentDbId}`)

      await ctx.editMessageText(
        '⏳ Оплата ещё не подтверждена. Подожди минуту и попробуй снова.',
        { reply_markup: kb }
      ).catch(() => {})
    }
  } catch (err) {
    console.error('Check payment error:', err)
    await ctx.reply('❌ Ошибка проверки. Попробуй позже или напиши /support')
  }
}
