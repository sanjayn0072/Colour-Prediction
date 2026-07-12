import { query } from '../config/db.js';
import logger from '../utils/logger.js';

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await query(
      'SELECT id, title, message, is_read as isRead, type, created_at as createdAt FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json(notifications || []);
  } catch (err) {
    logger.error(err, 'Failed to fetch notifications');
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
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
    logger.error(err, 'Failed to mark notification as read');
    return res.status(500).json({ error: 'Failed to update notification state.' });
  }
};

// PATCH /api/notifications/mark-read
export const markAllAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    logger.error(err, 'Failed to mark all notifications as read');
    return res.status(500).json({ error: 'Failed to update notifications state.' });
  }
};
