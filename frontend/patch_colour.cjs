const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

const hookUserOld = `const { balance, setRealBalance, betsList, fetchUserHistory } = useUser()`;
const hookUserNew = `const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()`;

const hookGameOld = `const { colourSessions } = useGame()`;
const hookGameNew = `const { colourSessions, socket } = useGame()

  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && socket) {
      socket.on('live_bet_metrics', (data) => {
         if (data && data.colour && data.colour[colourSessions[activeSession].gameId]) {
           setLiveMetrics(data.colour[colourSessions[activeSession].gameId]);
         }
      });
    }
    return () => {
      if (isAdmin && socket) {
        socket.off('live_bet_metrics');
      }
    };
  }, [isAdmin, socket, activeSession, colourSessions]);

  const handleAdminOverride = async (type, val) => {
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
          gameType: 'colour',
          session: activeSession,
          roundId: colourSessions[activeSession].gameId,
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
          <div className="bg-gray-900/95 border border-red-500/50 rounded-2xl p-4 relative overflow-hidden backdrop-blur-xl shadow-lg">
             <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-widest shadow-md">
               ADMIN HUD ACTIVE
             </div>
             <h3 className="text-white font-bold mb-3 text-sm flex items-center gap-2">
               <Shield size={16} className="text-red-500" /> LIVE CASH POOL AGGREGATES
             </h3>
             <div className="flex gap-3 mb-4">
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
             </div>
             
             <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-2 text-center transition-all cursor-pointer">
                    <div className="text-gray-400 font-bold text-xs"># {num}</div>
                    <div className="text-white font-mono text-[10px] mt-1">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
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
    console.log('ColourPrediction successfully patched.');
  } else {
    console.log('Failed to find render anchor in ColourPrediction.');
  }
} else {
  console.log('ColourPrediction already patched or anchor missing');
}
