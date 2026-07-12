const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

const oldAdminHudNumbers = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

const newAdminHudNumbers = `             <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

if (content.includes(oldAdminHudNumbers)) {
  content = content.replace(oldAdminHudNumbers, newAdminHudNumbers);
  console.log('Admin HUD numbers successfully updated to 1-10!');
} else {
  console.log('oldAdminHudNumbers NOT found');
}

fs.writeFileSync(path, content);
console.log('Completed.');
