import { Context, InlineKeyboard } from 'grammy'
import { userRepo, subRepo } from '../db/database'
import dayjs from 'dayjs'

export const PLANS = [
  { id: '1m', label: '1 месяц',   price: 299,  desc: '1 устройство' },
  { id: '3m', label: '3 месяца',  price: 799,  desc: 'Скидка 11%' },
  { id: '6m', label: '6 месяцев', price: 1499, desc: 'Скидка 16%' },
]

export function planName(id: string) {
  return PLANS.find((p) => p.id === id)?.label ?? id
}

export async function handleStart(ctx: Context) {
  const tgId = ctx.from!.id

  // Parse referral param: /start ref_<tgId>
  const param = ctx.message?.text?.split(' ')[1] ?? ''
  let referrerId: number | undefined
  if (param.startsWith('ref_')) {
    const refTgId = Number(param.slice(4))
    if (!isNaN(refTgId) && refTgId !== tgId) {
      const refUser = userRepo.findByTgId(refTgId)
      if (refUser) referrerId = refUser.id
    }
  }

  const user = userRepo.upsert(tgId, ctx.from!.username, ctx.from!.first_name, referrerId)
  const sub = subRepo.getActive(user.id)
  const name = ctx.from!.first_name || 'друг'

  if (sub) {
    const expires = dayjs(sub.expires_at!).format('DD.MM.YYYY')
    const daysLeft = dayjs(sub.expires_at!).diff(dayjs(), 'day')
    const urgency = daysLeft <= 3 ? '🔴' : daysLeft <= 7 ? '🟡' : '🟢'

    await ctx.reply(
      `👋 Привет, <b>${name}</b>!\n\n` +
      `${urgency} Подписка активна до <b>${expires}</b> (${daysLeft} дн.)\n\n` +
      `Что хочешь сделать?`,
      { parse_mode: 'HTML', reply_markup: mainMenu(true) }
    )
  } else if (referrerId) {
    // Onboarding for referred users
    await ctx.reply(
      `👋 Привет, <b>${name}</b>! Тебя пригласил друг.\n\n` +
      `🚀 Это <b>стабильный VPN</b> для обхода блокировок в России.\n` +
      `Работает на всех устройствах.\n\n` +
      `🎁 Твой друг получит +7 дней бонуса когда ты оформишь подписку!\n\n` +
      `Выбери тариф и начни пользоваться:`,
      { parse_mode: 'HTML', reply_markup: mainMenu(false) }
    )
  } else {
    await ctx.reply(
      `👋 Привет, <b>${name}</b>!\n\n` +
      `🛡 <b>Быстрый и надёжный VPN</b> для России.\n\n` +
      `✅ Обходит все блокировки\n` +
      `✅ Работает на Android, iOS, Windows, Mac\n` +
      `✅ Не ограничивает скорость\n` +
      `✅ Настройка за 2 минуты\n\n` +
      `Выбери тариф чтобы начать:`,
      { parse_mode: 'HTML', reply_markup: mainMenu(false) }
    )
  }
}

function mainMenu(hasSubscription: boolean) {
  const kb = new InlineKeyboard()

  if (hasSubscription) {
    kb.text('📄 Получить конфиг', 'get_config').row()
    kb.text('📊 Мой статус', 'status').row()
    kb.text('🔄 Продлить подписку', 'subscribe').row()
  } else {
    kb.text('🚀 Оформить подписку', 'subscribe').row()
  }

  kb.text('❓ FAQ / Помощь', 'faq').row()
  kb.text('🔗 Пригласить друга', 'referral').row()
  kb.text('💬 Поддержка', 'support')
  return kb
}
