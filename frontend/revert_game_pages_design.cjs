const fs = require('fs');

function revertFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(filePath + ' does not exist');
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const startIndex = content.indexOf('<style>{`');
  const endMarker = 'bg-[size:24px_24px] pointer-events-none" />';
  const endIndex = content.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const finalEndIndex = endIndex + endMarker.length;
    content = content.slice(0, startIndex) + content.slice(finalEndIndex);
    console.log(filePath + ' successfully reverted!');
  } else {
    console.log(filePath + ' markers NOT found');
  }

  fs.writeFileSync(filePath, content);
}

revertFile('C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx');
revertFile('C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/DiceGame.jsx');
