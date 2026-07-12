import { pool } from '../config/db.js';
import { ioInstance } from '../controllers/gameController.js';
import logger from './logger.js';

/**
 * Creates a notification in the database and broadcasts it in real-time.
 * Supports running within an active transaction if a connection object is provided.
 *
 * @param {number|string} userId - Target user ID (or null for global alerts)
 * @param {string} title - Notification title
 * @param {string} message - Notification text content
 * @param {string} type - Notification type: 'WALLET', 'GAME', 'PROMO', 'SECURITY', 'GLOBAL'
 * @param {object} [connection] - Optional active database transaction connection
 */
export const createNotification = async (userId, title, message, type, connection = null) => {
  const db = connection || pool;
  const formattedType = String(type).toUpperCase();

  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)',
      [userId, title, message, formattedType]
    );

    const notificationId = result?.insertId || null;

    // Real-time broadcast if socket server is initialized
    if (ioInstance) {
      const payload = {
        id: notificationId,
        user_id: userId,
        title,
        message,
        type: formattedType,
        is_read: 0,
        created_at: new Date()
      };

      if (userId) {
        // Direct unicast to target user's private socket room
        ioInstance.to(`user_room_${userId}`).emit('new_notification', payload);
      } else {
        // Global broadcast
        ioInstance.emit('new_notification', payload);
      }
    }
  } catch (err) {
    logger.error(err, `Failed to create notification for user ${userId}`);
    // If inside a transaction, we let the parent transaction handle the error rollback
    throw err;
  }
};
