import { query } from '../config/db.js';

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await query(
      'SELECT id, title, message, is_read as isRead, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    return res.json({ message: 'Notification marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
