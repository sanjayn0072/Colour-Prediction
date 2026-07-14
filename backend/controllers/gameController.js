import { generateServerSeed, hashSeed, generateOutcome } from '../utils/provablyFair.js';
import logger from '../utils/logger.js';
import { query, pool, mapKeys } from '../config/db.js';
import { assessUserRisk } from '../utils/riskEngine.js';
import crypto from 'crypto';
import { createNotification } from '../utils/notifier.js';
import { decryptConfigValue } from '../utils/configEncryption.js';

// RNG Fallback Helper: Generates a cryptographically secure random number in [min, max] range
const getSecureRandom = (min, max) => {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxUnbiased = Math.floor(256 ** bytesNeeded / range) * range;
  let randomVal;
  do {
    randomVal = crypto.randomBytes(bytesNeeded).readUIntBE(0, bytesNeeded);
  } while (randomVal >= maxUnbiased);
  return min + (randomVal % range);
};

// 1. Profit-Optimization Controller for Dice Game
export const calculateDiceResult = (bets) => {
  if (!bets || bets.length === 0) {
    return getSecureRandom(1, 100);
  }

  let bestOutcome = 50;
  let minPayout = Infinity;

  // Evaluate all possible outcomes from 1 to 100
  for (let x = 1; x <= 100; x++) {
    let currentPayout = 0;

    for (const bet of bets) {
      const amount = parseFloat(bet.bet_amount);
      const mult = parseFloat(bet.payout_multiplier);
      let won = false;

      const type = String(bet.bet_type).toUpperCase();
      if (type === 'ABOVE') {
        const target = parseInt(bet.bet_value, 10);
        if (x > target) won = true;
      } else if (type === 'BELOW') {
        const target = parseInt(bet.bet_value, 10);
        if (x < target) won = true;
      } else if (type === 'CUSTOM') {
        const parts = String(bet.bet_value).split('-');
        const low = parseInt(parts[0], 10);
        const high = parseInt(parts[1], 10);
        if (x >= low && x <= high) won = true;
      }

      if (won) {
        currentPayout += amount * mult;
      }
    }

    if (currentPayout < minPayout) {
      minPayout = currentPayout;
      bestOutcome = x;
    } else if (currentPayout === minPayout) {
      // Tie breaker: prefer randomized outcomes to ensure platform entropy
      if (getSecureRandom(0, 1) === 1) {
        bestOutcome = x;
      }
    }
  }

  return bestOutcome;
};

// 2. Profit-Optimization Controller for Colour Game
export const calculateColourResult = (bets) => {
  if (!bets || bets.length === 0) {
    return getSecureRandom(1, 10);
  }

  let bestOutcome = 1;
  let minPayout = Infinity;

  // Evaluate all possible outcomes from 1 to 10
  for (let x = 1; x <= 10; x++) {
    let currentPayout = 0;

    for (const bet of bets) {
      const amount = parseFloat(bet.bet_amount);
      const mult = parseFloat(bet.payout_multiplier);
      let won = false;
      let payoutRate = mult;

      const type = String(bet.bet_type).toLowerCase();
      if (type === 'number') {
        const val = parseInt(bet.bet_value, 10);
        if (val === x) {
          won = true;
        }
      } else if (type === 'colour') {
        const chosenColor = String(bet.bet_value).toLowerCase();

        if (x === 5) {
          // Green+Violet split payout (Violet gets 4.5x, Green gets 1.5x)
          if (chosenColor === 'violet') {
            won = true;
            payoutRate = 4.5;
          } else if (chosenColor === 'green') {
            won = true;
            payoutRate = 1.5;
          }
        } else if (x === 10) {
          // Red+Violet split payout (Violet gets 4.5x, Red gets 1.5x)
          if (chosenColor === 'violet') {
            won = true;
            payoutRate = 4.5;
          } else if (chosenColor === 'red') {
            won = true;
            payoutRate = 1.5;
          }
        } else {
          const isGreen = [2, 4, 6, 8].includes(x);
          const isRed = [1, 3, 7, 9].includes(x);
          if (chosenColor === 'green' && isGreen) {
            won = true;
          } else if (chosenColor === 'red' && isRed) {
            won = true;
          }
        }
      }

      if (won) {
        currentPayout += amount * payoutRate;
      }
    }

    if (currentPayout < minPayout) {
      minPayout = currentPayout;
      bestOutcome = x;
    } else if (currentPayout === minPayout) {
      if (getSecureRandom(0, 1) === 1) {
        bestOutcome = x;
      }
    }
  }

  return bestOutcome;
};

// 3. Timeout wrapper for Dice Game optimization algorithm (1500ms fail-safe fallback)
export const calculateDiceResultWithTimeout = async (bets) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('Dice optimization calculation timed out! Falling back to secure random.');
      resolve(getSecureRandom(1, 100));
    }, 1500);

    try {
      const res = calculateDiceResult(bets);
      clearTimeout(timer);
      resolve(res);
    } catch (err) {
      logger.error(err, 'Error in calculateDiceResult');
      clearTimeout(timer);
      resolve(getSecureRandom(1, 100));
    }
  });
};

const injectVirtualBotTraffic = (targetAmount) => {
  const botBets = [];
  let currentAmount = 0;
  
  const colours = ['red', 'green', 'violet'];
  const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  while (currentAmount < targetAmount) {
    const betSize = Math.floor(Math.random() * 50) * 10 + 10;
    if (currentAmount + betSize > targetAmount) break;
    
    const isColour = Math.random() > 0.3;
    let betValue;
    let payout_multiplier;
    
    if (isColour) {
      betValue = colours[Math.floor(Math.random() * colours.length)];
      payout_multiplier = betValue === 'violet' ? 4.5 : 1.9;
    } else {
      betValue = numbers[Math.floor(Math.random() * numbers.length)];
      payout_multiplier = 8.0;
    }

    botBets.push({
      id: `bot_${Math.random().toString(36).substr(2, 9)}`,
      user_id: -1,
      bet_value: betValue,
      bet_type: isColour ? 'colour' : 'number',
      bet_amount: betSize,
      payout_multiplier,
      real_used: betSize,
      bonus_used: 0
    });
    currentAmount += betSize;
  }
  return botBets;
};

// 4. Timeout wrapper for Colour Game optimization algorithm (1500ms fail-safe fallback)
export const calculateColourResultWithTimeout = async (bets) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('Colour optimization calculation timed out! Falling back to secure random.');
      resolve(getSecureRandom(1, 10));
    }, 1500);

    try {
      const res = calculateColourResult(bets);
      clearTimeout(timer);
      resolve(res);
    } catch (err) {
      logger.error(err, 'Error in calculateColourResult');
      clearTimeout(timer);
      resolve(getSecureRandom(1, 10));
    }
  });
};

// Global state variables tracking current active periods for Colour sessions
export let currentColourGames = {
  '30s': { gameId: '3001', timeLeft: 30, maxTime: 30, phase: 'betting', serverSeed: generateServerSeed(), serverHash: '', clientSeed: '0000000000000000000000000000000000000000000000000000000000000000' },
  '1m': { gameId: '1002', timeLeft: 60, maxTime: 60, phase: 'betting', serverSeed: generateServerSeed(), serverHash: '', clientSeed: '0000000000000000000000000000000000000000000000000000000000000000' },
  '2m': { gameId: '2001', timeLeft: 120, maxTime: 120, phase: 'betting', serverSeed: generateServerSeed(), serverHash: '', clientSeed: '0000000000000000000000000000000000000000000000000000000000000000' },
  '5m': { gameId: '5001', timeLeft: 300, maxTime: 300, phase: 'betting', serverSeed: generateServerSeed(), serverHash: '', clientSeed: '0000000000000000000000000000000000000000000000000000000000000000' }
};

// Initialize server hashes for Colour sessions
Object.keys(currentColourGames).forEach(key => {
  currentColourGames[key].serverHash = hashSeed(currentColourGames[key].serverSeed);
});

export let currentDiceGame = {
  gameId: '10892',
  timeLeft: 30,
  maxTime: 30,
  phase: 'betting',
  serverSeed: generateServerSeed(),
  serverHash: '',
  clientSeed: '0000000000000000000000000000000000000000000000000000000000000000'
};
currentDiceGame.serverHash = hashSeed(currentDiceGame.serverSeed);

