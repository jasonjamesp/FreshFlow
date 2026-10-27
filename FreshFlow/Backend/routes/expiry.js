
import { Router } from 'express';
import pool from '../db.js';
import { daysUntilExpiry, calculateExpiryUrgency } from '../calculations.js';

const router = Router();

// GET /api/expiry — all inventory batches sorted by urgency
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         b.batch_id,
         b.p_id,
         b.quantity_remaining,
         b.quantity_received,
         DATE_FORMAT(b.exp_date, '%Y-%m-%d') AS exp_date,
         p.p_name,
         p.category,
         p.cost_price,
         p.selling_price
       FROM inventory_batch b
       JOIN products p ON p.p_id = b.p_id
       ORDER BY b.exp_date ASC, b.quantity_remaining DESC`
    );

    const batches = rows.map((b) => {
      const daysLeft = daysUntilExpiry(b.exp_date);
      const urgencyScore = calculateExpiryUrgency(daysLeft);

      let stockStatus;
      if (Number(b.quantity_remaining) <= 0) {
        stockStatus = 'DEPLETED';
      } else if (daysLeft < 0) {
        stockStatus = 'EXPIRED';
      } else if (daysLeft <= 3) {
        stockStatus = 'NEAR_EXPIRY';
      } else {
        stockStatus = 'FRESH';
      }

      const urgencyLabel =
        stockStatus === 'EXPIRED' ? 'EXPIRED' :
        stockStatus === 'DEPLETED' ? 'DEPLETED' :
        urgencyScore >= 75 ? 'HIGH' :
        urgencyScore >= 35 ? 'MEDIUM' : 'LOW';

      return {
        batchId: b.batch_id,
        productId: b.p_id,
        productName: b.p_name,
        category: b.category,
        costPrice: Number(b.cost_price),
        sellingPrice: Number(b.selling_price),
        quantityRemaining: Number(b.quantity_remaining),
        quantityReceived: Number(b.quantity_received),
        expiryDate: b.exp_date,
        daysLeft,
        urgencyScore,
        urgency: urgencyLabel,
        stockStatus,
      };
    });

    res.json({ batches });
  } catch (err) {
    console.error('Expiry error:', err.message);
    res.status(500).json({ error: 'Failed to load expiry data.' });
  }
});

export default router;
