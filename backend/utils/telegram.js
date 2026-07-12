import { query } from '../config/db.js';
import logger from './logger.js';
import { decryptConfigValue } from './configEncryption.js';

/**
 * Sends a Telegram notification when a new withdrawal request is made.
 * @param {Object} params
 * @param {string} params.withdrawalId
 * @param {string} params.name
 * @param {number} params.amount
 * @param {string} params.paymentMethod
 * @param {string} [params.upiId]
 * @param {string} [params.accountHolderName]
 * @param {string} [params.accountNumber]
 * @param {string} [params.ifscCode]
 */
export async function sendWithdrawalAlert({
  withdrawalId,
  name,
  amount,
  paymentMethod,
  upiId,
  accountHolderName,
  accountNumber,
  ifscCode
}) {
  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  try {
    const configRows = await query('SELECT config_key, config_value FROM system_configs WHERE config_key IN ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID")');
    configRows.forEach(row => {
      if (row.config_key === 'TELEGRAM_BOT_TOKEN' && row.config_value) botToken = decryptConfigValue(row.config_value);
      if (row.config_key === 'TELEGRAM_CHAT_ID' && row.config_value) chatId = decryptConfigValue(row.config_value);
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch Telegram config from database');
  }

  if (!botToken || !chatId) {
    logger.warn('Telegram Bot configuration missing (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID). Notification skipped.');
    return;
  }

  const details = paymentMethod === 'UPI' 
    ? upiId 
    : `Holder: ${accountHolderName}\nAcc: ${accountNumber}\nIFSC: ${ifscCode}`;

  const message = `🚨 New Withdrawal Request\nWithdrawal ID: ${withdrawalId}\nUser: ${name}\nAmount: ₹${parseFloat(amount).toFixed(2)}\nMethod: ${paymentMethod}\nDetails:\n${details}\nStatus: PENDING`;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Telegram API error: ${response.status} - ${errorText}`);
    } else {
      logger.info(`Telegram withdrawal alert sent successfully for ID: ${withdrawalId}`);
    }
  } catch (err) {
    logger.error(err, 'Failed to dispatch Telegram withdrawal notification');
  }
}
