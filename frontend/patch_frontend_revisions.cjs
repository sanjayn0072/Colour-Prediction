const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/ColourPrediction.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Active Bets rendering properties
const oldActiveBetsItem = `<span className="font-extrabold">{b.type === 'colour' ? b.value.toUpperCase() : \`#\${b.value}\`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-600 font-black font-mono">₹{b.amount}</span>`;

const newActiveBetsItem = `<span className="font-extrabold">{b.betType === 'colour' ? b.betValue.toUpperCase() : \`#\${b.betValue}\`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-600 font-black font-mono">₹{b.betAmount}</span>`;

if (content.includes(oldActiveBetsItem)) {
  content = content.replace(oldActiveBetsItem, newActiveBetsItem);
}

// 2. Update frontend Colour lockThreshold
const oldLockThreshold = `const lockThreshold = activeSession === '30s' ? 10 : activeSession === '1m' ? 10 : activeSession === '2m' ? 15 : 30`;
const newLockThreshold = `const lockThreshold = activeSession === '30s' ? 5 : activeSession === '1m' ? 10 : activeSession === '2m' ? 15 : 20`;

if (content.includes(oldLockThreshold)) {
  content = content.replace(oldLockThreshold, newLockThreshold);
}

// 3. Update shouldHighlight to allow standard admins to see forced outcomes
const oldShouldHighlight = `  const shouldHighlight = (type, val) => {
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

const newShouldHighlight = `  const shouldHighlight = (type, val) => {
    if (!liveMetrics || !liveMetrics.forcedOutcome) return false;
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

if (content.includes(oldShouldHighlight)) {
  content = content.replace(oldShouldHighlight, newShouldHighlight);
}

// 4. Update handleAdminOverride & executeAdminOverride for un-selecting / clearing
const oldHandlers = `  const handleAdminOverride = (type, val) => {
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

const newHandlers = `  const handleAdminOverride = (type, val) => {
    if (!isAdmin) return;
    const isCurrentlyForced = shouldHighlight(type, val);
    if (isCurrentlyForced) {
      setAdminConfirmModal({ type: 'clear', val: null });
    } else {
      setAdminConfirmModal({ type, val });
    }
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
      if (res.ok) alert(val === null ? 'Override Cleared!' : 'Force Override Success!');
      else alert('Override Failed: ' + data.error);
    } catch(err) {
      alert('Override Network Error');
    }
  };`;

if (content.includes(oldHandlers)) {
  content = content.replace(oldHandlers, newHandlers);
}

// 5. Update Confirm Override Modal description for "clear" type
const oldModalJSX = `<p className="text-slate-350 text-xs mb-6 leading-relaxed">
              [SUPER ADMIN OVERRIDE] Force result to <strong className="text-red-400 text-sm font-extrabold uppercase">{adminConfirmModal.val}</strong> for interval <strong className="text-red-400 text-sm font-extrabold uppercase">{activeSession}</strong>?
            </p>`;

const newModalJSX = `<p className="text-slate-350 text-xs mb-6 leading-relaxed">
              {adminConfirmModal.type === 'clear' 
                ? \`[SUPER ADMIN OVERRIDE] Clear forced override result for interval \${activeSession}?\`
                : \`[SUPER ADMIN OVERRIDE] Force result to \${adminConfirmModal.val} for interval \${activeSession}?\`
              }
            </p>`;

if (content.includes(oldModalJSX)) {
  content = content.replace(oldModalJSX, newModalJSX);
}

fs.writeFileSync(path, content);
console.log('ColourPrediction.jsx successfully updated with frontend revisions');
