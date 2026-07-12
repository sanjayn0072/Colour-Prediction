const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF to prevent \r\n mismatches during replacement
content = content.replace(/\r\n/g, '\n');

const oldBetsPlaced = `  // Derive active bets directly from database betsList where status is pending
  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending')`;

const newBetsPlaced = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
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

if (content.includes(oldBetsPlaced)) {
  content = content.replace(oldBetsPlaced, newBetsPlaced);
  console.log('betsPlaced and its refs successfully injected!');
} else {
  console.log('oldBetsPlaced NOT found');
}

fs.writeFileSync(path, content);
console.log('Completed.');
