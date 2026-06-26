import { query, pool } from '../config/db.js';

// --- PRODUCTS ---

// GET /api/products
export const getProducts = async (req, res) => {
  try {
    const products = await query(
      'SELECT id, title, price, original_price as original, description as `desc`, rating, reviews_count as reviews, stock ' +
      'FROM products ORDER BY created_at DESC'
    );

    // Hydrate images and default stubs for frontend catalog compatibility
    for (const p of products) {
      const images = await query('SELECT image_url FROM product_images WHERE product_id = ?', [p.id]);
      p.images = images.map(img => img.image_url);
      p.image = p.images[0] || '';
      p.specs = ['Premium tech quality', 'Manufacturer Warranty'];
      p.badge = 'New Arrival';
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { title, price, original, badge, image, images, rating, reviews, desc } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    const origPrice = original || price * 1.5;
    const finalBadge = badge || 'New Arrival';
    const finalRating = rating || 5.0;
    const finalReviews = reviews || 0;
    const finalDesc = desc || 'Premium high-performance product added via Administrator Control Center.';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO products (title, price, original_price, description, rating, reviews_count, stock) VALUES (?, ?, ?, ?, ?, ?, 100)',
        [title, price, origPrice, finalDesc, finalRating, finalReviews]
      );
      const newProductId = result.insertId;

      // Seed product image
      if (image) {
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 1)',
          [newProductId, image]
        );
      }

      const imgList = images || [];
      for (const imgUrl of imgList) {
        if (imgUrl !== image) {
          await connection.query(
            'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, 0)',
            [newProductId, imgUrl]
          );
        }
      }

      await connection.commit();

      const [newProductRows] = await connection.query('SELECT * FROM products WHERE id = ? LIMIT 1', [newProductId]);
      const createdProduct = newProductRows[0];
      createdProduct.image = image || '';
      createdProduct.images = imgList;
      createdProduct.badge = finalBadge;
      createdProduct.specs = ['Premium tech quality', 'Manufacturer Warranty'];

      res.status(201).json(createdProduct);
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { id } = req.params;
    const fields = req.body;

    const setClauses = [];
    const values = [];

    if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
    if (fields.price !== undefined) { setClauses.push('price = ?'); values.push(fields.price); }
    if (fields.original !== undefined) { setClauses.push('original_price = ?'); values.push(fields.original); }
    if (fields.desc !== undefined) { setClauses.push('description = ?'); values.push(fields.desc); }
    if (fields.rating !== undefined) { setClauses.push('rating = ?'); values.push(fields.rating); }
    if (fields.stock !== undefined) { setClauses.push('stock = ?'); values.push(fields.stock); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);
    await query(`UPDATE products SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const [updatedProduct] = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', details: error.message });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product', details: error.message });
  }
};


// --- BANNERS ---

// GET /api/banners
export const getBanners = async (req, res) => {
  try {
    const banners = await query('SELECT id, title, subtitle, image_url as imageUrl, gradient, action FROM banners WHERE is_active = 1');
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners', details: error.message });
  }
};

// POST /api/banners
export const createBanner = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { title, subtitle, gradient, action } = req.body;
    if (!title || !subtitle || !gradient || !action) {
      return res.status(400).json({ error: 'All fields (title, subtitle, gradient, action) are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO banners (title, subtitle, gradient, action, is_active) VALUES (?, ?, ?, ?, 1)',
      [title, subtitle, gradient, action]
    );

    const [newBanner] = await query('SELECT * FROM banners WHERE id = ? LIMIT 1', [result.insertId]);
    res.status(201).json(newBanner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner', details: error.message });
  }
};

// PUT /api/banners/:id
export const updateBanner = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { id } = req.params;
    const fields = req.body;

    const setClauses = [];
    const values = [];

    if (fields.title !== undefined) { setClauses.push('title = ?'); values.push(fields.title); }
    if (fields.subtitle !== undefined) { setClauses.push('subtitle = ?'); values.push(fields.subtitle); }
    if (fields.gradient !== undefined) { setClauses.push('gradient = ?'); values.push(fields.gradient); }
    if (fields.action !== undefined) { setClauses.push('action = ?'); values.push(fields.action); }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await query(`UPDATE banners SET ${setClauses.join(', ')} WHERE id = ?`, values);

    const [updatedBanner] = await query('SELECT * FROM banners WHERE id = ? LIMIT 1', [id]);
    if (!updatedBanner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(updatedBanner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner', details: error.message });
  }
};

// DELETE /api/banners/:id
export const deleteBanner = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: Super Administrator clearance required' });
    }

    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM banners WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({ message: 'Banner deleted successfully', id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner', details: error.message });
  }
};

// POST /api/products/checkout
export const checkoutProduct = async (req, res) => {
  const { productId, address } = req.body;

  if (!productId || !address) {
    return res.status(400).json({ error: 'Product ID and address details are required.' });
  }

  const { name, mobile, pin, landmark, city, state, address: addressLine, type } = address;

  if (!name || !mobile || !pin || !city || !state || !addressLine) {
    return res.status(400).json({ error: 'All address fields are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock and check product stock and price
    const [products] = await connection.query(
      'SELECT id, price, stock, title FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const product = products[0];
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Product is out of stock.' });
    }

    // 2. Lock user's wallet
    const [wallets] = await connection.query(
      'SELECT id, balance FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );

    if (wallets.length === 0) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = wallets[0];
    const balance = parseFloat(wallet.balance);
    const price = parseFloat(product.price);

    if (balance < price) {
      return res.status(400).json({ error: 'Insufficient balance to purchase this product.' });
    }

    const newBalance = parseFloat((balance - price).toFixed(4));

    // 3. Create address
    const [addressResult] = await connection.query(
      'INSERT INTO user_addresses (user_id, full_name, phone, address_type, address_line1, address_line2, city, state, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "India")',
      [req.user.id, name, mobile, type || 'Home', addressLine, landmark || '', city, state, pin]
    );
    const userAddressId = addressResult.insertId;

    // 4. Create order record
    const expectedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const [orderResult] = await connection.query(
      'INSERT INTO product_orders (user_id, product_id, user_address_id, quantity, price_each, total_price, order_status, expected_delivery_date) VALUES (?, ?, ?, 1, ?, ?, "pending", ?)',
      [req.user.id, product.id, userAddressId, price, price, expectedDelivery]
    );
    const orderDbId = orderResult.insertId;
    const orderIdStr = `CP-${orderDbId}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Update wallet balance
    await connection.query(
      'UPDATE wallets SET balance = ? WHERE user_id = ?',
      [newBalance, req.user.id]
    );

    // 6. Update product stock
    await connection.query(
      'UPDATE products SET stock = stock - 1 WHERE id = ?',
      [product.id]
    );

    // 7. Write to wallet ledger
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) VALUES (?, ?, ?, "product_purchase", "product_orders", ?, ?, ?, ?)',
      [req.user.id, wallet.id, -price, orderDbId, balance, newBalance, `Purchased product: ${product.title}`]
    );

    // 8. Update user stats
    await connection.query(
      'UPDATE user_stats SET orders_count = orders_count + 1 WHERE user_id = ?',
      [req.user.id]
    );

    await connection.commit();

    return res.json({
      message: 'Order placed successfully',
      orderId: orderIdStr,
      walletBalance: newBalance,
      order: {
        id: orderIdStr,
        product: {
          id: product.id,
          title: product.title,
          price: price
        },
        status: 'Confirmed',
        orderDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        address: {
          name,
          mobile,
          pin,
          landmark,
          city,
          state,
          address: addressLine,
          type
        }
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  } finally {
    connection.release();
  }
};
