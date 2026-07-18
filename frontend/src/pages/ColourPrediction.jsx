import { useState, useEffect, useRef } from 'react'
import { useUser } from '../context/UserContext'
import { useGame } from '../context/GameContext'
import { Clock, Lock, Shield, HelpCircle, Trophy, Sparkles, Check, X, Minus, Plus, Gamepad2, AlertCircle, AlertTriangle } from 'lucide-react'
import GameLobbyModal from '../components/GameLobbyModal'
import { translateError } from '../utils/errorTranslator'

const getMockResults = (sessionKey) => {
  const baseId = sessionKey === '30s' ? 3000 : sessionKey === '1m' ? 1001 : sessionKey === '2m' ? 2000 : 5000
  return [
    { id: baseId, colour: 'green', number: 4 },
    { id: baseId - 1, colour: 'red', number: 7 },
    { id: baseId - 2, colour: 'violet', number: 10 },
    { id: baseId - 3, colour: 'green', number: 2 },
    { id: baseId - 4, colour: 'red', number: 3 },
    { id: baseId - 5, colour: 'violet', number: 5 },
    { id: baseId - 6, colour: 'green', number: 8 },
    { id: baseId - 7, colour: 'red', number: 9 },
    { id: baseId - 8, colour: 'green', number: 6 },
    { id: baseId - 9, colour: 'red', number: 1 },
  ]
}


// Mapping of numbers 1-10 to their colors
const NUMBER_COLOR_MAP = {
  0: 'purple',   // fallback for legacy 0 = violet/10
  1: 'red',      // odd = red
  2: 'emerald',  // even = green
  3: 'red',      // odd = red
  4: 'emerald',  // even = green
  5: 'purple',   // violet
  6: 'emerald',  // even = green
  7: 'red',      // odd = red
  8: 'emerald',  // even = green
  9: 'red',      // odd = red
  10: 'purple',  // violet
}

