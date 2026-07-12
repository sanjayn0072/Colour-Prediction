const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update highlights styles for color buttons
const oldColorButtons = `             <div className="flex gap-3 mb-4">
                <button onClick={() => handleAdminOverride('colour', 'red')} className={\`flex-1 bg-red-500/20 hover:bg-red-500/40 border \\\${shouldHighlight('colour', 'red') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-red-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-red-400 font-bold text-xs">🔴 RED</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.red || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'green')} className={\`flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border \\\${shouldHighlight('colour', 'green') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-emerald-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-emerald-400 font-bold text-xs">🟢 GREEN</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.green || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'violet')} className={\`flex-1 bg-purple-500/20 hover:bg-purple-500/40 border \\\${shouldHighlight('colour', 'violet') ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-purple-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-purple-400 font-bold text-xs">🟣 VIOLET</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.violet || 0}</div>
                </button>
             </div>`;

const newColorButtons = `             {/* Stealth Hierarchy Notification Badge */}
             {user?.role === 'super_admin' && liveMetrics.forcedOutcome && (
                <div className="bg-yellow-500/10 border border-yellow-500/35 text-yellow-500 text-[11px] font-black rounded-xl p-2.5 mb-4 text-center animate-pulse flex items-center justify-center gap-1.5 shadow-sm">
                  <Shield size={14} className="text-yellow-500 animate-spin" />
                  {liveMetrics.forcedByRole === 'admin' ? \`⚠️ Admin forced: \${liveMetrics.forcedOutcome}\` : \`⭐ Super Admin forced: \${liveMetrics.forcedOutcome}\`}
                </div>
             )}

             <div className="flex gap-3 mb-4">
                <button onClick={() => handleAdminOverride('colour', 'red')} className={\`flex-1 bg-red-500/20 hover:bg-red-500/40 border \${shouldHighlight('colour', 'red') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-red-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-red-400 font-bold text-xs">🔴 RED</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.red || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'green')} className={\`flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border \${shouldHighlight('colour', 'green') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-emerald-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-emerald-400 font-bold text-xs">🟢 GREEN</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.green || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'violet')} className={\`flex-1 bg-purple-500/20 hover:bg-purple-500/40 border \${shouldHighlight('colour', 'violet') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-purple-500/30'} rounded-xl p-2 transition-all cursor-pointer\`}>
                   <div className="text-purple-400 font-bold text-xs">🟣 VIOLET</div>
                   <div className="text-white font-mono mt-1">₹{liveMetrics.violet || 0}</div>
                </button>
             </div>`;

if (content.includes(oldColorButtons)) {
  content = content.replace(oldColorButtons, newColorButtons);
}

// 2. Update highlights styles for number buttons
const oldNumberButtons = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \\\${shouldHighlight('number', num) ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>`;

const newNumberButtons = `             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={\`bg-gray-800 hover:bg-gray-700 border \${shouldHighlight('number', num) ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] font-black border-transparent' : 'border-gray-700'} rounded-lg p-2 text-center transition-all cursor-pointer\`}>
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>

             {/* Auto-Algorithmic Profit Prediction Display */}
             {liveMetrics.naturalSystemWinner && (
                <div className="text-emerald-400 text-xs font-bold mt-4 text-center flex items-center justify-center gap-1.5 bg-emerald-500/10 py-2 rounded-xl border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  <Sparkles size={13} className="animate-pulse text-emerald-400" />
                  <span>🔮 System Auto-Pick: {liveMetrics.naturalSystemWinner}</span>
                </div>
             )}`;

if (content.includes(oldNumberButtons)) {
  content = content.replace(oldNumberButtons, newNumberButtons);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully updated with stealth layout modifications');
