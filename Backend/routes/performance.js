
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/performance — campaign outcome metrics
router.get('/', async (req, res) => {
  try {
    // Campaign counts by status
    const [statusCounts] = await pool.query(
      `SELECT status, COUNT(*) AS cnt FROM campaign GROUP BY status`
    );

    const byStatus = {};
    let totalCampaigns = 0;
    for (const row of statusCounts) {
      byStatus[row.status] = Number(row.cnt);
      totalCampaigns += Number(row.cnt);
    }

    // Redeemed campaigns detail
    const redeemedCount = byStatus.REDEEMED || 0;

    // Total discount expenditure on redeemed campaigns
    const [[discountRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(discount_amount), 0) AS total_discount_spent,
         COUNT(*) AS redeemed_count
       FROM campaign
       WHERE status = 'REDEEMED'`
    );

    const totalDiscountSpent = Number(discountRow.total_discount_spent);

    // Approved + sent campaigns (active pipeline)
    const activePipeline = (byStatus.APPROVED || 0) + (byStatus.SENT || 0);

    // Inventory exposure: batches that are expired or near expiry with stock remaining
    // (potential waste before intervention)
    const [expiredBatches] = await pool.query(
      `SELECT
         SUM(CASE WHEN exp_date < CURDATE() THEN quantity_remaining ELSE 0 END) AS expired_units,
         SUM(CASE WHEN exp_date >= CURDATE() AND exp_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN quantity_remaining ELSE 0 END) AS near_expiry_units
       FROM inventory_batch
       WHERE quantity_remaining > 0`
    );

    const expiredUnits = Number(expiredBatches[0]?.expired_units || 0);
    const nearExpiryUnits = Number(expiredBatches[0]?.near_expiry_units || 0);

    // For the illustrative demo chart (clearly labelled)
    // These are reference figures from the design specification
    const illustrative = {
      label: 'Illustrative demo data',
      note: 'These values are for demonstration only. Real wastage reduction requires outcome measurements not currently recorded in the database.',
      beforeWastage: 120,
      afterWastage: 72,
      reductionPercent: Number((((120 - 72) / 120) * 100).toFixed(1)),
    };

    res.json({
      campaignCounts: {
        total: totalCampaigns,
        ...byStatus,
        activePipeline,
      },
      discountExpenditure: {
        redeemedCampaigns: redeemedCount,
        totalDiscountSpent,
        note: 'Only REDEEMED campaigns are counted. Campaigns that are approved or sent have not yet been redeemed.',
      },
      inventoryExposure: {
        expiredUnitsWithStock: expiredUnits,
        nearExpiryUnits,
        note: 'Units remaining in expired batches represent potential waste. Near-expiry units are within 7 days.',
      },
      illustrative,
    });
  } catch (err) {
    console.error('Performance error:', err.message);
    res.status(500).json({ error: 'Failed to load performance data.' });
  }
});

export default router;