export default function ColourPrediction({ onNavigate, routeData }) {
  const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()
  const [multipliers, setMultipliers] = useState({ green: 1.9, violet: 4.5, red: 1.9 });
  const [gameActiveStates, setGameActiveStates] = useState({});

  useEffect(() => {
    const fetchMultipliers = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
        const res = await fetch(`${API_BASE}/api/games/multipliers`);
        if (res.ok) {
          const data = await res.json();
          setMultipliers({
            green: data.green || 1.9,
            violet: data.violet || 4.5,
            red: data.red || 1.9
          });
          if (data.activeStates) {
            setGameActiveStates(data.activeStates);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic multipliers:', err);
      }
    };
    fetchMultipliers();
  }, []);

  const getBetType = (b) => {
    if (!b) return '';
    return b.betType || b.bet_type || (b.bet_color !== undefined || b.color !== undefined ? 'colour' : (b.bet_number !== undefined || b.number !== undefined ? 'number' : ''));
  };

  const getBetValue = (b) => {
    if (!b) return '';
    const val = b.betValue !== undefined ? b.betValue : (b.bet_value !== undefined ? b.bet_value : (b.bet_color !== undefined ? b.bet_color : (b.color !== undefined ? b.color : (b.bet_number !== undefined ? b.bet_number : (b.number !== undefined ? b.number : '')))));
    return val !== undefined && val !== null ? String(val) : '';
  };

  const getBetAmount = (b) => {
    if (!b) return 0;
    const amt = b.betAmount !== undefined ? b.betAmount : (b.bet_amount !== undefined ? b.bet_amount : (b.amount !== undefined ? b.amount : 0));
    return Math.round(parseFloat(amt) || 0);
  };
  
  // Lobby modal state
  const [showLobby, setShowLobby] = useState(routeData?.openLobby || false)
  
  // Active session mode
  const [activeSession, setActiveSession] = useState('1m')
  
  const [loading, setLoading] = useState(false)
  const [errorToast, setErrorToast] = useState(null)
  const [toastResult, setToastResult] = useState(null) // { won: boolean, amount: number }
  const [showRules, setShowRules] = useState(false)

  // Betting states (Inline, no drawers)
  const [selectedTargets, setSelectedTargets] = useState([]) // array of { type: 'colour'|'number', value: string|number }
  const [betAmount, setBetAmount] = useState(10)
  const [quantities, setQuantities] = useState({
    '30s': 1,
    '1m': 1,
    '2m': 1,
    '5m': 1
  })
  const quantity = quantities[activeSession] ?? 1
  const setQuantity = (val) => {
    setQuantities(prev => ({
      ...prev,
      [activeSession]: typeof val === 'function' ? val(prev[activeSession] ?? 1) : val
    }))
  }
  const [selectedColour, setSelectedColour] = useState(null)
  const [selectedNumber, setSelectedNumber] = useState(null)

  // Personal betting history states
  const [activeTab, setActiveTab] = useState('drawHistory') // 'drawHistory' | 'myBets'
  const [roundResultPopup, setRoundResultPopup] = useState(null) // resolution details popup
  const [glowOutcome, setGlowOutcome] = useState(null) // outcome winner highlight { colour, number }
  const [showMoreResults, setShowMoreResults] = useState(false)
  const [myBetsFilter, setMyBetsFilter] = useState('all') // 'all' | 'wins'

  const { colourSessions, socket } = useGame()

  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const [activeUsers, setActiveUsers] = useState(0);
  const [dailyPayout, setDailyPayout] = useState(0);
  const [adminConfirmModal, setAdminConfirmModal] = useState(null); // { type, val }

  // Global toast notification engine state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error') => {
    const finalMsg = type === 'error' ? translateError(message) : message;
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: finalMsg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const shouldHighlight = (type, val) => {
    if (!liveMetrics || !liveMetrics.forcedOutcome) return false;
    
    // Stealth HUD check: Super-admin overrides are hidden from standard admins
    const forcedByRole = liveMetrics.forcedByRole || 'admin';
    if (forcedByRole === 'super_admin' && user?.role !== 'super_admin') {
      return false;
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
  };
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && socket) {
      socket.on('live_bet_metrics', (data) => {
         const currentRoundId = colourSessions[activeSession]?.gameId;
         if (data) {
           if (data.colour && data.colour[currentRoundId]) {
             setLiveMetrics(data.colour[currentRoundId]);
           } else {
             setLiveMetrics({});
           }
           if (data.activeUsers !== undefined) {
             setActiveUsers(data.activeUsers);
           }
           if (data.dailyPayout !== undefined) {
             setDailyPayout(data.dailyPayout);
           }
         }
      });
    }
    return () => {
      if (isAdmin && socket) {
        socket.off('live_bet_metrics');
      }
    };
  }, [isAdmin, socket, activeSession, colourSessions]);

  const handleAdminOverride = (type, val) => {
    if (!isAdmin) return;
    setAdminConfirmModal({ type, val });
  };

  const executeAdminOverride = async () => {
    if (!adminConfirmModal) return;
    const { type, val } = adminConfirmModal;
    setAdminConfirmModal(null);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/game/overwrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          gameType: 'colour',
          session: activeSession,
          roundId: colourSessions[activeSession].gameId,
          outcome: val
        })
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {}
      
      if (res.ok && data.success !== false && !data.error) {
        showToast('⚡ Super Admin Override outcome forced successfully!', 'success');
        setLiveMetrics(prev => ({
          ...prev,
          forcedOutcome: data.outcome || null,
          forcedByRole: user?.role || 'admin'
        }));
      } else {
        showToast('❌ Override failed: ' + (data.error || data.message || res.statusText || 'HTTP Error ' + res.status), 'error');
      }
    } catch(err) {
      showToast('⚠️ Override connection or network failure.', 'warning');
    }
  };
  const activeSessState = colourSessions[activeSession]
  const timeLeft = activeSessState?.timeLeft ?? 60
  const gameId = activeSessState?.gameId ?? '1002'
  const phase = activeSessState?.phase ?? 'betting'
  const results = activeSessState?.results && activeSessState.results.length > 0
    ? activeSessState.results
    : getMockResults(activeSession)

  // Derive active bets directly from database betsList where status is pending and matches the active round ID
  const betsPlaced = betsList.filter(b => {
    if (!b) return false;
    const gType = b.gameType || b.game_type;
    const sess = b.session;
    const status = b.status;
    const roundIdMatch = String(b.roundId || b.round_id || b.gameRoundId || b.game_round_id) === String(gameId);
    return gType === 'colour' && String(sess).toLowerCase() === String(activeSession).toLowerCase() && status === 'pending' && roundIdMatch;
  })

  const betsPlacedRef = useRef(betsPlaced);
  const gameIdRef = useRef(gameId);
  
  useEffect(() => {
    betsPlacedRef.current = betsPlaced;
    gameIdRef.current = gameId;
  }, [betsPlaced, gameId]);

  const getBetAmountOnTarget = (type, val) => {
    return Math.round(betsPlaced
      .filter((bet) => bet.betType === type && String(bet.betValue).toLowerCase() === String(val).toLowerCase())
      .reduce((sum, bet) => sum + parseFloat(bet.betAmount || 0), 0))
  }

  const activeSessionRef = useRef(activeSession)
  useEffect(() => {
    activeSessionRef.current = activeSession
  }, [activeSession])

  const parsedBetAmount = betAmount === '' ? 0 : parseInt(betAmount)
  const totalBetAmount = selectedTargets.length * parsedBetAmount * quantity
  const formatTime = (secs) => {
    const safeSecs = Math.max(0, secs)
    const m = Math.floor(safeSecs / 60)
    const s = safeSecs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const lockThreshold = String(activeSession).toLowerCase() === '30s' ? 5 : String(activeSession).toLowerCase() === '1m' ? 10 : String(activeSession).toLowerCase() === '2m' ? 15 : 20
  const isLocked = phase === 'locked' || timeLeft <= lockThreshold

  // Listen to game result events from socket layer
  useEffect(() => {
    const handleColourResult = (e) => {
      const data = e.detail;
      const key = activeSessionRef.current;
      if (data.session && data.session !== key) return;

      setGlowOutcome({ colour: data.details.colour, number: data.outcome });
      setTimeout(() => setGlowOutcome(null), 3000);
      fetchUserHistory();

      // Show win/loss toast details based on the betsPlacedRef wagers
      const currentBets = betsPlacedRef.current || [];
      if (currentBets.length > 0) {
        let totalWon = 0;
        let totalInvested = 0;
        let hasActiveBets = false;

        for (const bet of currentBets) {
          const betRoundId = bet.roundId || bet.round_id || bet.gameRoundId || bet.game_round_id;
          if (String(betRoundId) === String(data.gameId)) {
            hasActiveBets = true;
            const amount = getBetAmount(bet);
            totalInvested += amount;

            let won = false;
            let multiplier = parseFloat(bet.multiplier || bet.payout_multiplier || multipliers.green);

            const bType = getBetType(bet);
            const bVal = getBetValue(bet);

            if (bType === 'number') {
              won = parseInt(bVal, 10) === data.outcome;
              multiplier = 8.0;
            } else if (bType === 'colour') {
              const chosenColor = String(bVal).toLowerCase();
              const winColor = String(data.details.colour).toLowerCase();
              const winNum = data.outcome;

              if (winNum === 5) {
                if (chosenColor === 'violet') {
                  won = true;
                  multiplier = multipliers.violet;
                } else if (chosenColor === 'green') {
                  won = true;
                  multiplier = parseFloat((multipliers.green * 0.75).toFixed(2));
                }
              } else if (winNum === 10 || winNum === 0) {
                if (chosenColor === 'violet') {
                  won = true;
                  multiplier = multipliers.violet;
                } else if (chosenColor === 'red') {
                  won = true;
                  multiplier = parseFloat((multipliers.red * 0.75).toFixed(2));
                }
              } else {
                won = chosenColor === winColor;
                multiplier = chosenColor === 'violet' ? multipliers.violet : (chosenColor === 'green' ? multipliers.green : multipliers.red);
              }
            }

            if (won) {
              totalWon += amount * multiplier;
            }
          }
        }

        if (hasActiveBets) {
          const netGain = parseFloat((totalWon - totalInvested).toFixed(2));
          const userWon = totalWon > 0;
          
          const roundBetsMapped = currentBets
            .filter(bet => {
              const betRoundId = bet.roundId || bet.round_id || bet.gameRoundId || bet.game_round_id;
              return String(betRoundId) === String(data.gameId);
            })
            .map(bet => {
              const amount = getBetAmount(bet);
              const bType = getBetType(bet);
              const bVal = getBetValue(bet);
              
              let won = false;
              let multiplier = parseFloat(bet.multiplier || bet.payout_multiplier || multipliers.green);
              if (bType === 'number') {
                won = parseInt(bVal, 10) === data.outcome;
                multiplier = 8.0;
              } else if (bType === 'colour') {
                const chosenColor = String(bVal).toLowerCase();
                const winColor = String(data.details.colour).toLowerCase();
                const winNum = data.outcome;

                if (winNum === 5) {
                  if (chosenColor === 'violet') {
                    won = true;
                    multiplier = multipliers.violet;
                  } else if (chosenColor === 'green') {
                    won = true;
                    multiplier = parseFloat((multipliers.green * 0.75).toFixed(2));
                  }
                } else if (winNum === 10 || winNum === 0) {
                  if (chosenColor === 'violet') {
                    won = true;
                    multiplier = multipliers.violet;
                  } else if (chosenColor === 'red') {
                    won = true;
                    multiplier = parseFloat((multipliers.red * 0.75).toFixed(2));
                  }
                } else {
                  won = chosenColor === winColor;
                  multiplier = chosenColor === 'violet' ? multipliers.violet : (chosenColor === 'green' ? multipliers.green : multipliers.red);
                }
              }
              
              return {
                type: bType,
                value: bVal,
                amount,
                won,
                payout: won ? parseFloat((amount * multiplier).toFixed(2)) : 0
              };
            });

          setRoundResultPopup({
            won: userWon,
            period: data.gameId,
            winColor: data.details.colour,
            winNumber: data.outcome,
            bets: roundBetsMapped,
            wager: totalInvested,
            payout: totalWon,
            netProfit: netGain
          });
        }
      }
    }
    
    const handleRoundEnded = (e) => {
      const data = e.detail;
      if (data.gameType === 'colour' && (!data.session || data.session === activeSessionRef.current)) {
        setSelectedTargets([]);
        setBetAmount('');
      }
    }

    window.addEventListener('colour_game_result', handleColourResult)
    window.addEventListener('round_ended', handleRoundEnded)
    return () => {
      window.removeEventListener('colour_game_result', handleColourResult)
      window.removeEventListener('round_ended', handleRoundEnded)
    }
  }, [betsList])

  // Listen to the round started / timer reset event to clear user selection states
  useEffect(() => {
    const handleRoundStarted = (e) => {
      const data = e.detail
      const sessionKey = data.session || '1m'
      if (sessionKey === activeSessionRef.current) {
        setSelectedColour(null);
        setSelectedNumber(null);
        setBetAmount(10);
        setSelectedTargets([]);
      }
    }

    window.addEventListener('colour_round_started', handleRoundStarted)
    return () => {
      window.removeEventListener('colour_round_started', handleRoundStarted)
    }
  }, [])

  // Toast Result Auto-Dismiss
  useEffect(() => {
    if (toastResult) {
      const t = setTimeout(() => setToastResult(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toastResult])

  // Error Toast Auto-Dismiss
  useEffect(() => {
    if (errorToast) {
      const t = setTimeout(() => setErrorToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [errorToast])

  // Auto-clear winner outcome glow after 5 seconds
  useEffect(() => {
    if (glowOutcome) {
      const t = setTimeout(() => setGlowOutcome(null), 5000)
      return () => clearTimeout(t)
    }
  }, [glowOutcome])

  const handleTargetClick = (type, val) => {
    if (isLocked) return
    setSelectedTargets((prev) => {
      const exists = prev.some((t) => t.type === type && t.value === val)
      if (exists) {
        if (type === 'colour') setSelectedColour(null)
        if (type === 'number') setSelectedNumber(null)
        return prev.filter((t) => !(t.type === type && t.value === val))
      } else {
        if (type === 'colour') setSelectedColour(val)
        if (type === 'number') setSelectedNumber(val)
        return [...prev, { type, value: val }]
      }
    })
  }

  const handleConfirmBet = async () => {
    if (selectedTargets.length === 0 || parsedBetAmount < 1 || parsedBetAmount > 1000 || totalBetAmount > balance || isLocked) return
    
    setLoading(true)
    const token = localStorage.getItem('token') || ''
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`

    try {
      const betPromises = selectedTargets.map(async (t) => {
        const response = await fetch(`${API_BASE}/api/games/place-bet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            gameType: 'colour',
            betType: t.type,
            betValue: t.value,
            amount: parsedBetAmount * quantity,
            session: activeSession
          })
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || 'Failed to place bet')
        }
        return await response.json()
      })

      const responses = await Promise.all(betPromises)
      
      // Update wallet balance from the last successful response
      if (responses.length > 0) {
        setRealBalance(responses[responses.length - 1].walletBalance)
      }

      // Add to active bets and personal log
      const timestampStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const newBets = selectedTargets.map((t) => ({
        type: t.type,
        value: t.value,
        amount: parsedBetAmount * quantity,
      }))

      // Fetch latest bets immediately to display the new pending bet in the list
      fetchUserHistory()
      
      setSelectedTargets([])
      setSelectedColour(null)
      setSelectedNumber(null)
      setBetAmount(10)
    } catch (err) {
      console.error(err)
      setErrorToast(err.message || 'An error occurred while placing bet')
    } finally {
      setLoading(false)
    }
  }

  const isTargetSelected = (type, val) => {
    return selectedTargets.some((t) => t.type === type && t.value === val)
  }

  const activeGameKey = `colour_${activeSession}`;
  const isCurrentSessionActive = gameActiveStates[activeGameKey] !== false;

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-slate-800 font-sans pb-20 relative select-none">
      {/* Floating Rules Button aligned symmetrically with back button */}
      <button
        onClick={() => setShowRules(true)}
        className="absolute -top-12 right-4 z-40 w-10 h-10 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm cursor-pointer text-slate-650 hover:text-slate-800 transition-all active:scale-95"
        title="Rules"
      >
        <HelpCircle size={20} />
      </button>
      
      {/* ── RULES MODAL ── */}
      {showRules && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowRules(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-100 animate-[scaleUp_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
              <X size={16} className="text-slate-500" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Sparkles size={16} className="text-primary" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Colour Prediction Rules</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
              <p>• <strong>Automatic 60s Cycle:</strong> A new outcome is drawn automatically every minute.</p>
              <p>• <strong>Colour Betting:</strong> Bet on Green, Red, or Violet.
                <br />- <strong>Green Wins:</strong> Pays <strong>{multipliers.green}x</strong> your bet amount.
                <br />- <strong>Red Wins:</strong> Pays <strong>{multipliers.red}x</strong> your bet amount.
                <br />- <strong>Violet Wins:</strong> Pays <strong>{multipliers.violet}x</strong> your bet amount.
              </p>
              <p>• <strong>Number Betting (1 to 10):</strong> Bet on any specific number from 1 to 10.
                <br />- If the outcome matches your number, you receive a massive **8x payout**!
              </p>
              <p>• <strong>Correlated Color Rules:</strong> 
                <br />- Green: Numbers 2, 4, 6, 8
                <br />- Red: Numbers 1, 3, 7, 9
                <br />- Violet (Yallet): Numbers 5, 10
              </p>
              <p>• <strong>Bet Lock:</strong> Betting closes automatically when the timer reaches 5 seconds.
              </p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 cursor-pointer">
              Got It
            </button>
          </div>
        </div>
      )}
      
      
      {/* ADMIN HUD OVERLAY */}
      {isAdmin && (
        <div className="px-4 pt-4 relative z-10">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 relative overflow-hidden shadow-md shadow-slate-100/80">
             <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg tracking-widest uppercase shadow-sm">
                ADMIN HUD ACTIVE
             </div>
             <h3 className="text-slate-850 font-bold mb-3 text-sm flex items-center gap-2">
                <Shield size={16} className="text-red-600 animate-pulse" /> LIVE CASH POOL AGGREGATES
             </h3>

             {liveMetrics && liveMetrics.forcedOutcome && (liveMetrics.forcedByRole !== 'super_admin' || user?.role === 'super_admin') && (
               <div className="mb-3 px-3 py-2 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between text-xs font-bold text-rose-700">
                 <span>Active Force Outcome: {liveMetrics.forcedOutcome}</span>
                 <button 
                   onClick={() => handleAdminOverride('colour', 'CLEAR')} 
                   className="text-[10px] uppercase font-black tracking-wider text-rose-600 hover:text-rose-800 bg-transparent border-0 cursor-pointer underline ml-2"
                 >
                   Clear Force
                 </button>
               </div>
             )}
             <div className="flex gap-3 mb-4">
                <button onClick={() => handleAdminOverride('colour', 'red')} className={`flex-1 bg-red-50 hover:bg-red-100/70 border ${shouldHighlight('colour', 'red') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse' : 'border-red-200'} rounded-xl p-2.5 transition-all cursor-pointer`}>
                   <div className="text-red-600 font-bold text-xs">🔴 RED</div>
                   <div className="text-slate-800 font-mono font-bold mt-1">₹{liveMetrics.red || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'green')} className={`flex-1 bg-emerald-50 hover:bg-emerald-100/70 border ${shouldHighlight('colour', 'green') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse' : 'border-emerald-200'} rounded-xl p-2.5 transition-all cursor-pointer`}>
                   <div className="text-emerald-600 font-bold text-xs">🟢 GREEN</div>
                   <div className="text-slate-800 font-mono font-bold mt-1">₹{liveMetrics.green || 0}</div>
                </button>
                <button onClick={() => handleAdminOverride('colour', 'violet')} className={`flex-1 bg-purple-50 hover:bg-purple-100/70 border ${shouldHighlight('colour', 'violet') ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse' : 'border-purple-200'} rounded-xl p-2.5 transition-all cursor-pointer`}>
                   <div className="text-purple-600 font-bold text-xs">🟣 VIOLET</div>
                   <div className="text-slate-800 font-mono font-bold mt-1">₹{liveMetrics.violet || 0}</div>
                </button>
             </div>
             
             <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button onClick={() => handleAdminOverride('number', num)} key={num} className={`bg-slate-50 hover:bg-slate-100 border ${shouldHighlight('number', num) ? 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-pulse' : 'border-slate-200'} rounded-lg p-2 text-center transition-all cursor-pointer`}>
                    <div className="text-slate-600 font-bold text-[10px]"># {num}</div>
                    <div className="text-slate-800 font-mono font-bold text-[10px] mt-0.5">₹{liveMetrics[num] || 0}</div>
                  </button>
                ))}
             </div>

             {/* Live Analytics Dashboard Details */}
             <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
               <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Users</div>
                 <div className="text-xs font-extrabold text-slate-700 mt-0.5">{activeUsers.toLocaleString()} Players</div>
               </div>
               <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">24h Payouts</div>
                 <div className="text-xs font-extrabold text-slate-700 mt-0.5">₹{dailyPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
               </div>
             </div>

             <div className="mt-3 flex items-center justify-center gap-1.5 bg-emerald-50/50 border border-emerald-100 rounded-lg py-1.5 px-3">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
               <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">100% Provably Fair Cryptographic Algorithm</span>
             </div>
          </div>
        </div>
      )}
      
      {/* ── WALLET BALANCE CARD ── */}
      <div className="px-4 pt-4 relative z-10">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Wallet Balance</p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight font-sans">₹{balance.toFixed(2)}</p>
          </div>
          <button onClick={() => onNavigate?.('wallet')} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer">
            Wallet
          </button>
        </div>
      </div>
      
      {/* ── SESSION MODE SELECTOR ── */}
      <div className="px-4 pt-3 relative z-10">
        <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 shadow-sm">
          {['30s', '1m', '2m', '5m'].map((sess) => {
            const isActive = activeSession === sess
            const sessTimeLeft = Math.max(0, colourSessions[sess]?.timeLeft ?? 60)
            const formattedTime = sessTimeLeft >= 60 
              ? `${Math.floor(sessTimeLeft / 60)}m ${sessTimeLeft % 60}s`
              : `${sessTimeLeft}s`
            
            return (
              <button
                key={sess}
                onClick={() => {
                  setActiveSession(sess)
                  setSelectedTargets([])
                  setSelectedColour(null)
                  setSelectedNumber(null)
                  setBetAmount(10)
                  setGlowOutcome(null)
                }}
                className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer border-0 outline-none ${
                  isActive
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-700 bg-transparent'
                }`}
              >
                <span className="text-[11px] font-black uppercase tracking-wider">{sess}</span>
                <span className={`text-[9px] mt-0.5 font-bold font-mono ${
                  isActive 
                    ? sessTimeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-primary'
                    : 'text-slate-400'
                }`}>
                  {formattedTime}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col px-4 pt-4 space-y-4">
        {!isCurrentSessionActive ? (
          <div className="bg-slate-900 border border-slate-850 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden my-auto">
            {/* Cute Animated Maintenance Robot */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping opacity-45" style={{ animationDuration: '3s' }} />
              <svg viewBox="0 0 100 100" className="w-20 h-20 relative z-10">
                {/* Antenna */}
                <line x1="50" y1="22" x2="50" y2="10" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="8" r="4.5" fill="#a855f7" className="animate-pulse" />
                
                {/* Head */}
                <rect x="22" y="22" width="56" height="46" rx="14" fill="#0f172a" stroke="#6366f1" strokeWidth="2.5" />
                
                {/* Eyes */}
                <rect x="31" y="34" width="14" height="14" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="38" cy="41" r="3" fill="#38bdf8" className="animate-bounce" />
                
                <rect x="55" y="34" width="14" height="14" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="62" cy="41" r="3" fill="#38bdf8" className="animate-bounce" />
                
                {/* Cute curve */}
                <path d="M 43 55 Q 50 59 57 55" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Buttons */}
                <circle cx="28" cy="56" r="2" fill="#ef4444" />
                <circle cx="72" cy="56" r="2" fill="#22c55e" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Session under maintenance</h2>
              <p className="text-slate-400 text-xs leading-relaxed text-slate-300">
                The {activeSession} Colour Prediction session is under maintenance. Please try again later.
              </p>
            </div>
            
            <button
              onClick={() => onNavigate?.('home')}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-98 border-0 outline-none uppercase tracking-wider"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
            {/* ── MAIN GAME PANEL ── */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm relative overflow-hidden flex flex-col space-y-4">
          
          {/* Error Toast Overlay */}
          {errorToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-xs font-bold border bg-rose-50 border-rose-200 text-rose-700 backdrop-blur-md z-35 flex items-center gap-1.5 shadow-sm animate-[slideDown_0.3s_ease-out] select-none w-[90%] max-w-xs justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle size={14} className="text-rose-500 shrink-0" />
                <span className="truncate">{errorToast}</span>
              </div>
              <button onClick={() => setErrorToast(null)} className="ml-1 text-rose-450 hover:text-rose-600 font-extrabold cursor-pointer border-0 bg-transparent outline-none p-0 flex items-center justify-center shrink-0">
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Result Toast Overlay inside Card */}
          {toastResult && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold border backdrop-blur-md z-20 flex items-center gap-1.5 shadow-sm animate-[slideDown_0.3s_ease-out] ${
              toastResult.won 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100/50'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {toastResult.won ? `Won: +₹${toastResult.amount}` : `Lost: -₹${toastResult.amount}`}
            </div>
          )}
          
          {/* Period & Timer Row */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Period</span>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full font-mono">
                #{gameId}
              </span>
            </div>
            
            {/* Big Timer Pill */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-5 py-2.5 rounded-2xl shadow-sm font-sans">
              <Clock size={20} className={isLocked ? 'text-rose-500 animate-pulse' : 'text-indigo-650'} />
              <span className={`text-2xl font-black font-mono tracking-tight ${isLocked ? 'text-rose-500 animate-pulse animate-[pulse_1.5s_infinite]' : 'text-slate-800'}`}>
                {isLocked ? '00:' + String(Math.max(0, timeLeft)).padStart(2, '0') : formatTime(timeLeft)}
              </span>
            </div>
          </div>
          
          {/* Last Draw Result Panel */}
          {results && results.length > 0 && (
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/50 rounded-2xl p-3.5 flex items-center justify-between shadow-inner">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Last Draw Result</span>
                <span className="text-xs font-bold text-slate-600 font-mono">Period #{results[0].id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                  results[0].colour === 'green' ? 'bg-emerald-500 text-white border-emerald-400' :
                  results[0].colour === 'red' ? 'bg-rose-500 text-white border-rose-400' :
                  'bg-purple-500 text-white border-purple-400'
                }`}>
                  {results[0].colour}
                </span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shadow-sm ${
                  NUMBER_COLOR_MAP[results[0].number] === 'emerald' ? 'bg-emerald-500 border border-emerald-400' :
                  NUMBER_COLOR_MAP[results[0].number] === 'red' ? 'bg-rose-500 border border-rose-400' :
                  'bg-purple-500 border border-purple-400'
                }`}>
                  {results[0].number === 0 ? 10 : results[0].number}
                </span>
              </div>
            </div>
          )}
          
          {/* Betting Grid Container (with locking overlay) */}
          <div className="relative p-0.5 rounded-3xl overflow-hidden">
            {isLocked && timeLeft <= 15 && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[1.5px] rounded-3xl z-30 flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out]">
                <Clock size={28} className="text-rose-500 mb-1.5 animate-bounce" />
                <span className="text-rose-600 text-[10px] font-black uppercase tracking-widest">Betting Locked</span>
                <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-500 to-red-600 font-mono tracking-tighter animate-[scaleUp_0.5s_infinite_alternate] drop-shadow-sm">
                  00:{String(Math.max(0, timeLeft)).padStart(2, '0')}
                </span>
              </div>
            )}
            
            {/* Color Selector Pills */}
            <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-0.5">
              Predict Color
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Green */}
              <button
                disabled={isLocked}
                onClick={() => handleTargetClick('colour', 'green')}
                className={`py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none relative ${
                  glowOutcome?.colour === 'green'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_20px_#10b981] scale-105 ring-4 ring-emerald-400/30 animate-pulse'
                    : getBetAmountOnTarget('colour', 'green') > 0
                      ? 'bg-emerald-600 text-white border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : isTargetSelected('colour', 'green')
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300'
                }`}
              >
                {glowOutcome?.colour === 'green' && (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider animate-bounce shadow">Landed</span>
                )}
                {getBetAmountOnTarget('colour', 'green') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 border border-amber-300 text-white font-mono font-black text-[8px] px-1.5 py-0.5 rounded shadow z-10 leading-none">
                    ₹{getBetAmountOnTarget('colour', 'green')}
                  </span>
                )}
                {isTargetSelected('colour', 'green') && <Check size={12} strokeWidth={3.5} />}
                Green ({multipliers.green}x)
              </button>
              
              {/* Violet */}
              <button
                disabled={isLocked}
                onClick={() => handleTargetClick('colour', 'violet')}
                className={`py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none relative ${
                  glowOutcome?.colour === 'violet'
                    ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_20px_#a855f7] scale-105 ring-4 ring-purple-400/30 animate-pulse'
                    : getBetAmountOnTarget('colour', 'violet') > 0
                      ? 'bg-purple-600 text-white border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : isTargetSelected('colour', 'violet')
                        ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-200'
                        : 'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-300'
                }`}
              >
                {glowOutcome?.colour === 'violet' && (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[8px] font-black uppercase tracking-wider animate-bounce shadow">Landed</span>
                )}
                {getBetAmountOnTarget('colour', 'violet') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 border border-amber-300 text-white font-mono font-black text-[8px] px-1.5 py-0.5 rounded shadow z-10 leading-none">
                    ₹{getBetAmountOnTarget('colour', 'violet')}
                  </span>
                )}
                {isTargetSelected('colour', 'violet') && <Check size={12} strokeWidth={3.5} />}
                Violet ({multipliers.violet}x)
              </button>
              
              {/* Red */}
              <button
                disabled={isLocked}
                onClick={() => handleTargetClick('colour', 'red')}
                className={`py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none relative ${
                  glowOutcome?.colour === 'red'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_20px_#f43f5e] scale-105 ring-4 ring-rose-400/30 animate-pulse'
                    : getBetAmountOnTarget('colour', 'red') > 0
                      ? 'bg-rose-600 text-white border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                      : isTargetSelected('colour', 'red')
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                        : 'bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-300'
                }`}
              >
                {glowOutcome?.colour === 'red' && (
                  <span className="absolute -top-2 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider animate-bounce shadow">Landed</span>
                )}
                {getBetAmountOnTarget('colour', 'red') > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-500 border border-amber-300 text-white font-mono font-black text-[8px] px-1.5 py-0.5 rounded shadow z-10 leading-none">
                    ₹{getBetAmountOnTarget('colour', 'red')}
                  </span>
                )}
                {isTargetSelected('colour', 'red') && <Check size={12} strokeWidth={3.5} />}
                Red ({multipliers.red}x)
              </button>
            </div>
          </div>
          
          {/* Number Selector Grid */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-0.5">
              Or Predict Number (8.0x)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSel = isTargetSelected('number', num)
                const isNumGlow = glowOutcome?.number === num
                const betAmt = getBetAmountOnTarget('number', num)
                const numColor = NUMBER_COLOR_MAP[num]
                
                const colorClasses = (() => {
                  if (numColor === 'red') {
                    return isSel 
                      ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' 
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100/50 hover:border-rose-300'
                  } else if (numColor === 'emerald') {
                    return isSel 
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100/50 hover:border-emerald-300'
                  } else { // purple (violet)
                    return isSel 
                      ? 'bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-200' 
                      : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100/50 hover:border-purple-300'
                  }
                })()
                
                return (
                  <button
                    key={num}
                    disabled={isLocked}
                    onClick={() => handleTargetClick('number', num)}
                    className={`py-3 rounded-2xl border text-sm font-extrabold flex flex-col items-center justify-center relative transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                      isNumGlow
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_20px_#4f46e5] scale-105 ring-4 ring-indigo-400/30 animate-pulse'
                        : betAmt > 0
                          ? 'bg-indigo-600 text-white border-amber-400 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                          : colorClasses
                    }`}
                  >
                    <span>{num}</span>
                    {isNumGlow && (
                      <span className="absolute -top-2.5 px-1.5 py-0.5 rounded bg-indigo-700 text-white text-[8px] font-black uppercase tracking-wider animate-bounce shadow">Landed</span>
                    )}
                    {betAmt > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 border border-amber-300 text-white font-mono font-black text-[8px] px-1.5 py-0.5 rounded shadow z-10 leading-none">
                        ₹{betAmt}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          </div> {/* End of Betting Grid Container */}
          
          {/* Selected Targets Badge Pill List */}
          {selectedTargets.length > 0 && (
            <div className="space-y-1.5 animate-[fadeIn_0.15s_ease-out] border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Selections ({selectedTargets.length})</span>
                <button 
                  onClick={() => setSelectedTargets([])}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-0 outline-none"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
                {selectedTargets.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all ${
                      t.type === 'colour'
                        ? t.value === 'green'
                          ? 'bg-emerald-500/10 border-emerald-200 text-emerald-700'
                          : t.value === 'red'
                          ? 'bg-rose-500/10 border-rose-200 text-rose-700'
                          : 'bg-purple-500/10 border-purple-200 text-purple-700'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}
                  >
                    <span>{t.type === 'colour' ? t.value.toUpperCase() : `No. ${t.value}`}</span>
                    <button 
                      onClick={() => handleTargetClick(t.type, t.value)}
                      className="hover:bg-slate-200/50 rounded-full p-0.5 transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Compact Single-Row Wager Controller */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3 flex flex-row items-center justify-between gap-3 text-xs font-semibold">
            {/* Target counts label */}
            <div className="flex flex-col min-w-[70px] leading-tight">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Wagers</span>
              <span className="text-slate-800 font-black text-xs truncate max-w-[80px] block">
                {selectedTargets.length} selected
              </span>
            </div>
            
            {/* Custom Bet Size Input */}
            <div className="flex-1 flex flex-col min-w-[90px] leading-tight">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Bet Size</span>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-[11px] text-slate-400 font-extrabold">₹</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  disabled={isLocked}
                  value={betAmount}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9]/g, '')
                    let val = cleaned === '' ? '' : parseInt(cleaned)
                    if (val !== '' && val > 1000) val = 1000
                    setBetAmount(val)
                  }}
                  onBlur={() => {
                    if (betAmount === '' || parseInt(betAmount) < 1) setBetAmount(1)
                  }}
                  placeholder="1 - 1000"
                  className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-400 placeholder:font-normal font-mono"
                />
              </div>
            </div>
            
            {/* Quantity Counter */}
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Quantity</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                <button
                  disabled={isLocked}
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer disabled:opacity-40 border-0 bg-transparent"
                >
                  <Minus size={11} />
                </button>
                <span className="w-5 text-center font-extrabold text-slate-800 text-[11px] font-mono">{quantity}</span>
                <button
                  disabled={isLocked}
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer disabled:opacity-40 border-0 bg-transparent"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Active Bets List */}
          {betsPlaced.length > 0 && (
            <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-2xl p-3 space-y-1.5 text-[11px] font-bold text-slate-700 animate-[fadeIn_0.15s_ease-out]">
              <span className="text-[9px] text-emerald-800 font-black uppercase tracking-wider block px-0.5">
                Active Bets (Period #{gameId})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                {betsPlaced.map((b, idx) => {
                  const bType = getBetType(b);
                  const bVal = getBetValue(b) || 'N/A';
                  const bAmt = getBetAmount(b);
                  return (
                    <div key={idx} className="bg-white border border-emerald-200/45 px-2 py-1 rounded-xl text-slate-600 flex items-center gap-1.5 text-[10px] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                      <span className="font-extrabold">{bType === 'colour' ? bVal.toUpperCase() : `#${bVal}`}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-600 font-black font-mono">₹{bAmt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Insufficient Balance Warning */}
          {totalBetAmount > balance && (
            <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 px-1 select-none animate-[shake_0.2s_ease-in-out]">
              ⚠️ Insufficient wallet balance!
            </p>
          )}
          
          {/* Bet Confirmation Button */}
          <button
            onClick={handleConfirmBet}
            disabled={loading || isLocked || selectedTargets.length === 0 || totalBetAmount > balance || totalBetAmount <= 0}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border-0"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLocked ? (
              <>
                <Lock size={14} /> Betting Locked
              </>
            ) : selectedTargets.length > 0 ? (
              <>Place Bet — ₹{totalBetAmount}</>
            ) : (
              <>Select Color or Number</>
            )}
          </button>

        </div>

        {/* ── DUAL TAB HISTORY SECTION ── */}
        <div className="space-y-3 pb-4">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('drawHistory')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
                activeTab === 'drawHistory'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Trophy size={14} className={activeTab === 'drawHistory' ? 'text-primary' : 'text-slate-400'} />
              Draw History
            </button>
            <button
              onClick={() => setActiveTab('myBets')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
                activeTab === 'myBets'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Clock size={14} className={activeTab === 'myBets' ? 'text-primary' : 'text-slate-400'} />
              My Bets
            </button>
          </div>

          {/* Draw History List */}
          {activeTab === 'drawHistory' && (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm space-y-3 animate-[fadeIn_0.15s_ease-out]">
              {results.slice(0, showMoreResults ? 20 : 10).map((res, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold py-1.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-slate-400 font-mono">Period #{res.id}</span>
                  <div className="flex items-center gap-3">
                    {/* Color badge */}
                    <span className={`w-14 text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      res.colour === 'green' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      res.colour === 'red' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-purple-50 text-purple-600 border-purple-100'
                    }`}>
                      {res.colour}
                    </span>
                    
                    {/* Number badge */}
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-white text-xs shadow-sm ${
                      NUMBER_COLOR_MAP[res.number] === 'emerald' ? 'bg-emerald-500 border border-emerald-400' :
                      NUMBER_COLOR_MAP[res.number] === 'red' ? 'bg-rose-500 border border-rose-400' :
                      'bg-purple-500 border border-purple-400'
                    }`}>
                      {res.number === 0 ? 10 : res.number}
                    </span>
                  </div>
                </div>
              ))}
              {results.length > 10 && (
                <button
                  onClick={() => setShowMoreResults(prev => !prev)}
                  className="w-full mt-2 py-2.5 text-center text-xs font-bold text-primary hover:text-indigo-700 transition-colors cursor-pointer bg-slate-50 border border-slate-200/65 rounded-xl outline-none"
                >
                  {showMoreResults ? 'Show Less ▴' : `Show More Results (Max 20) ▾`}
                </button>
              )}
            </div>
          )}

          {/* My Bets List */}
          {activeTab === 'myBets' && (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm space-y-3 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Wagers Log ({activeSession} Mode)</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                  <button
                    onClick={() => setMyBetsFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border-0 outline-none ${
                      myBetsFilter === 'all'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMyBetsFilter('wins')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border-0 outline-none ${
                      myBetsFilter === 'wins'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Wins Only
                  </button>
                </div>
              </div>

              {(() => {
                const sessionBets = betsList
                  .filter(b => b.gameType === 'colour' && b.session === activeSession)
                  .map(b => {
                    const formattedDate = new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    return {
                      id: b.id ? `BET-${b.id}` : (b._id ? `BET-${b._id}` : `BET-${Math.floor(10000 + Math.random() * 90000)}`),
                      period: b.roundId,
                      session: b.session,
                      target: getBetType(b) === 'colour' ? (getBetValue(b) || 'N/A').toUpperCase() : `#${getBetValue(b) || 'N/A'}`,
                      wager: getBetAmount(b),
                      outcome: b.outcome || 'Waiting...',
                      profit: b.status === 'pending' ? 0 : b.status === 'won' ? parseFloat((b.payout - b.betAmount).toFixed(2)) : -b.betAmount,
                      status: b.status === 'pending' ? 'Pending' : b.status === 'won' ? 'Won' : 'Lost',
                      date: formattedDate
                    }
                  })
                const filteredBets = sessionBets.filter((bet) => myBetsFilter === 'all' || bet.status === 'Won')

                if (sessionBets.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No bets placed in {activeSession} mode yet.
                    </div>
                  )
                }

                if (filteredBets.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No winning bets in {activeSession} mode yet.
                    </div>
                  )
                }

                return (
                  <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-3">
                    {filteredBets.map((bet) => (
                      <div key={bet.id} className="border border-slate-200 bg-slate-50/50 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                        {/* Top Row: Period ID & Status */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-bold font-mono">Period #{bet.period}</span>
                            <span className="text-[9px] bg-slate-200/60 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">{bet.id}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            bet.status === 'Won' ? 'bg-emerald-100 text-emerald-700 font-bold' :
                            bet.status === 'Lost' ? 'bg-rose-100 text-rose-700 font-bold' :
                            'bg-amber-100 text-amber-700 animate-pulse font-bold'
                          }`}>
                            {bet.status}
                          </span>
                        </div>

                        {/* Middle Row: Selection Target & Wager Amount */}
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-semibold">Target:</span>
                            <span className={`font-black text-[10px] px-2 py-0.5 rounded-lg border ${
                              bet.target === 'GREEN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              bet.target === 'RED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              bet.target === 'VIOLET' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                              {bet.target}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-semibold">Wager:</span>
                            <span className="font-extrabold text-slate-700 font-mono">₹{bet.wager}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Outcome & Profit */}
                        <div className="flex justify-between items-center text-xs border-t border-slate-100/85 pt-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-semibold">Outcome:</span>
                            <span className={`font-bold text-[10px] ${
                              bet.outcome === 'Waiting...' ? 'text-amber-600' : 'text-slate-650'
                            }`}>{bet.outcome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-semibold">Profit:</span>
                            {bet.status === 'Pending' ? (
                              <span className="font-bold text-slate-500 font-mono">-</span>
                            ) : (
                              <span className={`font-black font-mono text-[11px] ${
                                bet.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'
                              }`}>
                                {bet.profit >= 0 ? '+' : ''}₹{bet.profit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date/Time Row */}
                        <div className="text-[9px] text-slate-400 text-right font-medium">
                          {bet.date}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </>
    )}
  </div>

      {/* Round Result Popup Overlay */}
      {roundResultPopup && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border border-slate-100 animate-[scaleUp_0.2s_ease-out] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-xl" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full blur-xl" />

            <button 
              onClick={() => setRoundResultPopup(null)} 
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors z-10 border-0 outline-none"
            >
              <X size={16} className="text-slate-500" />
            </button>

            <div className="text-center space-y-4 relative z-10">
              <div className="flex justify-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                  roundResultPopup.won 
                    ? 'bg-emerald-100 text-emerald-600 shadow-emerald-100/50' 
                    : 'bg-rose-100 text-rose-600 shadow-rose-100/50'
                }`}>
                  <Trophy size={32} className="animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className={`text-xl font-black ${roundResultPopup.won ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {roundResultPopup.won ? '🎉 Round Won!' : 'Good Luck Next Time!'}
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">Period #{roundResultPopup.period} Draw Details</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-around">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Draw Color</span>
                  <span className={`mt-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${
                    roundResultPopup.winColor === 'green' ? 'bg-emerald-500 text-white border-emerald-400' :
                    roundResultPopup.winColor === 'red' ? 'bg-rose-500 text-white border-rose-400' :
                    'bg-purple-500 text-white border-purple-400'
                  }`}>
                    {roundResultPopup.winColor}
                  </span>
                </div>
                <div className="w-[1px] h-10 bg-slate-200" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Draw Number</span>
                  <span className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm shadow-sm ${
                    NUMBER_COLOR_MAP[roundResultPopup.winNumber] === 'emerald' ? 'bg-emerald-500 border border-emerald-400' :
                    NUMBER_COLOR_MAP[roundResultPopup.winNumber] === 'red' ? 'bg-rose-500 border border-rose-400' :
                    'bg-purple-500 border border-purple-400'
                  }`}>
                    {roundResultPopup.winNumber}
                  </span>
                </div>
              </div>

              {roundResultPopup.bets && roundResultPopup.bets.length > 0 && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block text-left">Your Bets Detail</span>
                  <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {roundResultPopup.bets.map((bet, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            bet.type === 'colour'
                              ? bet.value === 'green' ? 'bg-emerald-500/10 border-emerald-200 text-emerald-700' : bet.value === 'red' ? 'bg-rose-500/10 border-rose-200 text-rose-700' : 'bg-purple-500/10 border-purple-200 text-purple-700'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}>
                            {bet.type === 'colour' ? bet.value : `#${bet.value}`}
                          </span>
                          <span className="text-slate-500 font-extrabold font-mono">₹{bet.amount}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          bet.won ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {bet.won ? `Won +₹${bet.payout}` : 'Lost'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Total Wagered</span>
                  <span className="font-extrabold text-slate-800 font-mono">₹{roundResultPopup.wager}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-400">Payout Received</span>
                  <span className="font-extrabold text-slate-800 font-mono">₹{roundResultPopup.payout}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">Net Profit</span>
                  <span className={`font-black font-mono ${roundResultPopup.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {roundResultPopup.netProfit >= 0 ? '+' : ''}₹{roundResultPopup.netProfit}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setRoundResultPopup(null)} 
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100/50 transition-all cursor-pointer border-0 outline-none"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Custom Admin Override Modal */}
      {adminConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-fade-in mx-4">
            <div className="flex items-center justify-center mb-4 text-amber-500">
              <Shield size={40} className="animate-pulse" />
            </div>
            <h3 className="text-white font-black text-lg mb-2 tracking-wide uppercase">
              Confirm Override
            </h3>
            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
              {adminConfirmModal.type === 'clear' 
                ? `⚡ [SUPER ADMIN OVERRIDE] Clear forced outcome for interval ${activeSession}?`
                : `⚡ [SUPER ADMIN OVERRIDE] Lock incoming round output to ${adminConfirmModal.val} for interval ${activeSession}?`
              }
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
                className="flex-grow py-3 bg-gradient-to-r from-emerald-500 to-teal-550 hover:from-emerald-600 hover:to-teal-650 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer border-0 font-black"
              >
                Confirm Lockout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Stack */}
      <div className="fixed top-4 right-4 z-55 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-[90%] md:w-full">
        {toasts.map((t) => {
          let bgClass = 'bg-rose-50 border-rose-200 text-rose-700';
          let icon = <AlertCircle size={16} className="text-rose-500 shrink-0" />;

          if (t.type === 'success') {
            bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
            icon = <Check size={16} className="text-emerald-500 shrink-0" />;
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-200 text-amber-700';
            icon = <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-semibold shadow-xl backdrop-blur-md transition-all duration-300 ${bgClass}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <span className="truncate">{t.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="ml-3 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent cursor-pointer p-0 flex items-center justify-center shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Game Lobby Grid Overlay */}
      <GameLobbyModal 
        isOpen={showLobby} 
        onClose={() => setShowLobby(false)} 
        onNavigate={onNavigate}
        activeGameId="game"
      />
    </div>
  )
}
