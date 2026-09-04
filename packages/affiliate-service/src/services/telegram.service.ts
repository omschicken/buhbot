import { Bot } from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

const bot = TOKEN ? new Bot(TOKEN) : null;

async function send(msg: string, reply_markup?: any) {
  if (!bot || !ADMIN_CHAT_ID) return;
  try {
    await bot.api.sendMessage({ chat_id: ADMIN_CHAT_ID, text: msg, parse_mode: 'Markdown', reply_markup });
  } catch (e: any) { console.error('Affiliate TG error:', e.message); }
}

export async function notifyAffiliatePayoutRequest(data: {
  payoutId: string;
  username: string;
  email: string;
  refCode: string;
  amount: number;
  coin: string;
  address: string;
  period: string;
  totalNGR: number;
  commissionPct: number;
}) {
  const msg = `💼 *ВЫПЛАТА АФФИЛИАТУ*

👤 ${data.username} (${data.email})
🔗 Реф код: \`${data.refCode}\`
📅 Период: ${data.period}

📊 NGR за период: $${data.totalNGR.toFixed(2)}
📈 Комиссия: ${data.commissionPct}%
💰 К выплате: *$${data.amount.toFixed(2)}*

🪙 Монета: ${data.coin}
📍 Адрес: \`${data.address}\``;

  await send(msg, {
    inline_keyboard: [[
      { text: '✅ Одобрить', callback_data: `aff_approve_${data.payoutId}` },
      { text: '❌ Отклонить', callback_data: `aff_reject_${data.payoutId}` },
    ]],
  });
}

export async function notifyAffiliatePayoutDone(data: {
  username: string;
  amount: number;
  coin: string;
  txHash: string;
}) {
  await send(`✅ *Выплата аффилиату отправлена*\n👤 ${data.username}\n💰 $${data.amount.toFixed(2)} ${data.coin}\n🔗 \`${data.txHash}\``);
}

export function setupAffiliateBot(pool: any) {
  if (!bot) return;

  bot.on('callback_query', async (ctx: any) => {
    const data: string = ctx.callbackQuery?.data ?? ctx.data ?? '';
    const chatId = ctx.callbackQuery?.message?.chat?.id ?? ctx.message?.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id ?? ctx.message?.message_id;
    const queryId = ctx.callbackQuery?.id ?? ctx.id;

    if (!data || !chatId || !queryId) return;

    const answer = (text: string, alert = false) =>
      bot!.api.answerCallbackQuery({ callback_query_id: queryId, text, show_alert: alert });
    const clearButtons = () =>
      bot!.api.editMessageReplyMarkup({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });

    if (data.startsWith('aff_approve_')) {
      const payoutId = data.replace('aff_approve_', '');
      try {
        const pr = await pool.query('SELECT * FROM affiliate_payouts WHERE id=$1', [payoutId]);
        if (!pr.rows[0]) { await answer('❌ Не найден', true); return; }
        if (pr.rows[0].status !== 'pending') { await answer('⚠️ Уже обработан', true); return; }
        await pool.query(
          `UPDATE affiliate_payouts SET status='approved', approved_at=NOW() WHERE id=$1`,
          [payoutId]
        );
        await clearButtons();
        await answer('✅ Одобрено! Укажи TX hash в админке.');
      } catch (e: any) {
        console.error('aff_approve error:', e);
        await answer('❌ Ошибка БД', true);
      }
    } else if (data.startsWith('aff_reject_')) {
      const payoutId = data.replace('aff_reject_', '');
      try {
        const pr = await pool.query('SELECT * FROM affiliate_payouts WHERE id=$1', [payoutId]);
        if (!pr.rows[0]) { await answer('❌ Не найден', true); return; }
        if (pr.rows[0].status !== 'pending') { await answer('⚠️ Уже обработан', true); return; }
        await pool.query(
          `UPDATE affiliate_payouts SET status='rejected', rejected_reason='Отклонено администратором', approved_at=NOW() WHERE id=$1`,
          [payoutId]
        );
        await clearButtons();
        await answer('✅ Отклонено.');
      } catch (e: any) {
        console.error('aff_reject error:', e);
        await answer('❌ Ошибка БД', true);
      }
    }
  });

  bot.startPolling().catch((e: any) => console.error('Affiliate bot polling error:', e.message));
  console.log('Affiliate Telegram bot started');
}
