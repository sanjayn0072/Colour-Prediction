import { generateServerSeed, hashSeed, generateOutcome } from '../utils/provablyFair.js';
import logger from '../utils/logger.js';
import { query, pool, mapKeys } from '../config/db.js';
import { assessUserRisk } from '../utils/riskEngine.js';

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

  const lockThreshold = gameType === 'colour' 
    ? (session === '30s' ? 5 : session === '1m' ? 10 : session === '2m' ? 15 : 30)
    : 5;

  if (activeGame.phase === 'locked' || activeGame.timeLeft <= lockThreshold) {
    return res.status(400).json({ error: 'Betting is locked for the current period' });
  }

  let multiplier = 1.0;
  if (gameType === 'colour') {
    if (betType === 'colour') {
      multiplier = betValue === 'violet' ? 4.5 : 1.9;
    } else if (betType === 'number') {
      multiplier = 8.0;
    }
  } else { // dice
    const target = parseFloat(betValue);
    let winChance = 50.0;
    if (betType === 'over') {
      winChance = 100 - target;
    } else if (betType === 'under') {
      winChance = target;
    } else if (betType === 'range') {
      winChance = 10.0;
    }
    multiplier = Math.max(1.03, Math.min(20.00, 98 / winChance));
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock user's wallet
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    if (!wallets || wallets.length === 0) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallets[0].balance);
    const currentBonusBalance = parseFloat(wallets[0].bonus_balance);
    const currentRequiredWager = parseFloat(wallets[0].required_wager);
    const totalAvailable = parseFloat((currentBalance + currentBonusBalance).toFixed(4));

    if (totalAvailable < betAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const realUsed = Math.min(currentBalance, betAmount);
    const bonusUsed = parseFloat((betAmount - realUsed).toFixed(4));

    let newBalance = parseFloat((currentBalance - realUsed).toFixed(4));
    let newBonusBalance = parseFloat((currentBonusBalance - bonusUsed).toFixed(4));
    let newRequiredWager = currentRequiredWager;

    if (currentRequiredWager > 0) {
      newRequiredWager = Math.max(0, parseFloat((currentRequiredWager - betAmount).toFixed(4)));
      if (newRequiredWager === 0) {
        // Convert remaining bonus balance to real balance!
        newBalance = parseFloat((newBalance + newBonusBalance).toFixed(4));
        newBonusBalance = 0;
      }
    }

    // 2. Update wallet balance, bonus balance, and required wager
    await connection.query(
      'UPDATE wallets SET balance = ?, bonus_balance = ?, required_wager = ? WHERE user_id = ?',
      [newBalance, newBonusBalance, newRequiredWager, req.user.id]
    );

    // 3. Find/Create Game record and get Game ID
    const gameName = gameType === 'colour' ? `colour_${session || '1m'}` : 'dice';
    const [games] = await connection.query('SELECT id FROM games WHERE name = ? LIMIT 1', [gameName]);
    const gameDbId = games[0]?.id || (gameType === 'colour' ? 2 : 5);

    // 4. Find or Create Game Round
    const [rounds] = await connection.query('SELECT id FROM game_rounds WHERE round_id = ? LIMIT 1', [activeGame.gameId]);
    let roundDbId;
    if (rounds.length > 0) {
      roundDbId = rounds[0].id;
    } else {
      const [roundResult] = await connection.query(
        'INSERT INTO game_rounds (game_id, round_id, server_seed, status) VALUES (?, ?, ?, "active")',
        [gameDbId, activeGame.gameId, activeGame.serverSeed]
      );
      roundDbId = roundResult.insertId;
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
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export let ioInstance = null;

export const initializeGameLoop = async (io) => {
  ioInstance = io;

  // Sync gameId values with the max values in database to prevent ER_DUP_ENTRY duplicate key errors on restart!
  try {
    const prefixes = {
      '30s': '3',
      '1m': '1',
      '2m': '2',
      '5m': '5'
    };
    
    for (const key of Object.keys(prefixes)) {
      const prefix = prefixes[key];
      const [maxRound] = await pool.query(
        'SELECT round_id FROM game_rounds WHERE round_id LIKE ? ORDER BY CAST(round_id AS UNSIGNED) DESC LIMIT 1',
        [`${prefix}%`]
      );
      if (maxRound && maxRound.length > 0) {
        const nextId = parseInt(maxRound[0].round_id, 10) + 1;
        currentColourGames[key].gameId = String(nextId);
        logger.info(`Synced ${key} Colour Prediction start gameId to: ${nextId}`);
      }
    }

    const [diceGames] = await pool.query('SELECT id FROM games WHERE name = "dice" LIMIT 1');
    const diceGameId = diceGames[0]?.id || 5;
    const [maxDiceRound] = await pool.query(
      'SELECT round_id FROM game_rounds WHERE game_id = ? ORDER BY CAST(round_id AS UNSIGNED) DESC LIMIT 1',
      [diceGameId]
    );
    if (maxDiceRound && maxDiceRound.length > 0) {
      const nextDiceId = parseInt(maxDiceRound[0].round_id, 10) + 1;
      currentDiceGame.gameId = String(nextDiceId);
      logger.info(`Synced Dice Pro start gameId to: ${nextDiceId}`);
    }
  } catch (err) {
    logger.error(err, 'Failed to sync game start round IDs from database');
  }

  setInterval(async () => {
    // ─── COLOUR PREDICTION COUNTDOWNS ───
    for (const key of Object.keys(currentColourGames)) {
      const game = currentColourGames[key];
      game.timeLeft--;
      
      const lockThreshold = key === '30s' ? 5 : key === '1m' ? 10 : key === '2m' ? 15 : 30;
      if (game.timeLeft <= lockThreshold) {
        game.phase = 'locked';
      }

      if (game.timeLeft <= 0) {
        const nonce = parseInt(game.gameId, 10);

        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

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
            if (rounds[0].outcome) {
              const parts = rounds[0].outcome.trim().split(' ');
              winNumber = parseInt(parts[0], 10);
              winColor = (parts[1] || 'RED').toLowerCase();
              logger.info(`[ADMIN OVERRIDE] Settling Colour round ${game.gameId} with manual outcome: ${winNumber} ${winColor.toUpperCase()}`);
            } else {
              const outcomeFloat = generateOutcome(game.serverSeed, game.clientSeed, nonce);
              winNumber = Math.floor((outcomeFloat / 100) * 10) + 1;
              winColor = (winNumber === 5 || winNumber === 10) ? 'violet' : (winNumber % 2 === 0 ? 'green' : 'red');
            }
            await connection.query(
              'UPDATE game_rounds SET outcome = ?, status = "completed", client_seed = ?, nonce = ? WHERE id = ?',
              [`${winNumber} ${winColor.toUpperCase()}`, game.clientSeed, nonce, roundDbId]
            );
          } else {
            const outcomeFloat = generateOutcome(game.serverSeed, game.clientSeed, nonce);
            winNumber = Math.floor((outcomeFloat / 100) * 10) + 1;
            winColor = (winNumber === 5 || winNumber === 10) ? 'violet' : (winNumber % 2 === 0 ? 'green' : 'red');

            const [games] = await connection.query('SELECT id FROM games WHERE name = ? LIMIT 1', [`colour_${key}`]);
            const gameDbId = games[0]?.id || 2;
            const [roundResult] = await connection.query(
              'INSERT INTO game_rounds (game_id, round_id, server_seed, client_seed, nonce, outcome, status) VALUES (?, ?, ?, ?, ?, ?, "completed")',
              [gameDbId, game.gameId, game.serverSeed, game.clientSeed, nonce, `${winNumber} ${winColor.toUpperCase()}`]
            );
            roundDbId = roundResult.insertId;
          }

          // 2. Fetch all pending bets for the round
          const [bets] = await connection.query(
            'SELECT id, user_id, bet_value, bet_type, bet_amount, payout_multiplier, real_used, bonus_used FROM bets WHERE game_round_id = ? AND status = "pending" FOR UPDATE',
            [roundDbId]
          );

          let totalBetAmount = 0;
          let totalWinningAmount = 0;
          let totalLossAmount = 0;

          for (const bet of bets) {
            const amount = parseFloat(bet.bet_amount);
            totalBetAmount += amount;

            let won = false;
            if (bet.bet_type === 'colour') {
              won = (bet.bet_value === winColor) || (winNumber === 5 && (bet.bet_value === 'red' || bet.bet_value === 'violet'));
            } else if (bet.bet_type === 'number') {
              won = parseInt(bet.bet_value, 10) === winNumber;
            }

            if (won) {
              const payout = parseFloat((amount * bet.payout_multiplier).toFixed(2));
              totalWinningAmount += payout;
            } else {
              totalLossAmount += amount;
            }
          }

          // Write outcome log
          await connection.query(
            'INSERT INTO color_prediction_history (game_round_id, winning_color, winning_number, total_bet_amount, total_winning_amount, total_loss_amount) VALUES (?, ?, ?, ?, ?, ?)',
            [roundDbId, winColor, winNumber, totalBetAmount, totalWinningAmount, totalLossAmount]
          );

          for (const bet of bets) {
            let won = false;
            if (bet.bet_type === 'colour') {
              won = (bet.bet_value === winColor) || (winNumber === 5 && (bet.bet_value === 'red' || bet.bet_value === 'violet'));
            } else if (bet.bet_type === 'number') {
              won = parseInt(bet.bet_value, 10) === winNumber;
            }

            const outcomeStr = `${winNumber} ${winColor.toUpperCase()}`;

            if (won) {
              const payout = parseFloat((bet.bet_amount * bet.payout_multiplier).toFixed(2));
              
              // Update bet status FIRST and check affected rows to avoid double-spend exploits
              const [updateResult] = await connection.query(
                'UPDATE bets SET status = "won", payout_amount = ?, outcome = ?, is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "pending"',
                [payout, outcomeStr, bet.id]
              );

              if (updateResult.affectedRows === 1) {
                // Get and lock wallet
                const [wallets] = await connection.query(
                  'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
                  [bet.user_id]
                );
                if (wallets.length > 0) {
                  const currentBalance = parseFloat(wallets[0].balance);
                  const currentBonusBalance = parseFloat(wallets[0].bonus_balance);
                  const currentRequiredWager = parseFloat(wallets[0].required_wager);

                  let realWin = payout;
                  let bonusWin = 0;

                  if (currentRequiredWager > 0 && parseFloat(bet.bonus_used) > 0) {
                    const totalUsed = parseFloat(bet.real_used) + parseFloat(bet.bonus_used);
                    const realRatio = totalUsed > 0 ? parseFloat(bet.real_used) / totalUsed : 1;
                    realWin = parseFloat((payout * realRatio).toFixed(4));
                    bonusWin = parseFloat((payout - realWin).toFixed(4));
                  }

                  const newBalance = parseFloat((currentBalance + realWin).toFixed(4));
                  const newBonusBalance = parseFloat((currentBonusBalance + bonusWin).toFixed(4));

                  await connection.query(
                    'UPDATE wallets SET balance = ?, bonus_balance = ? WHERE user_id = ?',
                    [newBalance, newBonusBalance, bet.user_id]
                  );

                  // Write to ledger
                  await connection.query(
                    'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
                    'VALUES (?, ?, ?, "bet_payout", "bets", ?, ?, ?, ?)',
                    [bet.user_id, wallets[0].id, payout, bet.id, currentBalance, newBalance, `Bet win payout of ₹${payout} for round ${game.gameId}`]
                  );

                  // Update statistics
                  await connection.query(
                    'UPDATE user_stats SET total_winnings_won = total_winnings_won + ? WHERE user_id = ?',
                    [payout, bet.user_id]
                  );

                  const statGameType = `colour_${key}`;
                  await connection.query(
                    'INSERT INTO user_game_stats (user_id, game_type, games_won, total_won) ' +
                    'VALUES (?, ?, 1, ?) ' +
                    'ON DUPLICATE KEY UPDATE games_won = games_won + 1, total_won = total_won + ?',
                    [bet.user_id, statGameType, payout, payout]
                  );
                }
              }
            } else {
              await connection.query(
                'UPDATE bets SET status = "lost", outcome = ?, is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "pending"',
                [outcomeStr, bet.id]
              );
            }
          }

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
            'WHERE gr.game_id = 1 AND gr.status = "completed" AND gr.round_id LIKE ? ' +
            'ORDER BY gr.created_at DESC LIMIT 20',
            [`${key.slice(0, 1)}%`]
          );

          io.to(`colour_room_${key}`).emit('GAME_RESULT', {
            gameType: 'colour',
            session: key,
            gameId: game.gameId,
            outcome: winNumber,
            details: { colour: winColor },
            serverSeed: game.serverSeed,
            history: recentHistory.map(h => ({ id: h.roundId, colour: h.winningColor, number: h.outcomeNumber }))
          });

          // Reset for next period
          game.gameId = String(parseInt(game.gameId, 10) + 1);
          game.timeLeft = game.maxTime;
          game.phase = 'betting';
          game.serverSeed = generateServerSeed();
          game.serverHash = hashSeed(game.serverSeed);
          
        } catch (err) {
          if (connection) await connection.rollback();
          logger.error(err, `Error settling Colour prediction round (${key})`);
          // Gracefully reset to prevent negative countdown loops on database errors
          game.gameId = String(parseInt(game.gameId, 10) + 1);
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
      const nonce = parseInt(currentDiceGame.gameId, 10);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Get or create game round row and lock it
        const [rounds] = await connection.query(
          'SELECT id, outcome FROM game_rounds WHERE round_id = ? FOR UPDATE',
          [currentDiceGame.gameId]
        );
        let roundDbId;
        let roll;
        if (rounds.length > 0) {
          roundDbId = rounds[0].id;
          if (rounds[0].outcome) {
            roll = parseFloat(rounds[0].outcome);
            logger.info(`[ADMIN OVERRIDE] Settling Dice round ${currentDiceGame.gameId} with manual outcome: ${roll.toFixed(2)}`);
          } else {
            roll = generateOutcome(currentDiceGame.serverSeed, currentDiceGame.clientSeed, nonce);
          }
          await connection.query(
            'UPDATE game_rounds SET outcome = ?, status = "completed", client_seed = ?, nonce = ? WHERE id = ?',
            [roll.toFixed(2), currentDiceGame.clientSeed, nonce, roundDbId]
          );
        } else {
          roll = generateOutcome(currentDiceGame.serverSeed, currentDiceGame.clientSeed, nonce);
          const [games] = await connection.query('SELECT id FROM games WHERE name = "dice" LIMIT 1');
          const gameDbId = games[0]?.id || 5;
          const [roundResult] = await connection.query(
            'INSERT INTO game_rounds (game_id, round_id, server_seed, client_seed, nonce, outcome, status) VALUES (?, ?, ?, ?, ?, ?, "completed")',
            [gameDbId, currentDiceGame.gameId, currentDiceGame.serverSeed, currentDiceGame.clientSeed, nonce, roll.toFixed(2)]
          );
          roundDbId = roundResult.insertId;
        }
        const winningColor = roll >= 50.00 ? 'green' : 'red';

        // 2. Fetch pending bets
        const [bets] = await connection.query(
          'SELECT id, user_id, bet_value, bet_type, bet_amount, payout_multiplier, real_used, bonus_used FROM bets WHERE game_round_id = ? AND status = "pending" FOR UPDATE',
          [roundDbId]
        );

        let totalBetAmount = 0;
        let totalWinningAmount = 0;
        let totalLossAmount = 0;

        for (const bet of bets) {
          const amount = parseFloat(bet.bet_amount);
          totalBetAmount += amount;

          let won = false;
          const target = parseFloat(bet.bet_value);
          
          if (bet.bet_type === 'over') {
            won = roll > target;
          } else if (bet.bet_type === 'under') {
            won = roll < target;
          } else if (bet.bet_type === 'range') {
            won = roll >= target && roll <= (target + 10);
          }

          if (won) {
            const payout = parseFloat((amount * bet.payout_multiplier).toFixed(2));
            totalWinningAmount += payout;
          } else {
            totalLossAmount += amount;
          }
        }

        // Write outcome log
        await connection.query(
          'INSERT INTO dice_game_history (game_round_id, roll_number, outcome_type, total_bet_amount, total_winning_amount, total_loss_amount) VALUES (?, ?, ?, ?, ?, ?)',
          [roundDbId, Math.floor(roll), roll >= 50.00 ? 'high' : 'low', totalBetAmount, totalWinningAmount, totalLossAmount]
        );

        for (const bet of bets) {
          let won = false;
          const target = parseFloat(bet.bet_value);
          
          if (bet.bet_type === 'over') {
            won = roll > target;
          } else if (bet.bet_type === 'under') {
            won = roll < target;
          } else if (bet.bet_type === 'range') {
            won = roll >= target && roll <= (target + 10);
          }

          const outcomeStr = roll.toFixed(2);

          if (won) {
            const payout = parseFloat((bet.bet_amount * bet.payout_multiplier).toFixed(2));
            
            const [updateResult] = await connection.query(
              'UPDATE bets SET status = "won", payout_amount = ?, outcome = ?, is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "pending"',
              [payout, outcomeStr, bet.id]
            );

            if (updateResult.affectedRows === 1) {
              // Lock user wallet
              const [wallets] = await connection.query(
                'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
                [bet.user_id]
              );
              if (wallets.length > 0) {
                const currentBalance = parseFloat(wallets[0].balance);
                const currentBonusBalance = parseFloat(wallets[0].bonus_balance);
                const currentRequiredWager = parseFloat(wallets[0].required_wager);

                let realWin = payout;
                let bonusWin = 0;

                if (currentRequiredWager > 0 && parseFloat(bet.bonus_used) > 0) {
                  const totalUsed = parseFloat(bet.real_used) + parseFloat(bet.bonus_used);
                  const realRatio = totalUsed > 0 ? parseFloat(bet.real_used) / totalUsed : 1;
                  realWin = parseFloat((payout * realRatio).toFixed(4));
                  bonusWin = parseFloat((payout - realWin).toFixed(4));
                }

                const newBalance = parseFloat((currentBalance + realWin).toFixed(4));
                const newBonusBalance = parseFloat((currentBonusBalance + bonusWin).toFixed(4));

                await connection.query(
                  'UPDATE wallets SET balance = ?, bonus_balance = ? WHERE user_id = ?',
                  [newBalance, newBonusBalance, bet.user_id]
                );

                // Write to ledger
                await connection.query(
                  'INSERT INTO wallet_transactions (user_id, wallet_id, amount, type, reference_table, reference_id, balance_before, balance_after, description) ' +
                  'VALUES (?, ?, ?, "bet_payout", "bets", ?, ?, ?, ?)',
                  [bet.user_id, wallets[0].id, payout, bet.id, currentBalance, newBalance, `Bet win payout of ₹${payout} for round ${currentDiceGame.gameId}`]
                );

                // Update user statistics
                await connection.query(
                  'UPDATE user_stats SET total_winnings_won = total_winnings_won + ? WHERE user_id = ?',
                  [payout, bet.user_id]
                );

                await connection.query(
                  'INSERT INTO user_game_stats (user_id, game_type, games_won, total_won) ' +
                  'VALUES (?, "dice", 1, ?) ' +
                  'ON DUPLICATE KEY UPDATE games_won = games_won + 1, total_won = total_won + ?',
                  [bet.user_id, payout, payout]
                );
              }
            }
          } else {
             await connection.query(
               'UPDATE bets SET status = "lost", outcome = ?, is_settled = 1, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "pending"',
               [outcomeStr, bet.id]
             );
          }
        }

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
          'WHERE gr.game_id = 2 AND gr.status = "completed" ' +
          'ORDER BY gr.created_at DESC LIMIT 20'
        );

        io.to('dice_room').emit('GAME_RESULT', {
          gameType: 'dice',
          gameId: currentDiceGame.gameId,
          outcomeNumber: roll,
          winningColor: winningColor,
          serverSeed: currentDiceGame.serverSeed,
          history: recentHistory.map(h => ({ id: h.roundId, roll: h.rollNumber, won: h.rollNumber >= 50 }))
        });

        // Reset for next period
        currentDiceGame.gameId = String(parseInt(currentDiceGame.gameId, 10) + 1);
        currentDiceGame.timeLeft = currentDiceGame.maxTime;
        currentDiceGame.phase = 'betting';
        currentDiceGame.serverSeed = generateServerSeed();
        currentDiceGame.serverHash = hashSeed(currentDiceGame.serverSeed);
        
      } catch (err) {
        if (connection) await connection.rollback();
        logger.error(err, 'Error settling Dice Pro round');
        // Gracefully reset to prevent negative countdown loops on database errors
        currentDiceGame.gameId = String(parseInt(currentDiceGame.gameId, 10) + 1);
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: error.message });
  }
};

