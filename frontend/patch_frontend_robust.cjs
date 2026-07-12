const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF to prevent \r\n mismatches during replacement
content = content.replace(/\r\n/g, '\n');

// 1. Update NUMBER_COLOR_MAP
const oldColorMap = `const NUMBER_COLOR_MAP = {
  1: 'red',      // odd = red
  2: 'emerald',  // even = green
  3: 'red',      // odd = red
  4: 'emerald',  // even = green
  5: 'purple',   // violet
  6: 'emerald',  // even = green
  7: 'red',      // odd = red
  8: 'emerald',  // even = green
  9: 'red',      // odd = red
  10: 'purple',  // violet
}`;

const newColorMap = `const NUMBER_COLOR_MAP = {
  0: 'purple',   // fallback for legacy 0 = violet/10
  1: 'red',      // odd = red
  2: 'emerald',  // even = green
  3: 'red',      // odd = red
  4: 'emerald',  // even = green
  5: 'purple',   // violet
  6: 'emerald',  // even = green
  7: 'red',      // odd = red
  8: 'emerald',  // even = green
  9: 'red',      // odd = red
  10: 'purple',  // violet
}`;

if (content.includes(oldColorMap)) {
  content = content.replace(oldColorMap, newColorMap);
  console.log('NUMBER_COLOR_MAP fallback successfully updated');
} else {
  // Let's do simple regex replacement if exact match failed
  content = content.replace(/const NUMBER_COLOR_MAP = \{([^}]+)\}/, `const NUMBER_COLOR_MAP = {
  0: 'purple',   // fallback for legacy 0 = violet/10
  1: 'red',      // odd = red
  2: 'emerald',  // even = green
  3: 'red',      // odd = red
  4: 'emerald',  // even = green
  5: 'purple',   // violet
  6: 'emerald',  // even = green
  7: 'red',      // odd = red
  8: 'emerald',  // even = green
  9: 'red',      // odd = red
  10: 'purple',  // violet
}`);
  console.log('NUMBER_COLOR_MAP regex updated');
}

// 2. Inject helper functions
const oldStartSegment = `export default function ColourPrediction({ onNavigate, routeData }) {\n  const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()`;
const newStartSegment = `export default function ColourPrediction({ onNavigate, routeData }) {
  const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()

  const getBetType = (b) => {
    if (!b) return '';
    return b.betType || b.bet_type || (b.bet_color !== undefined || b.color !== undefined ? 'colour' : (b.bet_number !== undefined || b.number !== undefined ? 'number' : ''));
  };

  const getBetValue = (b) => {
    if (!b) return '';
    const val = b.betValue !== undefined ? b.betValue : (b.bet_value !== undefined ? b.bet_value : (b.bet_color !== undefined ? b.bet_color : (b.color !== undefined ? b.color : (b.bet_number !== undefined ? b.bet_number : (b.number !== undefined ? b.number : '')))));
    return val !== undefined && val !== null ? String(val) : '';
  };

  const getBetAmount = (b) => {
    if (!b) return 0;
    const amt = b.betAmount !== undefined ? b.betAmount : (b.bet_amount !== undefined ? b.bet_amount : (b.amount !== undefined ? b.amount : 0));
    return parseFloat(amt) || 0;
  };`;

if (content.includes(oldStartSegment)) {
  content = content.replace(oldStartSegment, newStartSegment);
  console.log('getBet helpers successfully injected');
}

// 3. Update betsPlaced derivation
const oldBetsPlacedDerivation = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID\n  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending' && b.roundId === gameId)`;
const newBetsPlacedDerivation = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => {
    if (!b) return false;
    const gType = b.gameType || b.game_type;
    const sess = b.session;
    const status = b.status;
    const roundIdMatch = String(b.roundId || b.round_id || b.gameRoundId || b.game_round_id) === String(gameId);
    return gType === 'colour' && String(sess).toLowerCase() === String(activeSession).toLowerCase() && status === 'pending' && roundIdMatch;
  })`;

if (content.includes(oldBetsPlacedDerivation)) {
  content = content.replace(oldBetsPlacedDerivation, newBetsPlacedDerivation);
  console.log('betsPlaced derivation updated successfully');
}

// 4. Update getWagerCountForTarget
const oldWagerCount = `  const getWagerCountForTarget = (type, val) => {
    return betsPlaced
      .filter((bet) => bet.betType === type && String(bet.betValue).toLowerCase() === String(val).toLowerCase())
      .reduce((sum, bet) => sum + bet.betAmount, 0)
  }`;
const newWagerCount = `  const getWagerCountForTarget = (type, val) => {
    return betsPlaced
      .filter((bet) => getBetType(bet) === type && String(getBetValue(bet)).toLowerCase() === String(val).toLowerCase())
      .reduce((sum, bet) => sum + getBetAmount(bet), 0)
  }`;

if (content.includes(oldWagerCount)) {
  content = content.replace(oldWagerCount, newWagerCount);
  console.log('getWagerCountForTarget successfully updated');
}

// 5. Update active bets pill list rendering (using regex to make sure we match it regardless of exact whitespace)
const activeBetsRegex = /\{betsPlaced\.map\(\(b, idx\)\s*=>\s*\(\s*<div key=\{idx\}[^>]*>[\s\S]*?<\/div>\s*\)\)\}/;
const newActiveBetsList = `{betsPlaced.map((b, idx) => {
                  const bType = getBetType(b);
                  const bVal = getBetValue(b) || 'N/A';
                  const bAmt = getBetAmount(b);
                  return (
                    <div key={idx} className="bg-white border border-emerald-200/45 px-2 py-1 rounded-xl text-slate-600 flex items-center gap-1.5 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                      <span className="font-extrabold">{bType === 'colour' ? bVal.toUpperCase() : \`#\${bVal}\`}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-600 font-black font-mono">₹{bAmt}</span>
                    </div>
                  );
                })}`;

if (activeBetsRegex.test(content)) {
  content = content.replace(activeBetsRegex, newActiveBetsList);
  console.log('Active bets pill list successfully updated');
} else {
  console.log('Active bets pill list NOT found by regex');
}

// 6. Update toast win/loss calculations
const toastCalcRegex = /\/\/ Show win\/loss toast details based on the betsPlacedRef wagers[\s\S]*?\}\s*\}\s*\}\s*\}\n\s*\}\n\s*const handleRoundEnded =/m;

const newResultDetails = `// Show win/loss toast details based on the betsPlacedRef wagers
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
    }

    const handleRoundEnded =`;

if (toastCalcRegex.test(content)) {
  content = content.replace(toastCalcRegex, newResultDetails);
  console.log('Toast win/loss calculation successfully updated');
} else {
  console.log('Toast win/loss calculation NOT found by regex');
}

// 7. Update bottom history tab map
const oldHistoryWagersTab = `                      target: b.betType === 'colour' ? b.betValue.toUpperCase() : \`#\${b.betValue}\`,\n                      wager: b.betAmount,`;
const newHistoryWagersTab = `                      target: getBetType(b) === 'colour' ? (getBetValue(b) || 'N/A').toUpperCase() : \`#\${getBetValue(b) || 'N/A'}\`,
                      wager: getBetAmount(b),`;

if (content.includes(oldHistoryWagersTab)) {
  content = content.replace(oldHistoryWagersTab, newHistoryWagersTab);
  console.log('Bottom history tab wagers successfully updated');
}

// 8. Restore standard Windows CRLF if that was the original format, or write LF (Git will auto-convert anyway)
fs.writeFileSync(path, content);
console.log('Robust frontend patching complete.');
