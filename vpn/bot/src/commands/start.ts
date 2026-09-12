import { Context } from 'grammy'
import { userRepo, subRepo } from '../db/database'
import dayjs from 'dayjs'

const PLANS = [
  { id: '1m', label: '1 месяц',  price: 299,  desc: '1 устройство' },
  { id: '3m', label: '3 месяца', price: 799,  desc: 'Скидка 11%' },
  { id: '6m', label: '6 месяцев', price: 1499, desc: 'Скидка 16%' },
]

export function planName(id: string) {
  return PLANS.find((p) => p.id === id)?.label ?? id
}

export { PLANS }

export async function handleStart(ctx: Context) {
  const tgId = ctx.from!.id
  userRepo.upsert(tgId, ctx.from!.username, ctx.from!.first_name)

  const user = userRepo.findByTgId(tgId)!
  const sub = subRepo.getActive(user.id)

  if (sub) {
    const expires = dayjs(sub.expires_at).format('DD.MM.YYYY')
    await ctx.reply(
      `👋 Привет, ${ctx.from!.first_name || 'друг'}!\n\n` +
      `✅ У тебя активная подписка до <b>${expires}</b>\n\n` +
      `Команды:\n` +
      `/config — получить конфиг заново\n` +
      `/status — статус подписки\n` +
      `/extend — продлить\n` +
      `/support — поддержка`,
      { parse_mode: 'HTML', reply_markup: mainMenu(true) }
    )
  } else {
    await ctx.reply(
      `👋 Привет! Это VPN-бот.\n\n` +
      `🚀 Стабильный VPN для обхода блокировок в России.\n` +
      `Работает даже во время воздушных тревог.\n\n` +
      `Выбери тарифный план:`,
      { reply_markup: mainMenu(false) }
    )
  }
}

function mainMenu(hasSubscription: boolean) {
  const { InlineKeyboard } = require('grammy')
  const kb = new InlineKeyboard()

  if (hasSubscription) {
    kb.text('📄 Получить конфиг', 'get_config').row()
    kb.text('📊 Мой статус', 'status').row()
    kb.text('🔄 Продлить', 'subscribe').row()
  } else {
    kb.text('🚀 Подписаться', 'subscribe').row()
  }

  kb.text('❓ Поддержка', 'support').row()
  return kb
}
