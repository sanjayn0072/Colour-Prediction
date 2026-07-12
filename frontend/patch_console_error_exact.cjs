const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use exact string replacement to update handleColourResult
const oldColourResult = `    const handleColourResult = (e) => {
      const data = e.detail;
      const key = currentSession;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();
    }`;

const newColourResult = `    const handleColourResult = (e) => {
      const data = e.detail;
      const key = activeSessionRef.current;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();
    }`;

content = content.replace(oldColourResult, newColourResult);

// Use exact string replacement to update handleRoundEnded
const oldRoundEnded = `    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === currentSession)) {
        setSelectedTargets([]);
        setBetAmount('');
        setTotalBetAmount(0);
      }
    }`;

const newRoundEnded = `    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === activeSessionRef.current)) {
        setSelectedTargets([]);
        setBetAmount('');
        setTotalBetAmount(0);
      }
    }`;

content = content.replace(oldRoundEnded, newRoundEnded);

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully fixed with exact string replace.');
