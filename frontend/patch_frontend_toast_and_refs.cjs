const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF to prevent \r\n mismatches during replacement
content = content.replace(/\r\n/g, '\n');

// 1. Inject betsPlacedRef and gameIdRef right after the betsPlaced filter block
const oldFilterBlock = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => {
    if (!b) return false;
    const gType = b.gameType || b.game_type;
    const sess = b.session;
    const status = b.status;
    const roundIdMatch = String(b.roundId || b.round_id || b.gameRoundId || b.game_round_id) === String(gameId);
    return gType === 'colour' && String(sess).toLowerCase() === String(activeSession).toLowerCase() && status === 'pending' && roundIdMatch;
  })`;

const newFilterBlock = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => {
    if (!b) return false;
    const gType = b.gameType || b.game_type;
    const sess = b.session;
    const status = b.status;
    const roundIdMatch = String(b.roundId || b.round_id || b.gameRoundId || b.game_round_id) === String(gameId);
    return gType === 'colour' && String(sess).toLowerCase() === String(activeSession).toLowerCase() && status === 'pending' && roundIdMatch;
  })

  const betsPlacedRef = useRef(betsPlaced);
  const gameIdRef = useRef(gameId);
  
  useEffect(() => {
    betsPlacedRef.current = betsPlaced;
    gameIdRef.current = gameId;
  }, [betsPlaced, gameId]);`;

if (content.includes(oldFilterBlock)) {
  content = content.replace(oldFilterBlock, newFilterBlock);
  console.log('betsPlacedRef and gameIdRef injected successfully');
} else {
  console.log('oldFilterBlock NOT found');
}

// 2. Replace the handleColourResult function in the useEffect hook
const oldHandleColourResult = `    const handleColourResult = (e) => {
      const data = e.detail;
      const key = activeSessionRef.current;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();
    }`;

const newHandleColourResult = `    const handleColourResult = (e) => {
      const data = e.detail;
      const key = activeSessionRef.current;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();

      // Show win/loss toast details based on the betsPlacedRef wagers
      const currentBets = betsPlacedRef.current || [];
      if (currentBets.length > 0) {
        let totalWon = 0;
        let totalInvested = 0;
        let hasActiveBets = false;

        for (const bet of currentBets) {
          const betRoundId = bet.roundId || bet.round_id || bet.gameRoundId || bet.game_round_id;
          if (String(betRoundId) === String(data.gameId)) {
            hasActiveBets = true;
            const amount = getBetAmount(bet);
            totalInvested += amount;

            let won = false;
            let multiplier = parseFloat(bet.multiplier || bet.payout_multiplier || 1.9);

            const bType = getBetType(bet);
            const bVal = getBetValue(bet);

            if (bType === 'number') {
              won = parseInt(bVal, 10) === data.outcome;
              multiplier = 8.0;
            } else if (bType === 'colour') {
              const chosenColor = String(bVal).toLowerCase();
              const winColor = String(data.details.colour).toLowerCase();
              const winNum = data.outcome;

              if (winNum === 5) {
                if (chosenColor === 'violet') {
                  won = true;
                  multiplier = 4.5;
                } else if (chosenColor === 'green') {
                  won = true;
                  multiplier = 1.5;
                }
              } else if (winNum === 10) {
                if (chosenColor === 'violet') {
                  won = true;
                  multiplier = 4.5;
                } else if (chosenColor === 'red') {
                  won = true;
                  multiplier = 1.5;
                }
              } else {
                won = chosenColor === winColor;
                multiplier = chosenColor === 'violet' ? 4.5 : 1.9;
              }
            }

            if (won) {
              totalWon += amount * multiplier;
            }
          }
        }

        if (hasActiveBets) {
          const netGain = totalWon - totalInvested;
          const userWon = netGain >= 0;
          setToastResult({
            won: userWon,
            amount: Math.abs(netGain)
          });
          setTimeout(() => setToastResult(null), 4000);
        }
      }
    }`;

if (content.includes(oldHandleColourResult)) {
  content = content.replace(oldHandleColourResult, newHandleColourResult);
  console.log('handleColourResult function successfully updated');
} else {
  console.log('oldHandleColourResult NOT found');
}

fs.writeFileSync(path, content);
console.log('Frontend toast and refs patching complete.');