export const placeBet = async (req, res) => {
  const { gameType, betType, betValue, amount, session } = req.body;

  if (gameType === 'dice') {
    return res.status(400).json({ error: 'Dice engine temporarily under maintenance' });
  }
  
  if (!gameType || !betType || betValue === undefined || !amount) {
    return res.status(400).json({ error: 'All bet parameters are required' });
  }

  const betAmount = parseFloat(amount);
  if (betAmount <= 0) {
    return res.status(400).json({ error: 'Bet amount must be positive' });
  }

  let activeGame;
  if (gameType === 'colour') {
    const activeSession = session || '1m';
    activeGame = currentColourGames[activeSession];
    if (!activeGame) {
      return res.status(400).json({ error: 'Invalid session selection' });
    }
  } else {
    activeGame = currentDiceGame;
  }

  // STRICT CORE GLOBAL RULE: Reject bets if remaining time is below session lock threshold
  const lockThreshold = gameType === 'colour'
    ? (session === '30s' ? 10 : session === '1m' ? 10 : session === '2m' ? 15 : 30)
    : 10;
  if (activeGame.timeLeft <= lockThreshold || activeGame.phase === 'locked') {
    return res.status(400).json({ error: 'Betting closed for this round' });
  }

  let multiplier = 1.0;
  let winChance = 50.0;
  if (gameType === 'colour') {
    // Will be calculated inside transaction context using db query
  } else { // dice
    let normalizedType = String(betType).toUpperCase();
    if (normalizedType === 'OVER') normalizedType = 'ABOVE';
    if (normalizedType === 'UNDER') normalizedType = 'BELOW';
    if (normalizedType === 'RANGE') normalizedType = 'CUSTOM';

    let normalizedValue = String(betValue);
    if (normalizedType === 'CUSTOM' && !normalizedValue.includes('-')) {
      const baseVal = Math.floor(parseFloat(normalizedValue));
      normalizedValue = `${baseVal}-${baseVal + 10}`;
    }

    if (normalizedType === 'ABOVE') {
      const target = Math.floor(parseFloat(normalizedValue));
      if (isNaN(target) || target < 1 || target > 99) {
        return res.status(400).json({ error: 'Invalid target value for ABOVE bet' });
      }
      winChance = 100 - target;
    } else if (normalizedType === 'BELOW') {
      const target = Math.floor(parseFloat(normalizedValue));
      if (isNaN(target) || target < 2 || target > 100) {
        return res.status(400).json({ error: 'Invalid target value for BELOW bet' });
      }
      winChance = target - 1;
    } else if (normalizedType === 'CUSTOM') {
      const parts = normalizedValue.split('-');
      if (parts.length !== 2) {
        return res.status(400).json({ error: 'Invalid target value format for CUSTOM bet (expected e.g. 33-44)' });
      }
      const low = Math.floor(parseFloat(parts[0]));
      const high = Math.floor(parseFloat(parts[1]));
      if (isNaN(low) || isNaN(high) || low < 1 || high > 100 || low > high) {
        return res.status(400).json({ error: 'Invalid bounds for CUSTOM bet range' });
      }
      winChance = high - low + 1;
    } else {
      return res.status(400).json({ error: 'Invalid bet type for Dice game' });
    }

    winChance = Math.max(1, Math.min(99, winChance));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const multipliers = await getMultipliers(connection);

    if (gameType === 'colour') {
      if (betType === 'colour') {
        const lowerVal = String(betValue).toLowerCase();
        multiplier = lowerVal === 'violet' ? multipliers.violet : (lowerVal === 'green' ? multipliers.green : multipliers.red);
      } else if (betType === 'number') {
        multiplier = 8.0;
      }
    } else { // dice
      const edgeCoefficient = 100 - multipliers.diceHouseFee;
      multiplier = Math.max(1.01, Math.min(98.00, edgeCoefficient / winChance));
    }

    // 1. Lock user's wallet
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (!wallets || wallets.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallets[0].balance);
    const currentBonusBalance = parseFloat(wallets[0].bonus_balance);
    const currentRequiredWager = parseFloat(wallets[0].required_wager);
    const currentRequiredBonusWager = parseFloat(wallets[0].required_bonus_wager || 0);
    const totalAvailable = parseFloat((currentBalance + currentBonusBalance).toFixed(2));

    if (totalAvailable < betAmount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const realUsed = Math.min(currentBalance, betAmount);
    const bonusUsed = parseFloat((betAmount - realUsed).toFixed(2));

    let newBalance = parseFloat((currentBalance - realUsed).toFixed(2));
    let newBonusBalance = parseFloat((currentBonusBalance - bonusUsed).toFixed(2));
    let newRequiredWager = currentRequiredWager;
    let newRequiredBonusWager = currentRequiredBonusWager;

    if (currentRequiredWager > 0 && realUsed > 0) {
      newRequiredWager = Math.max(0, parseFloat((currentRequiredWager - realUsed).toFixed(2)));
    }

    if (currentRequiredBonusWager > 0 && bonusUsed > 0) {
      newRequiredBonusWager = Math.max(0, parseFloat((currentRequiredBonusWager - bonusUsed).toFixed(2)));
      if (newRequiredBonusWager === 0) {
        // Convert remaining bonus balance to real balance!
        newBalance = parseFloat((newBalance + newBonusBalance).toFixed(2));
        newBonusBalance = 0.00;
      }
    }

    // 2. Update wallet balance, bonus balance, required wager, and required bonus wager
    await connection.query(
      'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ?, required_bonus_wager = ? WHERE user_id = ?',
      [newBalance, newBonusBalance, newRequiredWager, newRequiredBonusWager, req.user.id]
    );

    // 3. Find/Create Game record and get Game ID
    const gameName = gameType === 'colour' ? `colour_${session || '1m'}` : 'dice';
    const [games] = await connection.query('SELECT id, is_active FROM games WHERE name = ? LIMIT 1', [gameName]);
    if (games.length > 0 && games[0].is_active === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'This game is currently disabled by administrator.' });
    }
    const gameDbId = games[0]?.id || (gameType === 'colour' ? 2 : 5);

    // 4. Find or Create Game Round (Atomic find-or-create with repeatable-read bypass)
    const [rounds] = await connection.query('SELECT id FROM game_rounds WHERE round_id = ? LIMIT 1', [activeGame.gameId]);
    let roundDbId;
    if (rounds.length > 0) {
      roundDbId = rounds[0].id;
    } else {
      const [roundResult] = await connection.query(
        'INSERT INTO game_rounds (game_id, round_id, server_seed, status) VALUES (?, ?, ?, "active") ' +
        'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
        [gameDbId, activeGame.gameId, activeGame.serverSeed]
      );
      roundDbId = roundResult.insertId;
      if (!roundDbId) {
        // Fallback: locking read to bypass transaction repeatable-read snapshot
        const [retry] = await connection.query('SELECT id FROM game_rounds WHERE round_id = ? FOR SHARE', [activeGame.gameId]);
        roundDbId = retry[0]?.id;
      }
    }

    // 4.1 Enforce ONE type of bet per session round for Dice Game from a single account
    if (gameType === 'dice') {
      const [existing] = await connection.query(
        'SELECT id FROM bets WHERE user_id = ? AND game_round_id = ? LIMIT 1',
        [req.user.id, roundDbId]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'You have already placed a bet for this round.' });
      }
    }

    // 5. Create bet record
    const [betResult] = await connection.query(
      'INSERT INTO bets (user_id, game_round_id, game_id, bet_type, bet_value, bet_amount, real_used, bonus_used, payout_multiplier, status, is_settled) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "pending", 0)',
      [req.user.id, roundDbId, gameDbId, betType, String(betValue), betAmount, realUsed, bonusUsed, multiplier]
    );
    const betId = betResult.insertId;

    // 6. Write to transaction ledger (wallet_transactions)
    await connection.query(
      'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
      'VALUES (?, ?, ?, "bet_placement", "bets", ?, ?, ?, ?)',
      [req.user.id, wallets[0].id, -betAmount, betId, currentBalance, newBalance, `Placed bet of ₹${betAmount} on game round ${activeGame.gameId}`]
    );

    // 7. Update user stats
    await connection.query(
      'UPDATE user_stats SET total_bets_placed = total_bets_placed + ?, games_played = games_played + 1 WHERE user_id = ?',
      [betAmount, req.user.id]
    );

    const statGameType = gameType === 'colour' ? `colour_${session || '1m'}` : 'dice';
    await connection.query(
      'INSERT INTO user_game_stats (user_id, game_type, games_played, total_wagered) ' +
      'VALUES (?, ?, 1, ?) ' +
      'ON DUPLICATE KEY UPDATE games_played = games_played + 1, total_wagered = total_wagered + ?',
      [req.user.id, statGameType, betAmount, betAmount]
    );

    await connection.commit();

    // Query back the newly created bet formatted
    const [insertedBets] = await connection.query('SELECT * FROM bets WHERE id = ? LIMIT 1', [betId]);
    const formattedBet = mapKeys(insertedBets[0]);
    // Force set roundId for client compatibility
    formattedBet.roundId = activeGame.gameId;

    return res.status(201).json({
      message: 'Bet placed successfully',
      bet: formattedBet,
      walletBalance: newBalance,
      bonusBalance: newBonusBalance
    });
  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Failed to place bet');
    return res.status(500).json({ error: 'Failed to place bet. Please try again.' });
  } finally {
    connection.release();
  }
};

