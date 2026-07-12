const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

const hookStr = `      socket.on('live_bet_metrics', (data) => {
         if (data && data.colour && data.colour[colourSessions[activeSession].gameId]) {
           setLiveMetrics(data.colour[colourSessions[activeSession].gameId]);
         }
      });`;

const newHookStr = `      socket.on('live_bet_metrics', (data) => {
         const currentRoundId = colourSessions[activeSession]?.gameId;
         if (data && data.colour && data.colour[currentRoundId]) {
           setLiveMetrics(data.colour[currentRoundId]);
         } else {
           setLiveMetrics({});
         }
      });`;

if (content.includes(hookStr)) {
  content = content.replace(hookStr, newHookStr);
  fs.writeFileSync(path, content);
  console.log('ColourPrediction.jsx patched successfully');
} else {
  console.log('ColourPrediction.jsx patch failed, string not found');
}
