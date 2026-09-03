import { Bot } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

const bot = TOKEN ? new Bot(TOKEN) : null;

async function send(msg: string, reply_markup?: any) {
  if (!bot || !ADMIN_CHAT_ID) return;
  try { await bot.api.sendMessage({ chat_id: ADMIN_CHAT_ID, text: msg, parse_mode: 'Markdown', reply_markup }); }
  catch (e: any) { console.error('Telegram send error:', e.message); }
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
  const msg = `\u{1F4B8} *НОВЫЙ ЗАПРОС НА ВЫВОД*

\u{1F464} Игрок: ${data.username} (${data.email})
\u{1F194} User ID: \`${data.userId}\`
\u{1F194} Withdrawal ID: \`${data.withdrawalId}\`

\u{1F4B0} Сумма: *$${data.amount.toFixed(2)} USD*
\u{1FA99} Монета: *${data.coin}*
\u{1F4CD} Адрес: \`${data.address}\`

\u{1F4BC} Баланс игрока: $${data.userBalance.toFixed(2)}
\u{1F551} Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

Перейди в админку для подтверждения.`;

  await send(msg, {
    inline_keyboard: [[
      { text: '✅ Одобрить', callback_data: `approve_${data.withdrawalId}` },
      { text: '❌ Отклонить', callback_data: `reject_${data.withdrawalId}` }
    ]]
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

\u{1F464} ${data.username}
\u{1F4B0} $${data.amount.toFixed(2)} (${data.coin})
\u{1F4CD} ${data.address}${data.txHash ? `\n\u{1F517} TX: \`${data.txHash}\`` : ''}`;

  await send(msg);
}

export async function notifyWithdrawalRejected(data: {
  username: string;
  amount: number;
  reason: string;
}) {
  const msg = `❌ *ВЫВОД ОТКЛОНЁН*

\u{1F464} ${data.username}
\u{1F4B0} $${data.amount.toFixed(2)}
\u{1F4DD} Причина: ${data.reason}`;

  await send(msg);
}

export async function notifyDeposit(data: {
  username: string;
  amountUSD: number;
  amountCrypto: number;
  coin: string;
  txHash: string;
}) {
  const msg = `\u{1F49A} *ДЕПОЗИТ ПОЛУЧЕН*

\u{1F464} ${data.username}
\u{1F4B0} $${data.amountUSD.toFixed(2)} USD
\u{1FA99} ${data.amountCrypto} ${data.coin}
\u{1F517} TX: \`${data.txHash}\``;

  await send(msg);
}

export async function sendDailyStats(data: {
  newPlayers: number;
  deposits: number;
  withdrawals: number;
  ggr: number;
  activeUsers: number;
}) {
  const msg = `\u{1F4CA} *СТАТИСТИКА ЗА ДЕНЬ*

\u{1F465} Новых игроков: ${data.newPlayers}
\u{1F49A} Депозиты: $${data.deposits.toFixed(2)}
\u{1F4B8} Выводы: $${data.withdrawals.toFixed(2)}
\u{1F4C8} GGR: $${data.ggr.toFixed(2)}
\u{1F7E2} Активных: ${data.activeUsers}`;

  await send(msg);
}

export { bot };