// Helper to format date as YYMMDD
const getYYMMDD = () => {
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

// Generates a smart round ID format: YYMMDD + CODE + SEQUENCE
const generateNextRoundId = async (gameCode) => {
  const dateStr = getYYMMDD();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT date_string, last_counter FROM round_counters WHERE game_code = ? FOR UPDATE',
      [gameCode]
    );

    let nextCounter = 1;
    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO round_counters (game_code, date_string, last_counter) VALUES (?, ?, ?)',
        [gameCode, dateStr, nextCounter]
      );
    } else {
      if (rows[0].date_string !== dateStr) {
        // Midnight reset!
        await connection.query(
          'UPDATE round_counters SET date_string = ?, last_counter = ? WHERE game_code = ?',
          [dateStr, nextCounter, gameCode]
        );
      } else {
        nextCounter = rows[0].last_counter + 1;
        await connection.query(
          'UPDATE round_counters SET last_counter = ? WHERE game_code = ?',
          [nextCounter, gameCode]
        );
      }
    }
    await connection.commit();
    return `${dateStr}${gameCode}${String(nextCounter).padStart(4, '0')}`;
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to generate next round ID');
    // Fallback: return a timestamp-based ID to prevent catastrophic failure
    return `${dateStr}${gameCode}${String(Math.floor(Date.now() / 1000)).slice(-4)}`;
  } finally {
    connection.release();
  }
};

export let ioInstance = null;

