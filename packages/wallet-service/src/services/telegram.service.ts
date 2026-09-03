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

export function setupBotCommands(pool?: any) {
  if (!bot) return;

  bot.on('message', async (msg: any) => {
    const chatId = msg?.chat?.id || msg?.message?.chat?.id;
    const text = msg?.text || msg?.message?.text || '';
    if (!chatId) return;

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
            { text: '📱 Выводы', web_app: { url: MINI_APP_URL } }
          ]]
        }
      });
    }
  });

  bot.on('callback_query', async (query: any) => {
    const data: string = query?.data || '';
    const chatId = query?.message?.chat?.id;
    const messageId = query?.message?.message_id;
    if (!data || !chatId || !pool) return;

    const answerOk = (text: string) => bot!.api.answerCallbackQuery({ callback_query_id: query.id, text });
    const answerErr = (text: string) => bot!.api.answerCallbackQuery({ callback_query_id: query.id, text, show_alert: true });
    const clearButtons = () => bot!.api.editMessageReplyMarkup({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });

    if (data.startsWith('approve_')) {
      const withdrawalId = data.replace('approve_', '');
      try {
        const wr = await pool.query('SELECT * FROM withdrawal_requests WHERE id=$1', [withdrawalId]);
        if (!wr.rows[0]) { await answerErr('❌ Не найден'); return; }
        await pool.query("UPDATE withdrawal_requests SET status='approved' WHERE id=$1", [withdrawalId]);
        notifyWithdrawalApproved({
          username: wr.rows[0].user_id,
          amount: Number(wr.rows[0].amount),
          coin: wr.rows[0].method || 'BTC',
          address: wr.rows[0].destination || '',
        }).catch(console.error);
        await answerOk('✅ Вывод одобрен!');
        await clearButtons();
      } catch (e: any) {
        await answerErr('❌ Ошибка БД');
      }
    }

    if (data.startsWith('reject_')) {
      const withdrawalId = data.replace('reject_', '');
      try {
        const wr = await pool.query('SELECT * FROM withdrawal_requests WHERE id=$1', [withdrawalId]);
        if (!wr.rows[0]) { await answerErr('❌ Не найден'); return; }
        if (wr.rows[0].status === 'pending') {
          await pool.query('UPDATE wallets SET balance=balance+$1 WHERE user_id=$2', [wr.rows[0].amount, wr.rows[0].user_id]);
        }
        await pool.query("UPDATE withdrawal_requests SET status='rejected', reason=$1 WHERE id=$2", ['Отклонено администратором', withdrawalId]);
        notifyWithdrawalRejected({
          username: wr.rows[0].user_id,
          amount: Number(wr.rows[0].amount),
          reason: 'Отклонено администратором',
        }).catch(console.error);
        await answerOk('✅ Вывод отклонён, средства возвращены!');
        await clearButtons();
      } catch (e: any) {
        await answerErr('❌ Ошибка БД');
      }
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
        { text: '📱 Открыть админку', web_app: { url: MINI_APP_URL } }
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
