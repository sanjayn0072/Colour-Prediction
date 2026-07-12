const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `  // Listen to game result events from socket layer
  useEffect(() => {
    const handleColourResult = (e) => {
      const data = e.detail;
      const key = currentSession;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();
    }
    
    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === currentSession)) {
        setSelectedTargets([]);
        setBetAmount('');
        setTotalBetAmount(0);
      }
    }`;

const newBlock = `  // Listen to game result events from socket layer
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

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully fixed.');
