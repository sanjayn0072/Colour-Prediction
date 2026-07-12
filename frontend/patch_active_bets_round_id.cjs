const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldBetsPlaced = `  // Derive active bets directly from database betsList where status is pending
  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending')`;

const newBetsPlaced = `  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => b.gameType === 'colour' && b.session === activeSession && b.status === 'pending' && b.roundId === gameId)`;

if (content.includes(oldBetsPlaced)) {
  content = content.replace(oldBetsPlaced, newBetsPlaced);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully patched with active bets round filter');