export const triggerSpin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Check user deposits and spin counts
    const [depositsResult] = await connection.query(
      'SELECT COALESCE(SUM(amount), 0) as totalDeposits FROM deposits WHERE user_id = ? AND status = "completed"',
      [req.user.id]
    );
    const totalDeposits = parseFloat(depositsResult[0].totalDeposits);

    const [statsResult] = await connection.query(
      'SELECT spins_count FROM user_stats WHERE user_id = ?',
      [req.user.id]
    );
    const spinsCount = statsResult[0]?.spins_count || 0;

    const totalSpinsEarned = Math.floor(totalDeposits / 200);
    const spinsLeft = totalSpinsEarned - spinsCount;

    if (spinsLeft <= 0) {
      return res.status(400).json({ error: 'You do not have any lucky spins remaining. Deposit ₹200 or more to earn spins!' });
    }

    // 2. Ensure configs are seeded
    const [configsCheck] = await connection.query('SELECT COUNT(*) as count FROM spin_configs');
    if (configsCheck[0].count === 0) {
      const defaultPrizes = [
        { prize_name: 'Bonus ₹500', type: 'bonus', value: 500 },
        { prize_name: 'Cash ₹10', type: 'cash', value: 10 },
        { prize_name: 'Voucher 50%', type: 'empty', value: 0 },
        { prize_name: 'Cash ₹50', type: 'cash', value: 50 },
        { prize_name: 'Bonus ₹100', type: 'bonus', value: 100 },
        { prize_name: 'Voucher 25%', type: 'empty', value: 0 },
        { prize_name: 'Cash ₹20', type: 'cash', value: 20 },
        { prize_name: 'Bonus ₹250', type: 'bonus', value: 250 }
      ];
      for (const p of defaultPrizes) {
        await connection.query(
          'INSERT INTO spin_configs (prize_name, type, value, weight, is_active) VALUES (?, ?, ?, 100, 1)',
          [p.prize_name, p.type, p.value]
        );
      }
    }

    // 3. Fetch configurations
    const [spinPrizes] = await connection.query(
      'SELECT id, prize_name, type, value FROM spin_configs ORDER BY id ASC'
    );

    // 4. Roll a random segment
    const prizeIndex = Math.floor(Math.random() * 8);
    const selectedPrize = spinPrizes[prizeIndex];

    // 5. Lock and load user wallet
    const [wallets] = await connection.query(
      'SELECT id, balance, bonus_balance, required_wager FROM wallets WHERE user_id = ? FOR UPDATE',
      [req.user.id]
    );
    const wallet = wallets[0];
    const currentBalance = parseFloat(wallet.balance);
    const currentBonusBalance = parseFloat(wallet.bonus_balance);
    const currentRequiredWager = parseFloat(wallet.required_wager);
    const prizeVal = parseFloat(selectedPrize.value);

    let newBalance = currentBalance;
    let newBonusBalance = currentBonusBalance;
    let newRequiredWager = currentRequiredWager;
    let bonusId = null;

    if (selectedPrize.type === 'cash') {
      newBalance = parseFloat((currentBalance + prizeVal).toFixed(4));
      await connection.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBalance, req.user.id]);
    } else if (selectedPrize.type === 'bonus') {
      newBonusBalance = parseFloat((currentBonusBalance + prizeVal).toFixed(4));
      const addedWager = prizeVal * 10;
      newRequiredWager = parseFloat((currentRequiredWager + addedWager).toFixed(4));
      await connection.query(
        'UPDATE wallets SET bonus_balance = ?, required_wager = ? WHERE user_id = ?',
        [newBonusBalance, newRequiredWager, req.user.id]
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

    await connection.commit();

    return res.json({
      message: `You won: ${selectedPrize.prize_name}`,
      prizeIndex,
      type: selectedPrize.type,
      value: selectedPrize.type === 'empty' ? (prizeIndex === 2 ? 'SPIN50' : 'LUCKY25') : prizeVal,
      walletBalance: newBalance,
      bonusBalance: newBonusBalance
    });

  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};
