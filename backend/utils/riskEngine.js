import { pool } from '../config/db.js';
import logger from './logger.js';

/**
 * Assesses the fraud/risk level of a user based on transaction and betting patterns.
 * If risk score > 85, auto-locks the user account.
 * @param {number} userId - The database ID of the user.
 * @param {number} gameRoundId - The database ID of the game round being settled.
 */
export async function assessUserRisk(userId, gameRoundId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get user details
    const [users] = await connection.query(
      'SELECT id, name, phone, status, registration_ip, last_login_ip FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return;
    }

    const user = users[0];
    if (user.status === 'locked' || user.status === 'suspended') {
      await connection.rollback();
      return; // Already locked/suspended
    }

    let riskScore = 0;
    const details = [];

    // --- HEURISTIC 1: Bet Velocity ---
    // Count bets placed in the last 5 minutes
    const [velocityResult] = await connection.query(
      'SELECT COUNT(*) as betCount, COALESCE(SUM(bet_amount), 0) as totalBetAmount FROM bets ' +
      'WHERE user_id = ? AND created_at >= NOW() - INTERVAL 5 MINUTE',
      [userId]
    );
    const betCount = velocityResult[0]?.betCount || 0;
    const totalBetAmount = parseFloat(velocityResult[0]?.totalBetAmount || 0);

    if (betCount > 15) {
      riskScore += 30;
      details.push(`High bet velocity: ${betCount} bets placed in last 5 minutes (Total: ₹${totalBetAmount})`);
    } else if (betCount > 8) {
      riskScore += 15;
      details.push(`Moderate bet velocity: ${betCount} bets in last 5 minutes`);
    }

    // --- HEURISTIC 2: Consecutive Wins ---
    // Fetch last 10 settled bets
    const [recentBets] = await connection.query(
      'SELECT status, payout_amount, payout_multiplier FROM bets ' +
      'WHERE user_id = ? AND is_settled = 1 ORDER BY settled_at DESC LIMIT 10',
      [userId]
    );

    let winStreak = 0;
    let hasStreakBroken = false;
    
    for (const bet of recentBets) {
      if (bet.status === 'won') {
        if (!hasStreakBroken) {
          winStreak++;
        }
      } else {
        hasStreakBroken = true;
      }
    }

    if (winStreak >= 7) {
      riskScore += 40;
      details.push(`Abnormal win streak: ${winStreak} consecutive wins`);
    } else if (winStreak >= 5) {
      riskScore += 25;
      details.push(`Elevated win streak: ${winStreak} consecutive wins`);
    }

    // --- HEURISTIC 3: Payout Spikes ---
    // Check for any payout with multiplier > 10x or payout amount > 5000 in the current round
    const [spikeResult] = await connection.query(
      'SELECT MAX(payout_amount) as maxPayout, MAX(payout_multiplier) as maxMultiplier FROM bets ' +
      'WHERE user_id = ? AND game_round_id = ? AND status = "won"',
      [userId, gameRoundId]
    );

    const maxPayout = parseFloat(spikeResult[0]?.maxPayout || 0);
    const maxMultiplier = parseFloat(spikeResult[0]?.maxMultiplier || 0);

    if (maxPayout > 5000 || maxMultiplier > 10) {
      riskScore += 30;
      details.push(`Payout spike detected: Max Payout ₹${maxPayout} with multiplier ${maxMultiplier}x`);
    }

    // --- HEURISTIC 4: IP / Device Overlaps ---
    if (user.last_login_ip) {
      const [ipOverlapResult] = await connection.query(
        'SELECT COUNT(DISTINCT id) as userCount FROM users ' +
        'WHERE (last_login_ip = ? OR registration_ip = ?) AND id != ?',
        [user.last_login_ip, user.last_login_ip, userId]
      );
      const ipOverlapCount = ipOverlapResult[0]?.userCount || 0;
      if (ipOverlapCount > 3) {
        riskScore += 20;
        details.push(`High IP overlap: ${ipOverlapCount} other users shared IP ${user.last_login_ip}`);
      } else if (ipOverlapCount > 1) {
        riskScore += 10;
        details.push(`IP overlap: ${ipOverlapCount} other users shared IP ${user.last_login_ip}`);
      }
    }

    // Cap risk score between 0 and 100
    riskScore = Math.min(100, riskScore);

    // 2. Persist alert if risk score is high (>= 50)
    if (riskScore >= 50) {
      const detailsStr = details.join(' | ');
      let triggerType = 'velocity_betting';
      if (winStreak >= 5) triggerType = 'consecutive_wins';
      else if (maxPayout > 5000 || maxMultiplier > 10) triggerType = 'payout_spike';

      // Insert risk alert
      await connection.query(
        'INSERT INTO admin_risk_alerts (user_id, trigger_type, risk_score, details) VALUES (?, ?, ?, ?)',
        [userId, triggerType, riskScore, detailsStr]
      );

      logger.warn(`Elevated Risk Alert for User ID ${userId} (${user.name}): Score ${riskScore}. Details: ${detailsStr}`);

      // 3. Auto-Lock if risk score > 85
      if (riskScore > 85) {
        // Set user status to 'locked'
        await connection.query(
          'UPDATE users SET status = "locked" WHERE id = ?',
          [userId]
        );

        // Insert audit log (using admin_id = 102948 as the system audit logger)
        await connection.query(
          'INSERT INTO audit_logs (admin_id, action, details) VALUES (102948, "AUTO_LOCK_USER", ?)',
          [`System auto-locked user ${user.name} (${user.phone}) due to high fraud risk score: ${riskScore}. Details: ${detailsStr}`]
        );

        logger.error(`🚨 System auto-locked User ID ${userId} (${user.name}) due to Risk Score ${riskScore}`);

        // Resolve Socket.io instance dynamically to avoid circular dependencies
        try {
          const gameControllerModule = await import('../controllers/gameController.js');
          const io = gameControllerModule.ioInstance;
          if (io) {
            let disconnectedSockets = 0;
            for (const [id, socket] of io.of('/').sockets) {
              if (socket.user && String(socket.user.id) === String(userId)) {
                socket.disconnect(true);
                disconnectedSockets++;
              }
            }
            if (disconnectedSockets > 0) {
              logger.info(`Disconnected ${disconnectedSockets} sockets for locked user ID ${userId}`);
            }
          }
        } catch (socketErr) {
          logger.error(socketErr, 'Failed to disconnect user sockets on auto-lock');
        }
      }
    }

    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback();
    logger.error(err, `Error assessing risk for user ${userId}`);
  } finally {
    connection.release();
  }
}