export const initializeGameLoop = async (io) => {
  ioInstance = io;

  // Sync gameId values with the max values in database to prevent ER_DUP_ENTRY duplicate key errors on restart!
  try {
    const sessionCodes = {
      '30s': 'A',
      '1m': 'B',
      '2m': 'C',
      '5m': 'D'
    };
    
    for (const key of Object.keys(sessionCodes)) {
      currentColourGames[key].gameId = await generateNextRoundId(sessionCodes[key]);
      logger.info(`Initialized ${key} Colour Prediction start gameId to: ${currentColourGames[key].gameId}`);
    }

    currentDiceGame.gameId = await generateNextRoundId('E');
    logger.info(`Initialized Dice Pro start gameId to: ${currentDiceGame.gameId}`);
  } catch (err) {
    logger.error(err, 'Failed to initialize smart game start round IDs from database');
  }

  let cachedDailyPayout = 0;
  let lastDailyPayoutFetch = 0;

  // ─── ADMIN ANALYTICS LOOP ───
  setInterval(async () => {
    if (!ioInstance) return;
    
    try {
      // Fetch rolling 24h payout volume (cached for 10 seconds)
      const now = Date.now();
      if (now - lastDailyPayoutFetch > 10000) {
        try {
          const [payoutResult] = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as daily_payout FROM wallet_transactions WHERE type = 'bet_payout' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
          );
          cachedDailyPayout = parseFloat(payoutResult[0]?.daily_payout || 0);
          lastDailyPayoutFetch = now;
        } catch (dbErr) {
          logger.error('Failed to fetch rolling 24h payout volume:', dbErr);
        }
      }

      const activeUsersCount = ioInstance.sockets.sockets.size || ioInstance.engine.clientsCount || 0;
      const activeIds = [];
      for (const key of Object.keys(currentColourGames)) {
        if (currentColourGames[key].gameId) activeIds.push(currentColourGames[key].gameId);
      }
      if (currentDiceGame.gameId) activeIds.push(currentDiceGame.gameId);
      
      if (activeIds.length === 0) return;
      
      // 1. Fetch summed bets for rendering totals in the HUD
      await pool.query('SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED');
      const [bets] = await pool.query(
        'SELECT gr.round_id, b.bet_type, b.bet_value, SUM(b.bet_amount) as total FROM bets b JOIN game_rounds gr ON b.game_round_id = gr.id WHERE b.status = "pending" AND gr.round_id IN (?) GROUP BY gr.round_id, b.bet_type, b.bet_value',
        [activeIds]
      );
      
      // 2. Fetch individual wagers to feed system profit predictions
      const [individualBets] = await pool.query(
        'SELECT gr.round_id, b.bet_type, b.bet_value, b.bet_amount, b.payout_multiplier FROM bets b JOIN game_rounds gr ON b.game_round_id = gr.id WHERE b.status = "pending" AND gr.round_id IN (?)',
        [activeIds]
      );
      
      const betsByRound = {};
      for (const bet of individualBets) {
        if (!betsByRound[bet.round_id]) betsByRound[bet.round_id] = [];
        betsByRound[bet.round_id].push(bet);
      }
      
      const metrics = { 
        colour: {}, 
        dice: {},
        activeUsers: activeUsersCount,
        dailyPayout: cachedDailyPayout
      };
      
      // Initialize colour objects
      for (const key of Object.keys(currentColourGames)) {
        const gameId = currentColourGames[key].gameId;
        if (gameId) {
           const roundBets = betsByRound[gameId] || [];
           const bestNumber = calculateColourResult(roundBets);
           const bestColor = (bestNumber === 5) ? 'Violet' : (bestNumber === 0) ? 'Violet' : ([1, 3, 7, 9].includes(bestNumber) ? 'Green' : 'Red');
           
           metrics.colour[gameId] = {
             red: 0, green: 0, violet: 0,
             '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0,
             forcedOutcome: currentColourGames[key].forcedOutcome || null,
             forcedByRole: currentColourGames[key].forcedByRole || null,
             naturalSystemWinner: `${bestColor} (No. ${bestNumber})`
           };
        }
      }
      
      if (currentDiceGame.gameId) {
        const roundBets = betsByRound[currentDiceGame.gameId] || [];
        const bestRoll = calculateDiceResult(roundBets);
        metrics.dice[currentDiceGame.gameId] = {
          forcedOutcome: currentDiceGame.forcedOutcome || null,
          forcedByRole: currentDiceGame.forcedByRole || null,
          naturalSystemWinner: `Roll ${bestRoll}`
        };
      }
      
      for (const b of bets) {
        const id = b.round_id;
        const total = parseFloat(b.total);
        const bType = String(b.bet_type).toLowerCase();
        const bVal = String(b.bet_value).toLowerCase();
        
        // Find which game this belongs to
        if (metrics.colour[id]) {
          if (bType === 'colour' || bType === 'number') {
            metrics.colour[id][bVal] = total;
          }
        } else if (metrics.dice[id]) {
           const diceKey = bType + '_' + bVal;
           metrics.dice[id][diceKey] = total;
        }
      }
      
      // Standard admins and super admins can now both view forced metrics
      ioInstance.to('admin_room').emit('live_bet_metrics', metrics);
    } catch (err) {
      logger.error('Admin Analytics loop error:', err);
    }
  }, 2000);

  setInterval(async () => {
    // ─── COLOUR PREDICTION COUNTDOWNS ───
    for (const key of Object.keys(currentColourGames)) {
      const game = currentColourGames[key];
      game.timeLeft--;
      
      const lockThreshold = String(key).toLowerCase() === '30s' ? 5 : String(key).toLowerCase() === '1m' ? 10 : String(key).toLowerCase() === '2m' ? 15 : 20;
      if (game.timeLeft <= lockThreshold) {
        game.phase = 'locked';
      }

      if (game.timeLeft <= 0) {
        const nonce = parseInt(game.gameId.substring(7), 10) || 1;

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          const multipliers = await getMultipliers(connection);

          const [games] = await connection.query('SELECT id FROM games WHERE name = ? LIMIT 1', [`colour_${key}`]);
          const gameDbId = games[0]?.id || (key === '30s' ? 1 : key === '1m' ? 2 : key === '2m' ? 3 : 4);

          // 1. Get or create game round row and lock it
          const [rounds] = await connection.query(
            'SELECT id, outcome FROM game_rounds WHERE round_id = ? FOR UPDATE',
            [game.gameId]
          );
          let roundDbId;
          let winNumber;
          let winColor;

          if (rounds.length > 0) {
            roundDbId = rounds[0].id;
          } else {
            const [roundResult] = await connection.query(
              'INSERT INTO game_rounds (game_id, round_id, server_seed, status) VALUES (?, ?, ?, "active") ' +
              'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
              [gameDbId, game.gameId, game.serverSeed]
            );
            roundDbId = roundResult.insertId;
            if (!roundDbId) {
              const [retry] = await connection.query('SELECT id FROM game_rounds WHERE round_id = ? FOR SHARE', [game.gameId]);
              roundDbId = retry[0]?.id;
            }
          }

          // 2. Fetch all pending bets for the round
          const [bets] = await connection.query(
            'SELECT id, user_id, bet_value, bet_type, bet_amount, payout_multiplier, real_used, bonus_used FROM bets WHERE game_round_id = ? AND status = "pending" FOR UPDATE',
            [roundDbId]
          );

          if (game.forcedOutcome || (rounds.length > 0 && rounds[0].outcome)) {
            const outcomeStr = game.forcedOutcome || rounds[0].outcome;
            const parts = outcomeStr.trim().split(' ');
            winNumber = parseInt(parts[0], 10);
            winColor = (parts[1] || 'RED').toLowerCase();
            logger.info(`[ADMIN OVERRIDE] Settling Colour round ${game.gameId} with manual outcome: ${winNumber} ${winColor.toUpperCase()}`);
          } else {
            const totalRealBetsAmount = bets.reduce((sum, b) => sum + parseFloat(b.bet_amount), 0);
            
            let trafficThresholdAmount = 500; // Secure default fallback
            try {
              const [settings] = await connection.query({
                sql: 'SELECT config_value FROM system_configs WHERE config_key = "TRAFFIC_THRESHOLD_AMOUNT" LIMIT 1',
                timeout: 2000
              });
              if (settings && settings.length > 0 && settings[0].config_value) {
                const parsedVal = parseInt(decryptConfigValue(settings[0].config_value), 10);
                if (!isNaN(parsedVal)) {
                  trafficThresholdAmount = parsedVal;
                }
              }
            } catch (configErr) {
              logger.error(configErr, '[TRAFFIC_BALANCE] Failed to load traffic threshold from database, falling back to 500');
            }

            let finalBetsToEvaluate = bets;
            if (totalRealBetsAmount < trafficThresholdAmount) {
              const botBets = injectVirtualBotTraffic(trafficThresholdAmount - totalRealBetsAmount);
              finalBetsToEvaluate = [...bets, ...botBets];
              logger.info(`[TRAFFIC_BALANCE] Injected ${botBets.length} bot bets to reach threshold (Real: ${totalRealBetsAmount}, Target: ${trafficThresholdAmount})`);
            } else {
              logger.info(`[TRAFFIC_BALANCE] High Traffic mode: bypassed bots (Real: ${totalRealBetsAmount} >= ${trafficThresholdAmount})`);
            }

            winNumber = await calculateColourResultWithTimeout(finalBetsToEvaluate);
            winColor = (winNumber === 5) ? 'violet' : (winNumber === 10 || winNumber === 0) ? 'violet' : ([2, 4, 6, 8].includes(winNumber) ? 'green' : 'red');
          }

          // Save outcome back to DB
          await connection.query(
            'UPDATE game_rounds SET outcome = ?, status = "completed", client_seed = ?, nonce = ? WHERE id = ?',
            [`${winNumber} ${winColor.toUpperCase()}`, game.clientSeed, nonce, roundDbId]
          );

          let totalBetAmount = 0;
          let totalWinningAmount = 0;
          let totalLossAmount = 0;

          const settledBetsDetails = bets.map(bet => {
            const amount = parseFloat(bet.bet_amount);
            totalBetAmount += amount;

            let won = false;
            let payoutRate = parseFloat(bet.payout_multiplier);

            if (bet.bet_type === 'number') {
              won = parseInt(bet.bet_value, 10) === winNumber;
              payoutRate = 8.0;
            } else if (bet.bet_type === 'colour') {
              const chosenColor = String(bet.bet_value).toLowerCase();
              if (winNumber === 5) {
                if (chosenColor === 'violet') {
                  won = true;
                  payoutRate = multipliers.violet;
                } else if (chosenColor === 'green') {
                  won = true;
                  payoutRate = parseFloat((multipliers.green * 0.75).toFixed(2));
                }
              } else if (winNumber === 10 || winNumber === 0) {
                if (chosenColor === 'violet') {
                  won = true;
                  payoutRate = multipliers.violet;
                } else if (chosenColor === 'red') {
                  won = true;
                  payoutRate = parseFloat((multipliers.red * 0.75).toFixed(2));
                }
              } else {
                const isGreen = [2, 4, 6, 8].includes(winNumber);
                const isRed = [1, 3, 7, 9].includes(winNumber);
                if (chosenColor === 'green' && isGreen) {
                  won = true;
                  payoutRate = multipliers.green;
                } else if (chosenColor === 'red' && isRed) {
                  won = true;
                  payoutRate = multipliers.red;
                }
              }
            }

            const payout = won ? parseFloat((amount * payoutRate).toFixed(2)) : 0;
            if (won) {
              totalWinningAmount += payout;
            } else {
              totalLossAmount += amount;
            }

            return { ...bet, won, payout, payoutRate };
          });

          // Write outcome log
          await connection.query(
            'INSERT INTO color_prediction_history (game_round_id, winning_color, winning_number, total_bet_amount, total_winning_amount, total_loss_amount) VALUES (?, ?, ?, ?, ?, ?)',
            [roundDbId, winColor, winNumber, totalBetAmount, totalWinningAmount, totalLossAmount]
          );

          const outcomeStr = `${winNumber} ${winColor.toUpperCase()}`;
          await settleRoundBetsInBulk(connection, settledBetsDetails, outcomeStr, game.gameId, `colour_${key}`);

          await connection.commit();

          // Trigger risk assessment for each unique user in the round
          const userIds = [...new Set(bets.map(b => b.user_id))];
          for (const uId of userIds) {
            assessUserRisk(uId, roundDbId).catch(err => logger.error(err, `Risk assessment failed for user ${uId}`));
          }

          // Fetch updated history to emit
          const recentHistory = await query(
            'SELECT gr.round_id as roundId, cph.winning_color as winningColor, cph.winning_number as outcomeNumber ' +
            'FROM color_prediction_history cph ' +
            'JOIN game_rounds gr ON cph.game_round_id = gr.id ' +
            'WHERE gr.game_id = ? AND gr.status = "completed" ' +
            'ORDER BY gr.created_at DESC LIMIT 20',
            [gameDbId]
          );

          const resultPayload = {
            gameType: 'colour',
            session: key,
            gameId: game.gameId,
            outcome: winNumber,
            details: { colour: winColor },
            serverSeed: game.serverSeed,
            history: recentHistory.map(h => ({ id: h.roundId, colour: h.winningColor, number: h.outcomeNumber }))
          };
          io.to(`colour_room_${key}`).emit('GAME_RESULT', resultPayload);
          io.to(`colour_room_${key}`).emit('game_settled', resultPayload);
          io.to(`colour_room_${key}`).emit('round_ended', resultPayload);
          
          broadcastLeaderboard().catch(err => logger.error(err, 'Leaderboard Colour broadcast failed'));

          // Reset for next period
          game.forcedOutcome = null;
          game.forcedByRole = null;
          game.gameId = await generateNextRoundId(key === '30s' ? 'A' : key === '1m' ? 'B' : key === '2m' ? 'C' : 'D');
          game.timeLeft = game.maxTime;
          game.phase = 'betting';
          game.serverSeed = generateServerSeed();
          game.serverHash = hashSeed(game.serverSeed);

          const roundStartedPayload = {
            gameType: 'colour',
            session: key,
            gameId: game.gameId,
            timeLeft: game.timeLeft,
            maxTime: game.maxTime
          };
          io.to(`colour_room_${key}`).emit('round_started', roundStartedPayload);
          io.to(`colour_room_${key}`).emit('timer_reset', roundStartedPayload);
          
        } catch (err) {
          if (connection) await connection.rollback();
          logger.error(err, `Error settling Colour prediction round (${key})`);
          // Gracefully reset to prevent negative countdown loops on database errors
          game.gameId = await generateNextRoundId(key === '30s' ? 'A' : key === '1m' ? 'B' : key === '2m' ? 'C' : 'D');
          game.timeLeft = game.maxTime;
          game.phase = 'betting';
          game.serverSeed = generateServerSeed();
          game.serverHash = hashSeed(game.serverSeed);
        } finally {
          if (connection) connection.release();
        }
      } else {
        const payload = { ...game, gameType: 'colour', session: key };
        delete payload.serverSeed;
        io.to(`colour_room_${key}`).emit('GAME_TICK', payload);
      }
    }

    // ─── DICE PRO COUNTDOWN ───
    currentDiceGame.timeLeft--;
    if (currentDiceGame.timeLeft <= 5) {
      currentDiceGame.phase = 'locked';
    }

    if (currentDiceGame.timeLeft <= 0) {
      const nonce = parseInt(currentDiceGame.gameId.substring(7), 10) || 1;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [games] = await connection.query('SELECT id FROM games WHERE name = "dice" LIMIT 1');
        const gameDbId = games[0]?.id || 5;

        // 1. Get or create game round row and lock it
        const [rounds] = await connection.query(
          'SELECT id, outcome FROM game_rounds WHERE round_id = ? FOR UPDATE',
          [currentDiceGame.gameId]
        );
        let roundDbId;
        let roll;
        if (rounds.length > 0) {
          roundDbId = rounds[0].id;
        } else {
          const [roundResult] = await connection.query(
            'INSERT INTO game_rounds (game_id, round_id, server_seed, status) VALUES (?, ?, ?, "active") ' +
            'ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
            [gameDbId, currentDiceGame.gameId, currentDiceGame.serverSeed]
          );
          roundDbId = roundResult.insertId;
          if (!roundDbId) {
            const [retry] = await connection.query('SELECT id FROM game_rounds WHERE round_id = ? FOR SHARE', [currentDiceGame.gameId]);
            roundDbId = retry[0]?.id;
          }
        }

        // 2. Fetch pending bets
        const [bets] = await connection.query(
          'SELECT id, user_id, bet_value, bet_type, bet_amount, payout_multiplier, real_used, bonus_used FROM bets WHERE game_round_id = ? AND status = "pending" FOR UPDATE',
          [roundDbId]
        );

        if (currentDiceGame.forcedOutcome || (rounds.length > 0 && rounds[0].outcome)) {
          const outcomeStr = currentDiceGame.forcedOutcome || rounds[0].outcome;
          roll = parseInt(outcomeStr, 10);
          logger.info(`[ADMIN OVERRIDE] Settling Dice round ${currentDiceGame.gameId} with manual outcome: ${roll}`);
        } else {
          const totalRealBetsAmount = bets.reduce((sum, b) => sum + parseFloat(b.bet_amount), 0);
          
          let trafficThresholdAmount = 500; // Secure corporate fallback baseline
          try {
            const [settings] = await connection.query({
              sql: 'SELECT config_value FROM system_configs WHERE config_key = "TRAFFIC_THRESHOLD_AMOUNT" LIMIT 1',
              timeout: 2000
            });
            if (settings && settings.length > 0 && settings[0].config_value) {
              const parsedVal = parseInt(decryptConfigValue(settings[0].config_value), 10);
              if (!isNaN(parsedVal)) {
                trafficThresholdAmount = parsedVal;
              }
            }
          } catch (dbError) {
            console.error("[Safe Dashboard Interceptor Warning]: Column/Table missing, utilizing fallback threshold.", dbError.message);
          }

          let finalBetsToEvaluate = bets;
          if (totalRealBetsAmount < trafficThresholdAmount) {
            // Re-use bot logic for dice, though with dice options (1-100)
            const botBets = [];
            let currentAmount = 0;
            while (currentAmount < (trafficThresholdAmount - totalRealBetsAmount)) {
              const betSize = Math.floor(Math.random() * 50) * 10 + 10;
              if (currentAmount + betSize > (trafficThresholdAmount - totalRealBetsAmount)) break;
              botBets.push({
                id: `bot_${Math.random().toString(36).substr(2, 9)}`,
                user_id: -1,
                bet_value: Math.floor(Math.random() * 95) + 2, // arbitrary targets
                bet_type: 'multiplier',
                bet_amount: betSize,
                payout_multiplier: 1.98,
                real_used: betSize,
                bonus_used: 0
              });
              currentAmount += betSize;
            }
            finalBetsToEvaluate = [...bets, ...botBets];
            logger.info(`[TRAFFIC_BALANCE] Injected ${botBets.length} bot bets to reach threshold (Real: ${totalRealBetsAmount}, Target: ${trafficThresholdAmount})`);
          } else {
            logger.info(`[TRAFFIC_BALANCE] High Traffic mode: bypassed bots (Real: ${totalRealBetsAmount} >= ${trafficThresholdAmount})`);
          }
          roll = await calculateDiceResultWithTimeout(finalBetsToEvaluate);
        }

        // Save outcome to DB
        await connection.query(
          'UPDATE game_rounds SET outcome = ?, status = "completed", client_seed = ?, nonce = ? WHERE id = ?',
          [String(roll), currentDiceGame.clientSeed, nonce, roundDbId]
        );

        const winningColor = roll >= 50 ? 'green' : 'red';

        let totalBetAmount = 0;
        let totalWinningAmount = 0;
        let totalLossAmount = 0;

        const settledBetsDetails = bets.map(bet => {
          const amount = parseFloat(bet.bet_amount);
          totalBetAmount += amount;

          let won = false;
          const typeUpper = String(bet.bet_type).toUpperCase();
          if (typeUpper === 'ABOVE') {
            const target = parseInt(bet.bet_value, 10);
            won = roll > target;
          } else if (typeUpper === 'BELOW') {
            const target = parseInt(bet.bet_value, 10);
            won = roll < target;
          } else if (typeUpper === 'CUSTOM') {
            const parts = String(bet.bet_value).split('-');
            const low = parseInt(parts[0], 10);
            const high = parseInt(parts[1], 10);
            won = roll >= low && roll <= high;
          }

          const payout = won ? parseFloat((amount * bet.payout_multiplier).toFixed(2)) : 0;
          if (won) {
            totalWinningAmount += payout;
          } else {
            totalLossAmount += amount;
          }

          return { ...bet, won, payout };
        });

        // Write outcome log
        await connection.query(
          'INSERT INTO dice_game_history (game_round_id, roll_number, outcome_type, total_bet_amount, total_winning_amount, total_loss_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [roundDbId, roll, roll >= 50 ? 'high' : 'low', totalBetAmount, totalWinningAmount, totalLossAmount]
        );

          const outcomeStr = String(roll);
          await settleRoundBetsInBulk(connection, settledBetsDetails, outcomeStr, currentDiceGame.gameId, 'dice');

          await connection.commit();

        // Trigger risk assessment for each unique user in the round
        const userIds = [...new Set(bets.map(b => b.user_id))];
        for (const uId of userIds) {
          assessUserRisk(uId, roundDbId).catch(err => logger.error(err, `Risk assessment failed for user ${uId}`));
        }

        const recentHistory = await query(
          'SELECT gr.round_id as roundId, dgh.roll_number as rollNumber, dgh.outcome_type as outcomeType ' +
          'FROM dice_game_history dgh ' +
          'JOIN game_rounds gr ON dgh.game_round_id = gr.id ' +
          'WHERE gr.game_id = ? AND gr.status = "completed" ' +
          'ORDER BY gr.created_at DESC LIMIT 20',
          [gameDbId]
        );

        const diceResultPayload = {
          gameType: 'dice',
          gameId: currentDiceGame.gameId,
          outcomeNumber: roll,
          winningColor: winningColor,
          serverSeed: currentDiceGame.serverSeed,
          history: recentHistory.map(h => ({ id: h.roundId, roll: h.rollNumber, won: h.rollNumber >= 50 }))
        };
        io.to('dice_room').emit('GAME_RESULT', diceResultPayload);
        io.to('dice_room').emit('game_settled', diceResultPayload);
        io.to('dice_room').emit('round_ended', diceResultPayload);
        
        broadcastLeaderboard().catch(err => logger.error(err, 'Leaderboard Dice broadcast failed'));

        // Reset for next period
        currentDiceGame.forcedOutcome = null;
        currentDiceGame.forcedByRole = null;
        currentDiceGame.gameId = await generateNextRoundId('E');
        currentDiceGame.timeLeft = currentDiceGame.maxTime;
        currentDiceGame.phase = 'betting';
        currentDiceGame.serverSeed = generateServerSeed();
        currentDiceGame.serverHash = hashSeed(currentDiceGame.serverSeed);

        const diceRoundStartedPayload = {
          gameType: 'dice',
          gameId: currentDiceGame.gameId,
          timeLeft: currentDiceGame.timeLeft,
          maxTime: currentDiceGame.maxTime
        };
        io.to('dice_room').emit('round_started', diceRoundStartedPayload);
        io.to('dice_room').emit('timer_reset', diceRoundStartedPayload);
        
      } catch (err) {
        if (connection) await connection.rollback();
        logger.error(err, 'Error settling Dice Pro round');
        // Gracefully reset to prevent negative countdown loops on database errors
        currentDiceGame.gameId = await generateNextRoundId('E');
        currentDiceGame.timeLeft = currentDiceGame.maxTime;
        currentDiceGame.phase = 'betting';
        currentDiceGame.serverSeed = generateServerSeed();
        currentDiceGame.serverHash = hashSeed(currentDiceGame.serverSeed);
      } finally {
        if (connection) connection.release();
      }
    } else {
      const payload = { ...currentDiceGame, gameType: 'dice' };
      delete payload.serverSeed;
      io.to('dice_room').emit('GAME_TICK', payload);
    }
  }, 1000);
};

