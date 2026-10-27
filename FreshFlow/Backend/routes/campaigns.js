
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Valid status transitions
const VALID_TRANSITIONS = {
  DRAFT: ['APPROVED', 'REJECTED'],
  APPROVED: ['SENT', 'REJECTED'],
  SENT: ['REDEEMED', 'EXPIRED'],
  REDEEMED: [],
  EXPIRED: [],
  REJECTED: [],
};

// GET /api/campaigns — list campaigns with filters
router.get('/', async (req, res) => {
  try {
    const { status, action, productId, customerId } = req.query;

    let sql = `
      SELECT
        c.d_id, c.cust_id, c.p_id, c.batch_id,
        c.discount_percentage, c.discount_amount,
        c.reason, c.ai_message,
        DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
        DATE_FORMAT(c.valid_until, '%Y-%m-%dT%H:%i:%s') AS valid_until,
        c.status, c.action,
        cu.name AS customer_name,
        cu.email AS customer_email,
        cu.phone AS customer_phone,
        p.p_name AS product_name,
        p.category,
        p.selling_price,
        p.cost_price
      FROM campaign c
      JOIN customer cu ON cu.cust_id = c.cust_id
      JOIN products p ON p.p_id = c.p_id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('c.status = ?');
      params.push(status.toUpperCase());
    }
    if (action) {
      conditions.push('c.action = ?');
      params.push(action.toUpperCase());
    }
    if (productId) {
      conditions.push('c.p_id = ?');
      params.push(productId);
    }
    if (customerId) {
      conditions.push('c.cust_id = ?');
      params.push(customerId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(sql, params);

    const campaigns = rows.map((c) => ({
      campaignId: c.d_id,
      customerId: c.cust_id,
      customerName: c.customer_name,
      customerEmail: c.customer_email,
      customerPhone: c.customer_phone,
      productId: c.p_id,
      productName: c.product_name,
      category: c.category,
      sellingPrice: Number(c.selling_price),
      costPrice: Number(c.cost_price),
      batchId: c.batch_id,
      action: c.action,
      discountPercentage: Number(c.discount_percentage),
      discountAmount: Number(c.discount_amount),
      reason: c.reason,
      aiMessage: c.ai_message,
      createdAt: c.created_at,
      validUntil: c.valid_until,
      status: c.status,
    }));

    res.json({ campaigns });
  } catch (err) {
    console.error('Campaigns list error:', err.message);
    res.status(500).json({ error: 'Failed to load campaigns.' });
  }
});

// GET /api/campaigns/:id — single campaign detail
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!id || id.length > 12) {
    return res.status(400).json({ error: 'Invalid campaign ID.' });
  }

  try {
    const [[c]] = await pool.query(
      `SELECT
         c.d_id, c.cust_id, c.p_id, c.batch_id,
         c.discount_percentage, c.discount_amount,
         c.reason, c.ai_message,
         DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
         DATE_FORMAT(c.valid_until, '%Y-%m-%dT%H:%i:%s') AS valid_until,
         c.status, c.action,
         cu.name AS customer_name,
         cu.email AS customer_email,
         cu.phone AS customer_phone,
         cu.loyalty_points,
         p.p_name AS product_name,
         p.category,
         p.selling_price,
         p.cost_price,
         DATE_FORMAT(b.exp_date, '%Y-%m-%d') AS exp_date,
         b.quantity_remaining
       FROM campaign c
       JOIN customer cu ON cu.cust_id = c.cust_id
       JOIN products p ON p.p_id = c.p_id
       LEFT JOIN inventory_batch b ON b.batch_id = c.batch_id
       WHERE c.d_id = ?`,
      [id]
    );

    if (!c) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    res.json({
      campaignId: c.d_id,
      customerId: c.cust_id,
      customerName: c.customer_name,
      customerEmail: c.customer_email,
      customerPhone: c.customer_phone,
      loyaltyPoints: Number(c.loyalty_points || 0),
      productId: c.p_id,
      productName: c.product_name,
      category: c.category,
      sellingPrice: Number(c.selling_price),
      costPrice: Number(c.cost_price),
      batchId: c.batch_id,
      expiryDate: c.exp_date,
      quantityRemaining: c.quantity_remaining != null ? Number(c.quantity_remaining) : null,
      action: c.action,
      discountPercentage: Number(c.discount_percentage),
      discountAmount: Number(c.discount_amount),
      reason: c.reason,
      aiMessage: c.ai_message,
      createdAt: c.created_at,
      validUntil: c.valid_until,
      status: c.status,
      allowedTransitions: VALID_TRANSITIONS[c.status] || [],
    });
  } catch (err) {
    console.error('Campaign detail error:', err.message);
    res.status(500).json({ error: 'Failed to load campaign.' });
  }
});

// PATCH /api/campaigns/:id/status — update campaign status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body ?? {};

  if (!id || id.length > 12) {
    return res.status(400).json({ error: 'Invalid campaign ID.' });
  }

  const ALLOWED_STATUSES = ['APPROVED', 'REJECTED', 'SENT', 'REDEEMED', 'EXPIRED'];
  if (!newStatus || !ALLOWED_STATUSES.includes(newStatus)) {
    return res.status(400).json({
      error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}.`,
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[campaign]] = await connection.query(
      `SELECT d_id, status FROM campaign WHERE d_id = ? FOR UPDATE`,
      [id]
    );

    if (!campaign) {
      await connection.rollback();
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const allowed = VALID_TRANSITIONS[campaign.status] || [];
    if (!allowed.includes(newStatus)) {
      await connection.rollback();
      return res.status(422).json({
        error: `Cannot transition from ${campaign.status} to ${newStatus}.`,
        currentStatus: campaign.status,
        allowedTransitions: allowed,
      });
    }

    await connection.query(
      `UPDATE campaign SET status = ? WHERE d_id = ?`,
      [newStatus, id]
    );

    await connection.commit();

    res.json({ success: true, campaignId: id, status: newStatus });
  } catch (err) {
    await connection.rollback();
    console.error('Campaign status update error:', err.message);
    res.status(500).json({ error: 'Failed to update campaign status.' });
  } finally {
    connection.release();
  }
});

export default router;
