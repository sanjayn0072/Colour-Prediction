const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/DiceGame.jsx';
let content = fs.readFileSync(path, 'utf8');

const hookStr = `      socket.on('live_bet_metrics', (data) => {
         if (data && data.dice && data.dice[diceRoundId]) {
           setLiveMetrics(data.dice[diceRoundId]);
         }
      });`;

const newHookStr = `      socket.on('live_bet_metrics', (data) => {
         if (data && data.dice && data.dice[diceRoundId]) {
           setLiveMetrics(data.dice[diceRoundId]);
         } else {
           setLiveMetrics({});
         }
      });`;

if (content.includes(hookStr)) {
  content = content.replace(hookStr, newHookStr);
  fs.writeFileSync(path, content);
  console.log('DiceGame.jsx patched successfully');
} else {
  console.log('DiceGame.jsx patch failed, string not found');
}