export const verifyGame = (req, res) => {
  const { serverSeed, clientSeed, nonce } = req.body;
  if (!serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ error: 'serverSeed, clientSeed, and nonce are required' });
  }

  const numericNonce = parseInt(nonce, 10);
  if (isNaN(numericNonce)) {
    return res.status(400).json({ error: 'Nonce must be a valid number' });
  }

  try {
    const calculatedHash = hashSeed(serverSeed);
    const calculatedOutcome = generateOutcome(serverSeed, clientSeed, numericNonce);
    return res.json({
      serverSeed,
      serverHash: calculatedHash,
      clientSeed,
      nonce: numericNonce,
      outcome: calculatedOutcome
    });
  } catch (err) {
    logger.error(err, 'Failed to verify game seed');
    return res.status(500).json({ error: 'Failed to verify game outcome.' });
  }
};

export const getMyBets = async (req, res) => {
  try {
    const bets = await query(
      'SELECT b.id, gr.round_id as roundId, b.bet_value as betValue, b.bet_amount as betAmount, ' +
      'b.payout_multiplier as multiplier, b.payout_amount as payout, b.status, b.outcome, b.created_at as createdAt, ' +
      'b.bet_type as betType, ' +
      'CASE WHEN g.name LIKE "colour_%" THEN "colour" ELSE "dice" END as gameType, ' +
      'CASE WHEN g.name LIKE "colour_%" THEN SUBSTRING(g.name, 8) ELSE NULL END as session ' +
      'FROM bets b ' +
      'JOIN game_rounds gr ON b.game_round_id = gr.id ' +
      'JOIN games g ON gr.game_id = g.id ' +
      'WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 100',
      [req.user.id]
    );
    return res.json(bets);
  } catch (error) {
    logger.error(error, 'Failed to retrieve user bet history');
    return res.status(500).json({ error: 'Failed to retrieve bets history.' });
  }
};

