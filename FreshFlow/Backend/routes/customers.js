
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/customers — all customers with purchase metrics
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         c.cust_id, c.name, c.email, c.phone,
         c.loyalty_points,
         DATE_FORMAT(c.created_at, '%Y-%m-%d') AS member_since,
         COUNT(DISTINCT pu.inv_no) AS total_purchases,
         COALESCE(SUM(pu.total_purchase_amount), 0) AS total_spent,
         MAX(pu.purchase_date) AS last_purchase_date
       FROM customer c
       LEFT JOIN purchase pu ON pu.cust_id = c.cust_id
       GROUP BY c.cust_id, c.name, c.email, c.phone, c.loyalty_points, c.created_at
       ORDER BY c.name ASC`
    );

    const customers = rows.map((r) => ({
      customerId: r.cust_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      loyaltyPoints: Number(r.loyalty_points || 0),
      memberSince: r.member_since,
      totalPurchases: Number(r.total_purchases),
      totalSpent: Number(r.total_spent),
      lastPurchaseDate: r.last_purchase_date
        ? new Date(r.last_purchase_date).toISOString().slice(0, 10)
        : null,
    }));

    res.json({ customers });
  } catch (err) {
    console.error('Customers error:', err.message);
    res.status(500).json({ error: 'Failed to load customers.' });
  }
});

// GET /api/customers/:id/purchases — purchase history for a customer
router.get('/:id/purchases', async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string' || id.length > 10) {
    return res.status(400).json({ error: 'Invalid customer ID.' });
  }

  try {
    // Verify customer exists
    const [[customer]] = await pool.query(
      `SELECT cust_id, name, email FROM customer WHERE cust_id = ?`,
      [id]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const [purchases] = await pool.query(
      `SELECT
         pu.inv_no,
         DATE_FORMAT(pu.purchase_date, '%Y-%m-%d') AS purchase_date,
         pu.total_purchase_amount,
         ip.p_id,
         ip.quantity,
         ip.unit_price,
         ip.discount_amount,
         p.p_name,
         p.category
       FROM purchase pu
       JOIN individual_purchase ip ON ip.inv_no = pu.inv_no
       JOIN products p ON p.p_id = ip.p_id
       WHERE pu.cust_id = ?
       ORDER BY pu.purchase_date DESC`,
      [id]
    );

    // Group line items by invoice
    const invoiceMap = new Map();
    for (const row of purchases) {
      if (!invoiceMap.has(row.inv_no)) {
        invoiceMap.set(row.inv_no, {
          invoiceNo: row.inv_no,
          purchaseDate: row.purchase_date,
          totalAmount: Number(row.total_purchase_amount),
          items: [],
        });
      }
      invoiceMap.get(row.inv_no).items.push({
        productId: row.p_id,
        productName: row.p_name,
        category: row.category,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        discountAmount: Number(row.discount_amount),
      });
    }

    res.json({
      customerId: customer.cust_id,
      name: customer.name,
      email: customer.email,
      purchases: Array.from(invoiceMap.values()),
    });
  } catch (err) {
    console.error('Customer purchases error:', err.message);
    res.status(500).json({ error: 'Failed to load purchase history.' });
  }
});

export default router;
