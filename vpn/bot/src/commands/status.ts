import { Context, InlineKeyboard } from 'grammy'
import { userRepo, subRepo } from '../db/database'
import dayjs from 'dayjs'

export async function showStatus(ctx: Context) {
  const tgId = ctx.from!.id
  const user = userRepo.findByTgId(tgId)
  if (!user) return ctx.reply('Сначала /start')

  const sub = subRepo.getActive(user.id)
  if (!sub) {
    const kb = new InlineKeyboard().text('🚀 Оформить подписку', 'subscribe')
    return ctx.reply(
      '❌ <b>Нет активной подписки</b>\n\nОформи подписку чтобы начать пользоваться VPN.',
      { parse_mode: 'HTML', reply_markup: kb }
    )
  }

  const expires = dayjs(sub.expires_at!)
  const daysLeft = expires.diff(dayjs(), 'day')
  const urgency = daysLeft <= 3 ? '🔴' : daysLeft <= 7 ? '🟡' : '🟢'

  const kb = new InlineKeyboard()
    .text('📄 Получить конфиг', 'get_config').row()
    .text('🔄 Продлить', 'subscribe')

  await ctx.reply(
    `📊 <b>Статус подписки</b>\n\n` +
    `${urgency} Активна\n` +
    `📅 До: <b>${expires.format('DD.MM.YYYY')}</b>\n` +
    `⏳ Осталось: <b>${daysLeft} дн.</b>\n` +
    `📦 Тариф: <b>${sub.plan}</b>`,
    { parse_mode: 'HTML', reply_markup: kb }
  )
}
