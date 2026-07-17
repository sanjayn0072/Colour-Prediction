import { query, pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notifier.js';

// GET /api/admin/coupons
export const getCoupons = async (req, res) => {
  try {
    const coupons = await query(
      'SELECT id, code, ' +
      'discount_type as discountType, discount_type as discount_type, ' +
      'COALESCE(NULLIF(value, 0), reward_amount) as value, COALESCE(NULLIF(value, 0), reward_amount) as discount_value, ' +
      'COALESCE(NULLIF(min_deposit, 0), min_deposit_required) as minDeposit, COALESCE(NULLIF(min_deposit, 0), min_deposit_required) as min_deposit_amount, ' +
      'max_uses as maxUses, max_uses as usage_limit, ' +
      'used_count as usedCount, used_count as used_count, ' +
      'monthly_limit as monthlyLimit, monthly_limit as monthly_limit, ' +
      'validity_days as validityDays, validity_days as validity_days, ' +
      'expires_at as expiresAt, expires_at as expire_date, ' +
      'created_at as createdAt, created_at as created_at FROM coupons ORDER BY created_at DESC'
    );
    return res.json(coupons);
  } catch (err) {
    logger.error(err, 'Failed to fetch coupons');
    return res.status(500).json({ error: 'Failed to retrieve coupons.' });
  }
};

// POST /api/admin/coupons
export const createCoupon = async (req, res) => {
  // Support both new promotional fields and legacy fields
  const code = req.body.coupon_code || req.body.code;
  const discountType = req.body.discount_type || req.body.discountType || 'flat';
  const discountValue = req.body.discount_value !== undefined ? req.body.discount_value : req.body.value;
  const minDepositAmount = req.body.min_deposit_amount !== undefined ? req.body.min_deposit_amount : req.body.minDeposit;
  const usageLimit = req.body.usage_limit !== undefined ? req.body.usage_limit : req.body.maxUses;
  const expireDate = req.body.expire_date !== undefined ? req.body.expire_date : req.body.expiresAt;
  const monthlyLimit = req.body.monthly_limit !== undefined ? parseInt(req.body.monthly_limit, 10) : 1000;
  const validityDays = req.body.validity_days !== undefined ? parseInt(req.body.validity_days, 10) : null;

  if (!code || !discountType || discountValue === undefined || isNaN(discountValue)) {
    return res.status(400).json({ error: 'Promo code, discount type, and valid discount value are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Use standardized UTC server timezone for expireDate
    const expiresVal = expireDate ? new Date(expireDate) : null;

    // Insert into DB populating both legacy and new columns for maximum system integration safety
    const [result] = await connection.query(
      'INSERT INTO coupons (code, discount_type, value, reward_amount, min_deposit, min_deposit_required, max_uses, monthly_limit, validity_days, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        code.trim().toUpperCase(), 
        discountType, 
        discountValue, 
        discountValue, // reward_amount
        minDepositAmount || 0.0000, 
        minDepositAmount || 0.0000, // min_deposit_required
        usageLimit || 1, 
        monthlyLimit,
        validityDays,
        expiresVal
      ]
    );

    // Write admin audit log
    await connection.query(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, "CREATE_COUPON", ?)',
      [req.user.id, `Created promo coupon code ${code.trim().toUpperCase()} with value ${discountValue}`]
    );

    // Create a global notification for the new promo coupon
    await createNotification(
      null,
      'New Promo Coupon!',
      `A new promo coupon code "${code.trim().toUpperCase()}" has been created! Use it on your next deposit to get bonuses.`,
      'PROMO',
      connection
    );

    await connection.commit();
    return res.status(201).json({ message: 'Coupon created successfully.', id: result.insertId });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to create coupon');
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This coupon code already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create coupon.' });
  } finally {
    connection.release();
  }
};

// PUT /api/admin/coupons/:id
export const updateCoupon = async (req, res) => {
  const { id } = req.params;
  const code = req.body.coupon_code || req.body.code;
  const discountType = req.body.discount_type || req.body.discountType;
  const discountValue = req.body.discount_value !== undefined ? req.body.discount_value : req.body.value;
  const minDepositAmount = req.body.min_deposit_amount !== undefined ? req.body.min_deposit_amount : req.body.minDeposit;
  const usageLimit = req.body.usage_limit !== undefined ? req.body.usage_limit : req.body.maxUses;
  const expireDate = req.body.expire_date !== undefined ? req.body.expire_date : req.body.expiresAt;
  const monthlyLimit = req.body.monthly_limit !== undefined ? parseInt(req.body.monthly_limit, 10) : undefined;
  const validityDays = req.body.validity_days !== undefined ? parseInt(req.body.validity_days, 10) : undefined;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT id FROM coupons WHERE id = ? FOR UPDATE', [id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    const expiresVal = expireDate ? new Date(expireDate) : null;

    await connection.query(
      'UPDATE coupons SET code = COALESCE(?, code), discount_type = COALESCE(?, discount_type), ' +
      'value = COALESCE(?, value), reward_amount = COALESCE(?, reward_amount), ' +
      'min_deposit = COALESCE(?, min_deposit), min_deposit_required = COALESCE(?, min_deposit_required), ' +
      'max_uses = COALESCE(?, max_uses), monthly_limit = COALESCE(?, monthly_limit), ' +
      'validity_days = COALESCE(?, validity_days), expires_at = ? WHERE id = ?',
      [
        code ? code.trim().toUpperCase() : null,
        discountType || null,
        discountValue !== undefined ? discountValue : null,
        discountValue !== undefined ? discountValue : null,
        minDepositAmount !== undefined ? minDepositAmount : null,
        minDepositAmount !== undefined ? minDepositAmount : null,
        usageLimit !== undefined ? usageLimit : null,
        monthlyLimit !== undefined ? monthlyLimit : null,
        validityDays !== undefined ? validityDays : null,
        expiresVal,
        id
      ]
    );

    await connection.query(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, "EDIT_COUPON", ?)',
      [req.user.id, `Edited promo coupon code ID ${id}`]
    );

    await connection.commit();
    return res.json({ message: 'Coupon updated successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to update coupon');
    return res.status(500).json({ error: 'Failed to update coupon.' });
  } finally {
    connection.release();
  }
};

// DELETE /api/admin/coupons/:id
export const deleteCoupon = async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [coupons] = await connection.query('SELECT code FROM coupons WHERE id = ?', [id]);
    if (coupons.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    await connection.query('DELETE FROM coupons WHERE id = ?', [id]);

    await connection.query(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, "DELETE_COUPON", ?)',
      [req.user.id, `Deleted coupon code ${coupons[0].code}`]
    );

    await connection.commit();
    return res.json({ message: 'Coupon deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to delete coupon');
    return res.status(500).json({ error: 'Failed to delete coupon.' });
  } finally {
    connection.release();
  }
};
