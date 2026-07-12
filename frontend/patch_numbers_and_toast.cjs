const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update the betsPlacedRef and gameIdRef declarations right after defining them
const oldBetsPlacedBlock = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending' && b.roundId === gameId)`;

const newBetsPlacedBlock = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending' && b.roundId === gameId)
  
  const betsPlacedRef = useRef(betsPlaced);
  const gameIdRef = useRef(gameId);
  
  useEffect(() => {
    betsPlacedRef.current = betsPlaced;
    gameIdRef.current = gameId;
  }, [betsPlaced, gameId]);`;

if (content.includes(oldBetsPlacedBlock)) {
  content = content.replace(oldBetsPlacedBlock, newBetsPlacedBlock);
}

// 2. Update active bets list rendering code to use correct bet properties
const oldActiveBetsList = `                {betsPlaced.map((b, idx) => (
                  <div key={idx} className="bg-white border border-emerald-200/45 px-2 py-1 rounded-xl text-slate-600 flex items-center gap-1.5 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    <span className="font-extrabold">{b.type === 'colour' ? b.value.toUpperCase() : \`#\${b.value}\`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-600 font-black font-mono">₹{b.amount}</span>
                  </div>
                ))}`;

const newActiveBetsList = `                {betsPlaced.map((b, idx) => (
                  <div key={idx} className="bg-white border border-emerald-200/45 px-2 py-1 rounded-xl text-slate-600 flex items-center gap-1.5 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    <span className="font-extrabold">{b.betType === 'colour' ? b.betValue.toUpperCase() : \`#\${b.betValue}\`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-600 font-black font-mono">₹{parseFloat(b.betAmount)}</span>
                  </div>
                ))}`;

if (content.includes(oldActiveBetsList)) {
  content = content.replace(oldActiveBetsList, newActiveBetsList);
}

// 3. Update Admin HUD Number loop from [0..9] to [1..10]
const oldAdminHUDNumbers = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

const newAdminHUDNumbers = `             <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

if (content.includes(oldAdminHUDNumbers)) {
  content = content.replace(oldAdminHUDNumbers, newAdminHUDNumbers);
}

// 4. Update handleColourResult to calculate and trigger the win/loss toast
const oldHandleColourResult = `  // Listen to game result events from socket layer
  useEffect(() => {
    const handleColourResult = (e) => {
      const data = e.detail;
      const key = activeSessionRef.current;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();
    }
    
    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === activeSessionRef.current)) {
        setSelectedTargets([]);
        setBetAmount('');
        setTotalBetAmount(0);
      }
    }`;

const newHandleColourResult = `  // Listen to game result events from socket layer
  useEffect(() => {
    const handleColourResult = (e) => {
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
          if (String(bet.roundId) === String(data.gameId)) {
            hasActiveBets = true;
            const amount = parseFloat(bet.betAmount);
            totalInvested += amount;

            let won = false;
            let multiplier = parseFloat(bet.multiplier || 1.9);

            if (bet.betType === 'number') {
              won = parseInt(bet.betValue, 10) === data.outcome;
              multiplier = 8.0;
            } else if (bet.betType === 'colour') {
              const chosenColor = String(bet.betValue).toLowerCase();
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
    
    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === activeSessionRef.current)) {
        setSelectedTargets([]);
        setBetAmount('');
        setTotalBetAmount(0);
      }
    }`;

if (content.includes(oldHandleColourResult)) {
  content = content.replace(oldHandleColourResult, newHandleColourResult);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully patched with numbers mapping and toast results');
