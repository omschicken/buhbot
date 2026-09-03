import { Bot } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const MINI_APP_URL = process.env.TG_MINI_APP_URL || 'https://buhbot-ckxd-git-tg-admin-oms13.vercel.app';

const bot = TOKEN ? new Bot(TOKEN) : null;

async function send(msg: string, reply_markup?: any) {
  if (!bot || !ADMIN_CHAT_ID) return;
  try { await bot.api.sendMessage({ chat_id: ADMIN_CHAT_ID, text: msg, parse_mode: 'Markdown', reply_markup }); }
  catch (e: any) { console.error('Telegram send error:', e.message); }
}

export function setupBotCommands() {
  if (!bot) return;

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    if (text === '/start') {
      await bot.api.sendMessage({
        chat_id: chatId,
        text: '🎰 *Casino Admin Bot*\n\nКоманды:\n/stats — Статистика\n/pending — Pending выводы\n\nИли откройте админ панель:',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Открыть админку', web_app: { url: MINI_APP_URL } }
          ]]
        }
      });
    }

    if (text === '/stats') {
      await bot.api.sendMessage({
        chat_id: chatId,
        text: '📊 Используйте админ панель для полной статистики:',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Открыть Stats', web_app: { url: MINI_APP_URL } }
          ]]
        }
      });
    }

    if (text === '/pending') {
      await bot.api.sendMessage({
        chat_id: chatId,
        text: '💸 Откройте админку для управления выводами:',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Выводы', web_app: { url: `${MINI_APP_URL}/#/withdrawals` } }
          ]]
        }
      });
    }
  });
}

export async function notifyWithdrawalRequest(data: {
  withdrawalId: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  coin: string;
  address: string;
  userBalance: number;
}) {
  const msg = `💸 *НОВЫЙ ЗАПРОС НА ВЫВОД*

👤 Игрок: ${data.username} (${data.email})
🆔 User ID: \`${data.userId}\`
🆔 Withdrawal ID: \`${data.withdrawalId}\`

💰 Сумма: *$${data.amount.toFixed(2)} USD*
🪙 Монета: *${data.coin}*
📍 Адрес: \`${data.address}\`

💼 Баланс игрока: $${data.userBalance.toFixed(2)}
🕑 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

Перейди в админку для подтверждения.`;

  await send(msg, {
    inline_keyboard: [
      [
        { text: '✅ Одобрить', callback_data: `approve_${data.withdrawalId}` },
        { text: '❌ Отклонить', callback_data: `reject_${data.withdrawalId}` }
      ],
      [
        { text: '📱 Открыть админку', web_app: { url: `${MINI_APP_URL}/#/withdrawals` } }
      ]
    ]
  });
}

export async function notifyWithdrawalApproved(data: {
  username: string;
  amount: number;
  coin: string;
  address: string;
  txHash?: string;
}) {
  const msg = `✅ *ВЫВОД ОДОБРЕН*

👤 ${data.username}
💰 $${data.amount.toFixed(2)} (${data.coin})
📍 ${data.address}${data.txHash ? `\n🔗 TX: \`${data.txHash}\`` : ''}`;

  await send(msg);
}

export async function notifyWithdrawalRejected(data: {
  username: string;
  amount: number;
  reason: string;
}) {
  const msg = `❌ *ВЫВОД ОТКЛОНЁН*

👤 ${data.username}
💰 $${data.amount.toFixed(2)}
📝 Причина: ${data.reason}`;

  await send(msg);
}

export async function notifyDeposit(data: {
  username: string;
  amountUSD: number;
  amountCrypto: number;
  coin: string;
  txHash: string;
}) {
  const msg = `💚 *ДЕПОЗИТ ПОЛУЧЕН*

👤 ${data.username}
💰 $${data.amountUSD.toFixed(2)} USD
🪙 ${data.amountCrypto} ${data.coin}
🔗 TX: \`${data.txHash}\``;

  await send(msg);
}

export async function sendDailyStats(data: {
  newPlayers: number;
  deposits: number;
  withdrawals: number;
  ggr: number;
  activeUsers: number;
}) {
  const msg = `📊 *СТАТИСТИКА ЗА ДЕНЬ*

👥 Новых игроков: ${data.newPlayers}
💚 Депозиты: $${data.deposits.toFixed(2)}
💸 Выводы: $${data.withdrawals.toFixed(2)}
📈 GGR: $${data.ggr.toFixed(2)}
🟢 Активных: ${data.activeUsers}`;

  await send(msg, {
    inline_keyboard: [[
      { text: '📱 Подробнее', web_app: { url: MINI_APP_URL } }
    ]]
  });
}

export { bot };
