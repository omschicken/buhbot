import { Context, InlineKeyboard } from 'grammy'

const FAQ_ANSWERS: Record<string, string> = {
  connect:
    `📱 <b>Как подключиться к VPN?</b>\n\n` +
    `<b>Android / iOS:</b>\n` +
    `1. Скачай <b>v2rayNG</b> (Android) или <b>Streisand</b> (iOS)\n` +
    `2. Получи конфиг командой /config\n` +
    `3. Скопируй VLESS ссылку и импортируй в приложение\n\n` +
    `<b>Windows / macOS:</b>\n` +
    `1. Скачай <b>Hiddify</b> или <b>Clash Verge</b>\n` +
    `2. Импортируй скачанный .yaml или .json файл\n\n` +
    `Нажми /config чтобы получить конфиг.`,

  slow:
    `🐌 <b>VPN работает медленно</b>\n\n` +
    `Попробуй:\n` +
    `• Переключи протокол в настройках клиента\n` +
    `• Проверь скорость без VPN — возможно проблема у провайдера\n` +
    `• Отключи и снова включи VPN\n` +
    `• Перезапусти приложение\n\n` +
    `Если ничего не помогает — напиши в /support`,

  noconnect:
    `❌ <b>VPN не подключается</b>\n\n` +
    `1. Получи новый конфиг командой /config\n` +
    `2. Убедись что дата и время на телефоне правильные\n` +
    `3. Попробуй отключить другие VPN приложения\n` +
    `4. Временно отключи антивирус\n` +
    `5. Попробуй сменить интернет (с Wi-Fi на мобильный или наоборот)\n\n` +
    `Не помогло? Пиши в /support`,

  noconfig:
    `🔑 <b>Нет конфига или конфиг устарел</b>\n\n` +
    `Просто отправь команду /config — бот пришлёт свежий конфиг.\n\n` +
    `Если команда не работает, убедись что у тебя есть активная подписка (/status).`,

  payment:
    `💳 <b>Вопросы по оплате</b>\n\n` +
    `<b>Карты РФ (YooKassa):</b>\n` +
    `Visa, Mastercard, МИР — все карты российских банков\n\n` +
    `<b>Криптовалюта (Cryptomus):</b>\n` +
    `USDT, BTC, ETH и другие через криптобиржу\n\n` +
    `<b>Оплата не прошла?</b>\n` +
    `Нажми "Проверить оплату" в сообщении с ссылкой на оплату. Если подписка не активировалась — напиши в /support с ID платежа.\n\n` +
    `<b>Возврат:</b> в течение 24ч если VPN ни разу не использовался.`,
}

export async function handleFaq(ctx: Context) {
  const kb = new InlineKeyboard()
    .text('📱 Как подключиться?', 'faq:connect').row()
    .text('🐌 Медленно работает', 'faq:slow').row()
    .text('❌ Не подключается', 'faq:noconnect').row()
    .text('🔑 Нет конфига', 'faq:noconfig').row()
    .text('💳 Вопрос по оплате', 'faq:payment').row()
    .text('← Назад', 'back_start')

  const text =
    `❓ <b>Часто задаваемые вопросы</b>\n\n` +
    `Выбери тему — получишь подробный ответ:`

  if ('editMessageText' in ctx && ctx.callbackQuery) {
    await (ctx as any).editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }).catch(() =>
      ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb })
    )
  } else {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb })
  }
}

export async function handleFaqAnswer(ctx: Context, topic: string) {
  const answer = FAQ_ANSWERS[topic]
  if (!answer) return

  const kb = new InlineKeyboard()
    .text('← К вопросам', 'faq').row()
    .text('🏠 Главное меню', 'back_start')

  await ctx.editMessageText(answer, { parse_mode: 'HTML', reply_markup: kb }).catch(() =>
    ctx.reply(answer, { parse_mode: 'HTML', reply_markup: kb })
  )
}
