import cron from 'node-cron';
import { notifyAffiliatePayoutRequest } from './telegram.service';

let _pool: any;

export function startPayoutScheduler(pool: any) {
  _pool = pool;
  // 1-е число каждого месяца в 10:00 UTC
  cron.schedule('0 10 1 * *', async () => {
    console.log('Running monthly affiliate payout calculation...');
    await processMonthlyPayouts();
  });
  console.log('Affiliate payout scheduler started');
}

export async function processMonthlyPayouts() {
  const pool = _pool;
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const period = lastMonth.toISOString().slice(0, 7);

  const { rows } = await pool.query(`
    SELECT
      a.id,
      a.user_id,
      a.referral_code as ref_code,
      a.payout_address,
      a.payout_coin,
      a.min_payout,
      a.commission_rate as commission_pct,
      SUM(ac.commission) as total_commission,
      SUM(ac.ngr) as total_ngr
    FROM affiliates a
    JOIN affiliate_commissions ac ON ac.affiliate_id = a.id
    WHERE ac.paid = false
      AND ac.period = $1
      AND a.payout_address IS NOT NULL
      AND a.payout_address != ''
    GROUP BY a.id
    HAVING SUM(ac.commission) >= a.min_payout
  `, [period]);

  for (const affiliate of rows) {
    try {
      const existing = await pool.query(
        'SELECT id FROM affiliate_payouts WHERE affiliate_id=$1 AND period=$2',
        [affiliate.id, period]
      );
      if (existing.rows.length > 0) continue;

      const { rows: payoutRows } = await pool.query(
        `INSERT INTO affiliate_payouts (affiliate_id, amount, coin, address, period)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [affiliate.id, affiliate.total_commission, affiliate.payout_coin || 'USDT',
         affiliate.payout_address, period]
      );

      const { rows: userRows } = await pool.query(
        'SELECT username, email FROM users WHERE id=$1',
        [affiliate.user_id]
      );
      const user = userRows[0] || { username: 'Unknown', email: '' };

      await notifyAffiliatePayoutRequest({
        payoutId: payoutRows[0].id,
        username: user.username,
        email: user.email,
        refCode: affiliate.ref_code,
        amount: parseFloat(affiliate.total_commission),
        coin: affiliate.payout_coin || 'USDT',
        address: affiliate.payout_address,
        period,
        totalNGR: parseFloat(affiliate.total_ngr),
        commissionPct: parseFloat(affiliate.commission_pct),
      });

      console.log(`Payout created for affiliate ${affiliate.id}: $${affiliate.total_commission}`);
    } catch (err) {
      console.error('Payout creation failed for affiliate:', affiliate.id, err);
    }
  }
}
