
import { Router } from 'express';
import pool from '../db.js';
import { daysUntilExpiry, calculateExpiryUrgency, getStockStatus } from '../calculations.js';

const router = Router();

// GET /api/products — all products with their inventory batches
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.p_id, p.p_name, p.category,
         p.cost_price, p.selling_price,
         b.batch_id,
         b.quantity_remaining,
         b.quantity_received,
         DATE_FORMAT(b.exp_date, '%Y-%m-%d') AS exp_date
       FROM products p
       LEFT JOIN inventory_batch b ON b.p_id = p.p_id
       ORDER BY p.p_name ASC, b.exp_date ASC`
    );

    // Group batches under each product
    const productsMap = new Map();

    for (const row of rows) {
      if (!productsMap.has(row.p_id)) {
        productsMap.set(row.p_id, {
          productId: row.p_id,
          productName: row.p_name,
          category: row.category,
          costPrice: Number(row.cost_price),
          sellingPrice: Number(row.selling_price),
          batches: [],
        });
      }

      if (row.batch_id) {
        const daysLeft = daysUntilExpiry(row.exp_date);
        const urgencyScore = calculateExpiryUrgency(daysLeft);
        const stockStatus = getStockStatus({ quantity_remaining: row.quantity_remaining, exp_date: row.exp_date });
        const urgencyLabel =
          stockStatus === 'EXPIRED' ? 'EXPIRED' :
          stockStatus === 'DEPLETED' ? 'DEPLETED' :
          urgencyScore >= 75 ? 'HIGH' :
          urgencyScore >= 35 ? 'MEDIUM' : 'LOW';

        productsMap.get(row.p_id).batches.push({
          batchId: row.batch_id,
          quantityRemaining: Number(row.quantity_remaining),
          quantityReceived: Number(row.quantity_received),
          expiryDate: row.exp_date,
          daysLeft,
          urgencyScore,
          urgency: urgencyLabel,
          stockStatus,
        });
      }
    }

    res.json({ products: Array.from(productsMap.values()) });
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

export default router;
