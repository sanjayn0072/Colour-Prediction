const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add shouldHighlight helper function in state section
const oldHookDef = `  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const [adminConfirmModal, setAdminConfirmModal] = useState(null); // { type, val }`;

const newHookDef = `  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const [adminConfirmModal, setAdminConfirmModal] = useState(null); // { type, val }

  const shouldHighlight = (type, val) => {
    if (!liveMetrics || !liveMetrics.forcedOutcome) return false;
    const forcedByRole = liveMetrics.forcedByRole;
    if (forcedByRole === 'admin') {
      if (user?.role !== 'super_admin') return false;
    } else if (forcedByRole === 'super_admin') {
      if (user?.role !== 'super_admin' && user?.role !== 'admin') return false;
    }

    const forced = String(liveMetrics.forcedOutcome).toLowerCase().trim();
    const cleanVal = String(val).toLowerCase().trim();

    if (type === 'colour') {
      if (forced === cleanVal) return true;
      if (forced.includes(' ') && forced.split(' ')[1].toLowerCase() === cleanVal) return true;
    } else if (type === 'number') {
      if (forced === cleanVal) return true;
      if (forced.split(' ')[0] === cleanVal) return true;
    }
    return false;
  };`;

if (content.includes(oldHookDef)) {
  content = content.replace(oldHookDef, newHookDef);
}

// 2. Update render button highlights
const oldColorButtons = `             <div className="flex gap-3 mb-4">
                <button onClick={() => handleAdminOverride('colour', 'red')} className="flex-1 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-red-400 font-bold text-xs">🔴 RED</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.red || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'green')} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-emerald-400 font-bold text-xs">🟢 GREEN</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.green || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'violet')} className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-purple-400 font-bold text-xs">🟣 VIOLET</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.violet || 0}</div>
                </button>
             </div>`;

const newColorButtons = `             <div className="flex gap-3 mb-4">
                <button onClick={() => handleAdminOverride('colour', 'red')} className={\`flex-1 bg-red-500/20 hover:bg-red-500/40 border \${shouldHighlight('colour', 'red') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-red-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-red-400 font-bold text-xs">🔴 RED</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.red || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'green')} className={\`flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border \${shouldHighlight('colour', 'green') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-emerald-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-emerald-400 font-bold text-xs">🟢 GREEN</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.green || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'violet')} className={\`flex-1 bg-purple-500/20 hover:bg-purple-500/40 border \${shouldHighlight('colour', 'violet') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-purple-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-purple-400 font-bold text-xs">🟣 VIOLET</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.violet || 0}</div>
                </button>
             </div>`;

if (content.includes(oldColorButtons)) {
  content = content.replace(oldColorButtons, newColorButtons);
}

const oldNumberButtons = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-2 text-center transition-all cursor-pointer">
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

const newNumberButtons = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

if (content.includes(oldNumberButtons)) {
  content = content.replace(oldNumberButtons, newNumberButtons);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully updated with selection highlights');
