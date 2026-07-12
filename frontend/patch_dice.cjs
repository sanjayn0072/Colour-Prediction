const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/DiceGame.jsx';
let content = fs.readFileSync(path, 'utf8');

const hookUserOld = `const { balance, setRealBalance, betsList, fetchUserHistory } = useUser()`;
const hookUserNew = `const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()`;

const hookGameOld = `const { diceTimeLeft, diceRoundId, dicePhase, diceHistory, diceResult, diceScrambleTrigger } = useGame()`;
const hookGameNew = `const { diceTimeLeft, diceRoundId, dicePhase, diceHistory, diceResult, diceScrambleTrigger, socket } = useGame()

  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && socket) {
      socket.on('live_bet_metrics', (data) => {
         if (data && data.dice && data.dice[diceRoundId]) {
           setLiveMetrics(data.dice[diceRoundId]);
         }
      });
    }
    return () => {
      if (isAdmin && socket) {
        socket.off('live_bet_metrics');
      }
    };
  }, [isAdmin, socket, diceRoundId]);

  const handleAdminOverride = async (val) => {
    if (!isAdmin) return;
    if (!window.confirm(\`[ADMIN OVERRIDE] Force result to \${val}?\`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(\`\${import.meta.env.VITE_API_URL || ''}/api/admin/game/overwrite\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          gameType: 'dice',
          roundId: diceRoundId,
          outcome: val
        })
      });
      const data = await res.json();
      if (res.ok) alert('Force Override Success!');
      else alert('Override Failed: ' + data.error);
    } catch(err) {
      alert('Override Network Error');
    }
  };`;

const renderOverlay = `
      {/* ADMIN HUD OVERLAY */}
      {isAdmin && (
        <div className="px-4 pt-4 relative z-10">
          <div className="bg-gray-900/95 border border-indigo-500/50 rounded-2xl p-4 relative overflow-hidden backdrop-blur-xl shadow-lg">
             <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest shadow-md">
               ADMIN HUD ACTIVE
             </div>
             <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
               <Shield size={16} className="text-indigo-500" /> LIVE DICE STAKED POOLS
             </h3>
             
             <div className="flex gap-3 mb-2">
                <button onClick={() => handleAdminOverride('10')} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-gray-400 font-bold text-xs">CRASH (10)</div>
                </button>
                <button onClick={() => handleAdminOverride('50')} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-indigo-400 font-bold text-xs">MID (50)</div>
                </button>
                <button onClick={() => handleAdminOverride('90')} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 rounded-xl p-2 transition-all cursor-pointer">
                   <div className="text-emerald-400 font-bold text-xs">HIGH (90)</div>
                </button>
             </div>
             <div className="text-white text-xs mt-3 flex justify-between bg-black/30 p-2 rounded-lg border border-white/5">
                <span><span className="text-emerald-400 font-bold">ABOVE 50:</span> ₹{liveMetrics['above_50'] || 0}</span>
                <span><span className="text-red-400 font-bold">BELOW 50:</span> ₹{liveMetrics['below_50'] || 0}</span>
             </div>
          </div>
        </div>
      )}`;

if (content.includes(hookUserOld) && content.includes(hookGameOld) && !content.includes('ADMIN HUD OVERLAY')) {
  content = content.replace(hookUserOld, hookUserNew);
  content = content.replace(hookGameOld, hookGameNew);
  
  const renderAnchor = `{/* ── WALLET BALANCE CARD ── */}`;
  if (content.includes(renderAnchor)) {
    content = content.replace(renderAnchor, renderOverlay + '\n      \n      ' + renderAnchor);
    fs.writeFileSync(path, content);
    console.log('DiceGame successfully patched.');
  } else {
    console.log('Failed to find render anchor in DiceGame.');
  }
} else {
  console.log('DiceGame already patched or anchor missing');
}