export const triggerSpin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check user deposits and spin counts (Valid ONLY for today, midnight to midnight CURDATE())
    const [depositsResult] = await connection.query(
      'SELECT COALESCE(SUM(CEIL(amount)), 0) as todayDeposits FROM deposits WHERE user_id = ? AND status = "completed" AND created_at >= CURDATE()',
      [req.user.id]
    );
    const todayDeposits = parseFloat(depositsResult[0].todayDeposits);

    const [spinsUsedResult] = await connection.query(
      'SELECT COUNT(*) as todaySpinsUsed FROM spin_rewards WHERE user_id = ? AND created_at >= CURDATE()',
      [req.user.id]
    );
    const todaySpinsUsed = parseInt(spinsUsedResult[0].todaySpinsUsed || 0, 10);

    const totalSpinsEarned = Math.floor(todayDeposits / 200);
    const spinsLeft = totalSpinsEarned - todaySpinsUsed;

    if (spinsLeft <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'You do not have any lucky spins remaining for today. Deposit ₹200 or more today to earn spins!' });
    }

    // 2. Ensure configs are seeded with correct new weights and prizes
    const [firstConfig] = await connection.query('SELECT prize_name FROM spin_configs LIMIT 1');
    if (firstConfig.length === 0 || firstConfig[0].prize_name !== 'Bonus ₹250') {
      await connection.query('DELETE FROM spin_configs');
      const defaultPrizes = [
        { prize_name: 'Bonus ₹250', type: 'bonus', value: 250, weight: 1 },
        { prize_name: 'Bonus ₹100', type: 'bonus', value: 100, weight: 5 },
        { prize_name: 'Cash ₹20', type: 'cash', value: 20, weight: 8 },
        { prize_name: 'Cash ₹10', type: 'cash', value: 10, weight: 10 },
        { prize_name: 'Cash ₹5', type: 'cash', value: 5, weight: 25 },
        { prize_name: 'Voucher 10%', type: 'empty', value: 0, weight: 25 },
        { prize_name: 'Voucher 5%', type: 'empty', value: 0, weight: 50 },
        { prize_name: 'Voucher 15%', type: 'empty', value: 0, weight: 15 }
      ];
      for (const p of defaultPrizes) {
        await connection.query(
          'INSERT INTO spin_configs (prize_name, type, value, weight, is_active) VALUES (?, ?, ?, ?, 1)',
          [p.prize_name, p.type, p.value, p.weight]
        );
      }
    }

    // 3. Fetch configurations
    const [spinPrizes] = await connection.query(
      'SELECT id, prize_name, type, value, weight FROM spin_configs WHERE is_active = 1 ORDER BY id ASC'
    );

    // 4. Roll a random segment using weight coefficients
    const totalWeight = spinPrizes.reduce((sum, p) => sum + parseFloat(p.weight || 0), 0);
    let roll = Math.random() * totalWeight;
    let selectedPrize = spinPrizes[0];
    let prizeIndex = 0;
    for (let i = 0; i < spinPrizes.length; i++) {
      roll -= parseFloat(spinPrizes[i].weight || 0);
      if (roll <= 0) {
        selectedPrize = spinPrizes[i];
        prizeIndex = i;
        break;
      }
    }

     // 5. Lock and load user wallet
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager, required_bonus_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    const wallet = wallets[0];
    const currentBalance = parseFloat(wallet.balance);
    const currentBonusBalance = parseFloat(wallet.bonus_balance);
    const currentRequiredWager = parseFloat(wallet.required_wager);
    const currentRequiredBonusWager = parseFloat(wallet.required_bonus_wager || 0);
    const prizeVal = parseFloat(selectedPrize.value);

    let newBalance = currentBalance;
    let newBonusBalance = currentBonusBalance;
    let newRequiredWager = currentRequiredWager;
    let newRequiredBonusWager = currentRequiredBonusWager;
    let bonusId = null;

    if (selectedPrize.type === 'cash') {
      newBalance = parseFloat((currentBalance + prizeVal).toFixed(2));
      await connection.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, req.user.id]);
    } else if (selectedPrize.type === 'bonus') {
      newBonusBalance = parseFloat((currentBonusBalance + prizeVal).toFixed(2));
      // Custom wagering: Bonus 250 requires 25x, Bonus 100 requires 20x
      const addedWager = prizeVal === 250 ? prizeVal * 25 : (prizeVal === 100 ? prizeVal * 20 : prizeVal * 10);
      newRequiredBonusWager = parseFloat((currentRequiredBonusWager + addedWager).toFixed(2));
      await connection.query(
        'UPDATE wallets SET bonus_balance = ?, required_bonus_wager = ? WHERE user_id = ?',
        [newBonusBalance, newRequiredBonusWager, req.user.id]
      );
      
      const [bonusResult] = await connection.query(
        'INSERT INTO bonuses (user_id, type, amount, status) VALUES (?, "spin", ?, "claimed")',
        [req.user.id, prizeVal]
      );
      bonusId = bonusResult.insertId;
    }

    // 6. Record transaction in wallet transactions ledger
    if (prizeVal > 0) {
      const refId = bonusId || selectedPrize.id;
      const refTable = selectedPrize.type === 'bonus' ? 'bonuses' : 'spin_configs';
      const balBefore = selectedPrize.type === 'bonus' ? currentBonusBalance : currentBalance;
      const balAfter = selectedPrize.type === 'bonus' ? newBonusBalance : newBalance;
      await connection.query(
        'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) VALUES (?, ?, ?, "bonus_claim", ?, ?, ?, ?, ?)',
        [req.user.id, wallet.id, prizeVal, refTable, refId, balBefore, balAfter, `Won spin wheel reward: ${selectedPrize.prize_name}`]
      );
    }

    // 7. Insert spin reward record
    await connection.query(
      'INSERT INTO spin_rewards (user_id, spin_config_id, bonus_id) VALUES (?, ?, ?)',
      [req.user.id, selectedPrize.id, bonusId]
    );

    // 8. Update user stats spins_count
    await connection.query(
      'UPDATE user_stats SET spins_count = spins_count + 1 WHERE user_id = ?',
      [req.user.id]
    );

    // 8.5 Allocate voucher to user in DB if won
    if (selectedPrize.type === 'empty') {
      const voucherCode = selectedPrize.prize_name === 'Voucher 10%'
        ? 'LUCKY10'
        : (selectedPrize.prize_name === 'Voucher 5%' ? 'LUCKY5' : 'LUCKY15');
      
      const [coupons] = await connection.query('SELECT id FROM coupons WHERE code = ? LIMIT 1', [voucherCode]);
      let couponId;
      if (coupons && coupons.length > 0) {
        couponId = coupons[0].id;
      } else {
        const minDep = voucherCode === 'LUCKY5' ? 100 : (voucherCode === 'LUCKY10' ? 200 : 300);
        const [insertRes] = await connection.query(
          'INSERT INTO coupons (code, type, reward_amount, min_deposit_required, validity_days) VALUES (?, "LOYALTY", 0.0000, ?, 3)',
          [voucherCode, minDep]
        );
        couponId = insertRes.insertId;
      }

      await connection.query(
        'INSERT INTO user_coupons (user_id, coupon_id, status, expires_at) VALUES (?, ?, "AVAILABLE", DATE_ADD(NOW(), INTERVAL 3 DAY))',
        [req.user.id, couponId]
      );
    }

    await connection.commit();

    return res.json({
      message: `You won: ${selectedPrize.prize_name}`,
      prizeIndex,
      type: selectedPrize.type === 'empty' ? 'voucher' : selectedPrize.type,
      value: selectedPrize.type === 'empty'
        ? (prizeIndex === 5 ? 'LUCKY10' : (prizeIndex === 6 ? 'LUCKY5' : 'LUCKY15'))
        : prizeVal,
      walletBalance: newBalance,
      bonusBalance: newBonusBalance
    });

  } catch (error) {
    await connection.rollback();
    logger.error(error, 'Failed to execute lucky spin');
    return res.status(500).json({ error: 'Failed to complete spin wheel draw.' });
  } finally {
    connection.release();
  }
};


