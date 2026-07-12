const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `      const data = await res.json();
      if (res.ok) alert('Force Override Success!');
      else alert('Override Failed: ' + data.error);`;

const replacementStr = `      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {}
      
      if (res.ok) {
        alert('Force Override Success!');
      } else {
        alert('Override Failed: ' + (data.error || res.statusText || 'HTTP Error ' + res.status));
      }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(path, content);
  console.log('ColourPrediction.jsx successfully updated with safe JSON error handling');
} else {
  console.log('Target string not found in ColourPrediction.jsx');
}
