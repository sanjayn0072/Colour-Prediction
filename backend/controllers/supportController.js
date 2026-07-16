import { query } from '../config/db.js';
import { decryptConfigValue } from '../utils/configEncryption.js';

// POST /api/support/complaint
export const createComplaint = async (req, res) => {
  const { subject, description, refId } = req.body;

  if (!subject || !description) {
    return res.status(400).json({ error: 'Subject and description are required.' });
  }

  const imageUrl = req.file ? `/uploads/screenshots/${req.file.filename}` : null;
  const finalDescription = refId ? `[Order ID: ${refId}]\n${description}` : description;

  try {
    await query(
      'INSERT INTO complaints (user_id, subject, description, status, priority, image_url, complaint_type) VALUES (?, ?, ?, "open", "medium", ?, ?)',
      [req.user.id, subject, finalDescription, imageUrl, refId || null]
    );
    return res.json({ message: 'Complaint submitted successfully. Our support team will resolve it soon.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// GET /api/support/complaints
export const getComplaints = async (req, res) => {
  try {
    const complaints = await query(
      'SELECT id, subject, description, status, priority, resolution_notes as resolutionNotes, image_url as imageUrl, created_at as createdAt FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(complaints);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }
};

// POST /api/support/chat
export const chatWithSupport = async (req, res) => {
  const { message, chatHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  let apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_AI_API_KEY;

  try {
    const configRows = await query('SELECT config_value FROM system_configs WHERE config_key = "GEMINI_AI_API_KEY" LIMIT 1');
    if (configRows && configRows.length > 0 && configRows[0].config_value) {
      apiKey = decryptConfigValue(configRows[0].config_value);
    }
  } catch (err) {
    // Silently log error, fallback to env variables
  }

  if (!apiKey || apiKey.trim() === '') {
    // If no API Key is provided on backend, return a fallback message
    return res.json({
      text: "Hello! I am the Playnixclub Support Assistant. Our AI chat system is currently in offline/demo mode because no API key is configured. Please submit an Email Ticket if you need direct agent assistance."
    });
  }

  try {
    const SYSTEM_INSTRUCTION = `
You are the official Customer Support Assistant for "Playnixclub" (also known as Playnixclub Technologies Pvt Ltd), India's premier online tech-product shopping and prediction gaming platform.
 
Your task is to help users navigate the platform, explain rules, answer questions about deposits, withdrawals, promotions, VIP club, and shopping products.
 
CRITICAL BOUNDARY RULE:
You must ONLY answer questions regarding the Playnixclub website, platform, rules, account settings, games, wallet deposits, wallet withdrawals, VIP levels, and shop orders. 
If the user asks about ANYTHING outside of the Playnixclub platform (for example: writing code, general knowledge, math, science, politics, news, geography, recipes, or other unrelated games), you must politely but firmly refuse to answer. You should reply:
"I am the Playnixclub Support Assistant. I can only assist with questions regarding our games, deposits, withdrawals, VIP rewards, and shop purchases. Please let me know how I can help you with Playnixclub!"

Platform details to guide your answers:
1. Colour Prediction Game:
   - Rules: Bet on colors (Green, Red, Violet) or numbers (1-10).
   - Payouts: Green/Red pays 2x. Violet pays 4.5x. Numbers (1-10) pay 9x.
   - Sessions: Four concurrent timings: 30 seconds, 1 minute, 2 minutes, 5 minutes.
   - Betting closes (locks) 10 seconds before the round timer ends.
2. Dice Pro Game:
   - Rules: Predict if the rolled number (0.00 to 100.00) will land "Over", "Under" a target value, or within a size 10 "Range" (like 20-30).
   - Target sliders are clamped: 2.00 to 98.00 for Over/Under. For Range mode, the target is 0.00 to 90.00.
   - Payouts: In Range mode, the payout is a high 9.80x multiplier (fixed 10% win chance). Over/Under payouts are dynamic (98 / winChance).
   - Betting closes (locks) 5 seconds before the round timer ends.
3. Lucky Wheel (Spin Wheel):
   - Spin to win cash, gold, silver, vouchers, or bonus cash up to 5000+.
   - Users complete deposit tasks to receive spin credits.
4. Tech Products Shop:
   - Products available for purchase with wallet balance:
     - AuraPods Pro: ₹1,499 (40% OFF, regular ₹2,499), features ANC, 40h battery.
     - Chronos Watch S: ₹2,999 (40% OFF, regular ₹4,999), 1.43" AMOLED screen.
     - Apex Mechanical Keyboard: ₹3,499 (41% OFF, regular ₹5,999), hot-swappable.
     - Viper Wireless Mouse: ₹1,899 (36% OFF, regular ₹2,999), 65g, 26K DPI.
   - Shipping is free via BlueDart. Orders are delivered in ~5 days.
5. Wallet / Payments:
   - Minimum Deposit: ₹100. Credited in 5-10 minutes. Available methods: UPI (QR scan or copy ID 'playnixclub@ybl') and Bank Transfer.
   - Minimum Withdrawal: ₹100. Maximum Withdrawal: ₹5,000. Processed within 24 hours.
   - Withdrawal fees are calculated dynamically (approx. 3% processing fee).
   - Account withdrawals allow VIP 0 users to withdraw up to ₹2,000 total. Higher VIP levels unlock up to 30x of their tier deposit requirement.
6. Refer & Earn:
   - Sharing referral link/code (PLAYNIXCLUB2026) gives a ₹100 bonus to both when the invitee signs up and completes their first deposit.
   - Referral code structure is prefix PLAYNIXCLUB.
7. VIP Club Tiers:
   - Rewards include Level Up Bonuses, Monthly Bonuses, Daily Cashbacks, and custom Vip privileges. VIP levels are unlocked based on cumulative deposit amounts.

Be friendly, supportive, concise, and professional. Always remain in character and do not break your guardrails.
`;

    // Map history to match Google's API schema
    const contents = (chatHistory || []).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const botText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!botText) {
      throw new Error('Invalid Gemini API response structure.');
    }

    return res.json({ text: botText });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'AI Support chat error.', details: 'An internal error occurred while processing support request.' });
  }
};
