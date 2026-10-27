
import { Router } from 'express';
import pool from '../db.js';
import { daysUntilExpiry, calculateExpiryUrgency } from '../calculations.js';

const router = Router();

const EXPIRY_WINDOW_DAYS = 7;

// GET /api/dashboard — summary metrics + expiry alerts + recent campaigns
router.get('/', async (req, res) => {
  try {
    // Urgent products: batches expiring within 7 days with stock remaining
    const [urgentBatches] = await pool.query(
      `SELECT
         b.batch_id,
         b.p_id,
         b.quantity_remaining,
         DATE_FORMAT(b.exp_date, '%Y-%m-%d') AS exp_date,
         p.p_name,
         p.category
       FROM inventory_batch b
       JOIN products p ON p.p_id = b.p_id
       WHERE b.quantity_remaining > 0
         AND b.exp_date >= CURDATE()
         AND b.exp_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY b.exp_date ASC, b.quantity_remaining DESC`,
      [EXPIRY_WINDOW_DAYS]
    );

    const expiryAlerts = urgentBatches.map((b) => {
      const daysLeft = daysUntilExpiry(b.exp_date);
      const urgencyScore = calculateExpiryUrgency(daysLeft);
      const urgencyLabel =
        urgencyScore >= 75 ? 'HIGH' :
        urgencyScore >= 35 ? 'MEDIUM' : 'LOW';
      return {
        batchId: b.batch_id,
        productId: b.p_id,
        productName: b.p_name,
        category: b.category,
        quantityRemaining: Number(b.quantity_remaining),
        expiryDate: b.exp_date,
        daysLeft,
        urgencyScore,
        urgency: urgencyLabel,
      };
    });

    // Active campaign count (DRAFT + APPROVED + SENT)
    const [[activeCampaignsRow]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM campaign
       WHERE status IN ('DRAFT','APPROVED','SENT')`
    );

    // Total inventory units
    const [[inventoryRow]] = await pool.query(
      `SELECT SUM(quantity_remaining) AS total FROM inventory_batch`
    );

    // Recent campaigns for the overview panel
    const [recentCampaigns] = await pool.query(
      `SELECT
         c.d_id, c.cust_id, c.p_id, c.batch_id,
         c.discount_percentage, c.discount_amount,
         c.reason, c.ai_message,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') AS created_at,
         DATE_FORMAT(c.valid_until, '%Y-%m-%dT%H:%i:%s') AS valid_until,
         c.status, c.action,
         cu.name AS customer_name,
         cu.email AS customer_email,
         p.p_name AS product_name,
         p.category
       FROM campaign c
       JOIN customer cu ON cu.cust_id = c.cust_id
       JOIN products p ON p.p_id = c.p_id
       ORDER BY c.created_at DESC
       LIMIT 10`
    );

    res.json({
      summary: {
        urgentProducts: expiryAlerts.length,
        activeCampaigns: Number(activeCampaignsRow.cnt),
        totalInventoryUnits: Number(inventoryRow.total || 0),
      },
      expiryAlerts,
      recentCampaigns: recentCampaigns.map((c) => ({
        campaignId: c.d_id,
        customerId: c.cust_id,
        customerName: c.customer_name,
        customerEmail: c.customer_email,
        productId: c.p_id,
        productName: c.product_name,
        category: c.category,
        batchId: c.batch_id,
        action: c.action,
        discountPercentage: Number(c.discount_percentage),
        discountAmount: Number(c.discount_amount),
        reason: c.reason,
        aiMessage: c.ai_message,
        createdAt: c.created_at,
        validUntil: c.valid_until,
        status: c.status,
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
});

export default router;
