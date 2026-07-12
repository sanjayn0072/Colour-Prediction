const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// Define the state variable
const targetState = `  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});`;
const newState = `  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const [adminConfirmModal, setAdminConfirmModal] = useState(null); // { type, val }`;

if (content.includes(targetState)) {
  content = content.replace(targetState, newState);
}

// Replace handleAdminOverride
const oldHandler = `  const handleAdminOverride = async (type, val) => {
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

const newHandler = `  const handleAdminOverride = (type, val) => {
    if (!isAdmin) return;
    setAdminConfirmModal({ type, val });
  };

  const executeAdminOverride = async () => {
    if (!adminConfirmModal) return;
    const { type, val } = adminConfirmModal;
    setAdminConfirmModal(null);
    
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

if (content.includes(oldHandler)) {
  content = content.replace(oldHandler, newHandler);
}

// Inject Modal in HTML layout
const oldLobby = `{/* Floating Game Lobby Grid Overlay */}`;
const newLobby = `
      {/* Custom Admin Override Modal */}
      {adminConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/35 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl text-center">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <Shield size={40} className="animate-pulse" />
            </div>
            <h3 className="text-white font-black text-lg mb-2 tracking-wide uppercase">
              Confirm Override
            </h3>
            <p className="text-slate-350 text-xs mb-6 leading-relaxed">
              [SUPER ADMIN OVERRIDE] Force result to <strong className="text-red-400 text-sm font-extrabold uppercase">{adminConfirmModal.val}</strong> for interval <strong className="text-red-400 text-sm font-extrabold uppercase">{activeSession}</strong>?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setAdminConfirmModal(null)}
                className="flex-grow py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
              >
                Cancel
              </button>
              <button 
                onClick={executeAdminOverride}
                className="flex-grow py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer border-0"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Game Lobby Grid Overlay */}`;

if (content.includes(oldLobby) && !content.includes('adminConfirmModal &&')) {
  content = content.replace(oldLobby, newLobby);
  fs.writeFileSync(path, content);
  console.log('ColourPrediction.jsx patched successfully');
} else {
  console.log('Failed to patch ColourPrediction.jsx: lobby anchor not found or modal already present');
}