export const overwriteGame = async (req, res) => {
  const { gameType, session, roundId, outcome } = req.body;
  const role = req.user?.role; // 'admin' or 'super_admin'

  if (!gameType || !roundId) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  // Get active session
  let timeLeft = 0;
  let gameObj = null;
  if (gameType === 'colour') {
    const key = String(session || '1m').toLowerCase();
    gameObj = currentColourGames[key];
    if (gameObj && gameObj.gameId === roundId) {
      timeLeft = gameObj.timeLeft;
    }
  } else if (gameType === 'dice') {
    gameObj = currentDiceGame;
    if (gameObj && gameObj.gameId === roundId) {
      timeLeft = gameObj.timeLeft;
    }
  }

  // All administrative override requests remain active up until exactly 2 seconds before countdown hits zero
  const limit = 2;
  if (timeLeft < limit) {
    return res.status(400).json({ error: `Cannot override when remaining time is less than ${limit} seconds.` });
  }

  // Support Clearing Overrides
  if (outcome === null || outcome === 'CLEAR' || String(outcome).trim() === '') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'UPDATE game_rounds SET outcome = NULL WHERE round_id = ?',
        [roundId]
      );
      if (gameObj) {
        gameObj.forcedOutcome = null;
        gameObj.forcedByRole = null;
      }
      await connection.commit();
      return res.json({ message: 'Override cleared successfully', outcome: null });
    } catch (err) {
      await connection.rollback();
      logger.error(err, 'Failed to clear override');
      return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      connection.release();
    }
  }

  // Perform database INSERT/UPDATE
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rounds] = await connection.query(
      'SELECT id, game_id, status FROM game_rounds WHERE round_id = ?',
      [roundId]
    );

    let finalOutcome = String(outcome).trim();
    if (gameType === 'colour') {
      // Map color string to number + color format if outcome is not already formatted
      if (!/^\d+\s+[A-Z]+$/.test(finalOutcome)) {
        let winNumber, winColor;
        if (['red', 'green', 'violet'].includes(finalOutcome.toLowerCase())) {
          winColor = finalOutcome.toLowerCase();
          winNumber = winColor === 'violet' ? 5 : winColor === 'green' ? 2 : 1; 
        } else {
          winNumber = parseInt(finalOutcome, 10);
          winColor = (winNumber === 5 || winNumber === 10 || winNumber === 0) ? 'violet' : ([2, 4, 6, 8].includes(winNumber) ? 'green' : 'red');
        }
        finalOutcome = `${winNumber} ${winColor.toUpperCase()}`;
      }
    }

    if (rounds.length > 0) {
      if (rounds[0].status === 'completed') {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot override a completed round.' });
      }
      await connection.query(
        'UPDATE game_rounds SET outcome = ? WHERE round_id = ?',
        [finalOutcome, roundId]
      );
    } else {
      let gameId = 2;
      if (gameType === 'colour') {
        const key = String(session || '1m').toLowerCase();
        if (key === '30s') gameId = 1;
        else if (key === '1m') gameId = 2;
        else if (key === '2m') gameId = 3;
        else if (key === '5m') gameId = 4;
      } else {
        const [games] = await connection.query('SELECT id FROM games WHERE name = "dice" LIMIT 1');
        gameId = games[0]?.id || 5;
      }

      await connection.query(
        'INSERT INTO game_rounds (game_id, round_id, server_seed, outcome, status) VALUES (?, ?, "MANUAL_OVERRIDE_SEED", ?, "active")',
        [gameId, roundId, finalOutcome]
      );
    }

    // Save/update outcome directly on memory structure matching user instructions
    if (gameObj) {
      gameObj.forcedOutcome = finalOutcome;
      gameObj.forcedByRole = role; // 'admin' or 'super_admin'
    }

    await connection.commit();
    return res.json({ message: 'Outcome overwritten successfully', outcome: finalOutcome });
  } catch (err) {
    await connection.rollback();
    logger.error(err, 'Failed to overwrite outcome');
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
};

export const broadcastLeaderboard = async () => {
  try {
    if (!ioInstance) return;
    await pool.query('SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED');
    const [rows] = await pool.query(
      'SELECT u.name as username, SUM(b.payout_amount - b.bet_amount) as total_profit ' +
      'FROM users u JOIN bets b ON u.id = b.user_id ' +
      'WHERE b.status = "won" ' +
      'GROUP BY u.id ORDER BY total_profit DESC LIMIT 10'
    );
    const leaderboard = rows.map((r, index) => ({
      rank: index + 1,
      name: r.username,
      prize: `₹${parseFloat(r.total_profit || 0).toLocaleString()}`,
      badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null
    }));
    ioInstance.emit('leaderboard_update', leaderboard);
  } catch (err) {
    logger.error(err, 'Failed to broadcast leaderboard');
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    await pool.query('SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED');
    const [rows] = await pool.query(
      'SELECT u.name as username, SUM(b.payout_amount - b.bet_amount) as total_profit ' +
      'FROM users u JOIN bets b ON u.id = b.user_id ' +
      'WHERE b.status = "won" ' +
      'GROUP BY u.id ORDER BY total_profit DESC LIMIT 10'
    );
    const leaderboard = rows.map((r, index) => ({
      rank: index + 1,
      name: r.username,
      prize: `₹${parseFloat(r.total_profit || 0).toLocaleString()}`,
      badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null
    }));
    return res.json(leaderboard);
  } catch (err) {
    logger.error(err, 'Failed to fetch leaderboard');
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const settleRoundBetsInBulk = async (connection, settledBetsDetails, outcomeStr, gameId, statGameType) => {
  if (!settledBetsDetails || settledBetsDetails.length === 0) return;

  const winningBets = settledBetsDetails.filter(b => b.won);
  const losingBets = settledBetsDetails.filter(b => !b.won);

  // 1. Bulk update losing bets
  if (losingBets.length > 0) {
    const losingIds = losingBets.map(b => b.id);
    const chunkSize = 500;
    for (let i = 0; i < losingIds.length; i += chunkSize) {
      const chunk = losingIds.slice(i, i + chunkSize);
      await connection.query(
        'UPDATE bets SET status = "lost", outcome = ?, is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id IN (?) AND status = "pending"',
        [outcomeStr, chunk]
      );
    }
  }

  // 2. Bulk update winning bets
  if (winningBets.length > 0) {
    const winningIds = winningBets.map(b => b.id);
    const chunkSize = 500;
    for (let i = 0; i < winningIds.length; i += chunkSize) {
      const chunkIds = winningIds.slice(i, i + chunkSize);
      const chunkBets = winningBets.slice(i, i + chunkSize);
      
      let sql = 'UPDATE bets SET status = "won", is_settled = 1, settled_at = CURRENT_TIMESTAMP, outcome = ?, payout_amount = CASE id ';
      const params = [outcomeStr];
      for (const bet of chunkBets) {
        sql += 'WHEN ? THEN ? ';
        params.push(bet.id, bet.payout);
      }
      sql += 'END WHERE id IN (?) AND status = "pending"';
      params.push(chunkIds);
      
      await connection.query(sql, params);
    }

    // Group payouts by user_id
    const userWinnings = {};
    for (const bet of winningBets) {
      const uId = bet.user_id;
      if (!userWinnings[uId]) {
        userWinnings[uId] = {
          userId: uId,
          totalPayout: 0,
          totalRealWin: 0,
          totalBonusWin: 0,
          bets: []
        };
      }
      userWinnings[uId].bets.push(bet);
    }

    const winUserIds = Object.keys(userWinnings).map(Number);
    if (winUserIds.length > 0) {
      // 3. Lock all user wallets at once!
      const [wallets] = await connection.query(
        'SELECT id, user_id, balance, bonus_balance, required_wager FROM wallets WHERE user_id IN (?) FOR UPDATE',
        [winUserIds]
      );

      const walletMap = {};
      for (const w of wallets) {
        walletMap[w.user_id] = w;
      }

      const walletUpdates = [];
      const transactionInserts = [];
      const statsUpdates = [];
      const gameStatsInserts = [];
      const notificationsToSend = [];

      for (const uId of winUserIds) {
        const w = walletMap[uId];
        if (!w) continue;

        const currentBalance = parseFloat(w.balance);
        const currentBonusBalance = parseFloat(w.bonus_balance);
        const currentRequiredWager = parseFloat(w.required_wager);

        let totalRealWin = 0;
        let totalBonusWin = 0;
        let totalPayout = 0;

        const uBets = userWinnings[uId].bets;
        for (const bet of uBets) {
          const payout = bet.payout;
          totalPayout += payout;

          let realWin = payout;
          let bonusWin = 0;

          if (currentRequiredWager > 0 && parseFloat(bet.bonus_used) > 0) {
            const totalUsed = parseFloat(bet.real_used) + parseFloat(bet.bonus_used);
            const realRatio = totalUsed > 0 ? parseFloat(bet.real_used) / totalUsed : 1;
            realWin = parseFloat((payout * realRatio).toFixed(4));
            bonusWin = parseFloat((payout - realWin).toFixed(4));
          }

          totalRealWin += realWin;
          totalBonusWin += bonusWin;

          // Prepare ledger transaction row
          transactionInserts.push([
            uId,
            w.id,
            payout,
            'bet_payout',
            'bets',
            bet.id,
            currentBalance,
            parseFloat((currentBalance + totalRealWin).toFixed(4)),
            `Bet win payout of ₹${payout} for round ${gameId}`
          ]);
        }

        const newBalance = parseFloat((currentBalance + totalRealWin).toFixed(4));
        const newBonusBalance = parseFloat((currentBonusBalance + totalBonusWin).toFixed(4));

        walletUpdates.push({
          userId: uId,
          balance: newBalance,
          bonus_balance: newBonusBalance
        });

        statsUpdates.push({
          userId: uId,
          payout: totalPayout
        });

        gameStatsInserts.push([
          uId,
          statGameType,
          1,
          totalPayout
        ]);

        if (totalPayout >= 500) {
          notificationsToSend.push({
            userId: uId,
            title: 'Big Win Celebration! 🎉',
            message: `Congratulations! You won ₹${totalPayout} in ${statGameType.startsWith('colour') ? 'Colour Prediction' : 'Dice Pro'} round ${gameId}.`
          });
        }
      }

      // 4. Bulk update wallets
      if (walletUpdates.length > 0) {
        const uids = walletUpdates.map(u => u.userId);
        let sql = 'UPDATE wallets SET balance = CASE user_id ';
        const params = [];
        for (const u of walletUpdates) {
          sql += 'WHEN ? THEN ? ';
          params.push(u.userId, u.balance);
        }
        sql += 'END, bonus_balance = CASE user_id ';
        for (const u of walletUpdates) {
          sql += 'WHEN ? THEN ? ';
          params.push(u.userId, u.bonus_balance);
        }
        sql += 'END WHERE user_id IN (?)';
        params.push(uids);

        await connection.query(sql, params);
      }

      // 5. Bulk insert wallet transactions
      if (transactionInserts.length > 0) {
        await connection.query(
          'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) VALUES ?',
          [transactionInserts]
        );
      }

      // 6. Bulk update user stats
      if (statsUpdates.length > 0) {
        const uids = statsUpdates.map(u => u.userId);
        let sql = 'UPDATE user_stats SET total_winnings_won = total_winnings_won + CASE user_id ';
        const params = [];
        for (const u of statsUpdates) {
          sql += 'WHEN ? THEN ? ';
          params.push(u.userId, u.payout);
        }
        sql += 'END WHERE user_id IN (?)';
        params.push(uids);

        await connection.query(sql, params);
      }

      // 7. Bulk insert/update user game stats
      if (gameStatsInserts.length > 0) {
        await connection.query(
          'INSERT INTO user_game_stats (user_id, game_type, games_won, total_won) VALUES ? ' +
          'ON DUPLICATE KEY UPDATE games_won = games_won + VALUES(games_won), total_won = total_won + VALUES(total_won)',
          [gameStatsInserts]
        );
      }

      // 8. Send notifications in parallel
      if (notificationsToSend.length > 0) {
        await Promise.all(
          notificationsToSend.map(n => 
            createNotification(n.userId, n.title, n.message, 'GAME', connection)
              .catch(err => logger.error(err, `Failed to send bulk win notification for user ${n.userId}`))
          )
        );
      }
    }
  }
};

// Cryptographic game center configuration getters
export const getMultipliers = async (conn = null) => {
  const q = conn ? conn.query.bind(conn) : query;
  try {
    const rows = await q(
      'SELECT config_key, config_value FROM system_configs WHERE config_key IN ("COLOUR_MULTIPLIER_GREEN", "COLOUR_MULTIPLIER_VIOLET", "COLOUR_MULTIPLIER_RED", "DICE_HOUSE_FEE")'
    );
    const configMap = {};
    const actualRows = conn ? rows[0] : rows;
    if (Array.isArray(actualRows)) {
      actualRows.forEach(r => {
        configMap[r.config_key] = r.config_value;
      });
    }
    return {
      green: configMap['COLOUR_MULTIPLIER_GREEN'] ? parseFloat(configMap['COLOUR_MULTIPLIER_GREEN']) : 2.0,
      violet: configMap['COLOUR_MULTIPLIER_VIOLET'] ? parseFloat(configMap['COLOUR_MULTIPLIER_VIOLET']) : 4.5,
      red: configMap['COLOUR_MULTIPLIER_RED'] ? parseFloat(configMap['COLOUR_MULTIPLIER_RED']) : 2.0,
      diceHouseFee: configMap['DICE_HOUSE_FEE'] ? parseFloat(configMap['DICE_HOUSE_FEE']) : 2.0
    };
  } catch (err) {
    logger.error(err, 'Failed to fetch multipliers, using defaults');
    return { green: 2.0, violet: 4.5, red: 2.0, diceHouseFee: 2.0 };
  }
};

// GET /api/games/multipliers (Public API)
export const getPublicMultipliers = async (req, res) => {
  try {
    const data = await getMultipliers();
    const [gameRows] = await pool.query('SELECT name, is_active FROM games');
    const activeStates = {};
    gameRows.forEach(r => {
      activeStates[r.name] = r.is_active === 1;
    });
    return res.json({
      ...data,
      activeStates
    });
  } catch (err) {
    logger.error(err, 'Failed to fetch public multipliers');
    return res.status(500).json({ error: 'Failed to retrieve multipliers.' });
  }
};

export const getWinLossStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Today's stats
    const [todayRow] = await pool.query(
      'SELECT COALESCE(SUM(payout_amount), 0) as totalWon, COALESCE(SUM(bet_amount), 0) as totalWagered ' +
      'FROM bets WHERE user_id = ? AND created_at >= DATE(NOW())',
      [userId]
    );

    // 2. Last week's (last 7 days) stats
    const [weekRow] = await pool.query(
      'SELECT COALESCE(SUM(payout_amount), 0) as totalWon, COALESCE(SUM(bet_amount), 0) as totalWagered ' +
      'FROM bets WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      [userId]
    );

    // 3. Last month's (last 30 days) stats
    const [monthRow] = await pool.query(
      'SELECT COALESCE(SUM(payout_amount), 0) as totalWon, COALESCE(SUM(bet_amount), 0) as totalWagered ' +
      'FROM bets WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [userId]
    );

    // 4. Lifetime aggregate stats
    const [lifetimeRow] = await pool.query(
      'SELECT COALESCE(SUM(payout_amount), 0) as totalWon, COALESCE(SUM(bet_amount), 0) as totalWagered, COUNT(id) as totalGames ' +
      'FROM bets WHERE user_id = ?',
      [userId]
    );

    const stats = {
      today: {
        won: parseFloat(todayRow[0].totalWon),
        wagered: parseFloat(todayRow[0].totalWagered),
        net: parseFloat((todayRow[0].totalWon - todayRow[0].totalWagered).toFixed(2))
      },
      week: {
        won: parseFloat(weekRow[0].totalWon),
        wagered: parseFloat(weekRow[0].totalWagered),
        net: parseFloat((weekRow[0].totalWon - weekRow[0].totalWagered).toFixed(2))
      },
      month: {
        won: parseFloat(monthRow[0].totalWon),
        wagered: parseFloat(monthRow[0].totalWagered),
        net: parseFloat((monthRow[0].totalWon - monthRow[0].totalWagered).toFixed(2))
      },
      lifetime: {
        won: parseFloat(lifetimeRow[0].totalWon),
        wagered: parseFloat(lifetimeRow[0].totalWagered),
        net: parseFloat((lifetimeRow[0].totalWon - lifetimeRow[0].totalWagered).toFixed(2)),
        totalGames: parseInt(lifetimeRow[0].totalGames || 0, 10)
      }
    };

    return res.json(stats);
  } catch (err) {
    logger.error(err, 'Failed to compute win-loss stats');
    return res.status(500).json({ error: 'Failed to retrieve game stats.' });
  }
};
