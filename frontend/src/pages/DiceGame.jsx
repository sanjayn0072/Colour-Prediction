import { useState, useEffect } from 'react'
import { translateError } from '../utils/errorTranslator'
import { useUser } from '../context/UserContext'
import { useGame } from '../context/GameContext'
import { ArrowLeft, HelpCircle, Trophy, Sparkles, Check, X, Gamepad2, Clock, Lock, Play, Loader2, History, Shield, AlertCircle } from 'lucide-react'
import GameLobbyModal from '../components/GameLobbyModal'

export default function DiceGame({ onNavigate }) {
  const { user, balance, setRealBalance, betsList, fetchUserHistory } = useUser()
  const [loading, setLoading] = useState(false)
  const [diceHouseFee, setDiceHouseFee] = useState(2.0)

  useEffect(() => {
    const fetchMultipliers = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
        const res = await fetch(`${API_BASE}/api/games/multipliers`)
        if (res.ok) {
          const data = await res.json()
          setDiceHouseFee(data.diceHouseFee !== undefined ? parseFloat(data.diceHouseFee) : 2.0)
        }
      } catch (err) {
        console.error('Failed to fetch dice edge multiplier config:', err)
      }
    }
    fetchMultipliers()
  }, [])
  
  // Lobby modal state
  const [showLobby, setShowLobby] = useState(false)
  const [showRules, setShowRules] = useState(false)
  
  // Betting parameters
  const [betAmount, setBetAmount] = useState(10)
  const [condition, setCondition] = useState('over') // 'over' | 'under' | 'range'
  const [target, setTarget] = useState(50.50)
  const [betPlaced, setBetPlaced] = useState(false)
  const [betDetails, setBetDetails] = useState(null) // { amount, condition, target, multiplier }

  // central socket state mapping
  const { diceTimeLeft, diceRoundId, dicePhase, diceHistory, diceResult, diceScrambleTrigger, socket } = useGame()

  // --- Admin Live Metrics Overlay State ---
  const [liveMetrics, setLiveMetrics] = useState({});
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin && socket) {
      socket.on('live_bet_metrics', (data) => {
         if (data && data.dice && data.dice[diceRoundId]) {
           setLiveMetrics(data.dice[diceRoundId]);
         } else {
           setLiveMetrics({});
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
    if (!window.confirm(`[ADMIN OVERRIDE] Force result to ${val}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/game/overwrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          roundId: diceRoundId,
          outcome: val
        })
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {}
      
      if (res.ok) {
        alert('Force Override Success!');
      } else {
        alert('Override Failed: ' + (data.error || res.statusText || 'HTTP Error ' + res.status));
      }
    } catch(err) {
      alert('Override Network Error');
    }
  };
  const timeLeft = diceTimeLeft
  const gameId = diceRoundId
  const isRolling = diceScrambleTrigger

  // Visual settling states
  const [displayRoll, setDisplayRoll] = useState('50.00')
  const [actualRoll, setActualRoll] = useState(null)
  const [toastResult, setToastResult] = useState(null) // { won: boolean, amount: number, payout: number }
  const [errorToast, setErrorToast] = useState(null)

  // Public Results Timeline (Max 20 draws)
  const [history] = useState([
    { id: 10891, roll: 45.21, won: false },
    { id: 10890, roll: 88.90, won: true },
    { id: 10889, roll: 12.45, won: false },
    { id: 10888, roll: 92.11, won: true },
    { id: 10887, roll: 55.00, won: true },
    { id: 10886, roll: 22.30, won: false },
    { id: 10885, roll: 77.10, won: true },
    { id: 10884, roll: 11.20, won: false },
    { id: 10883, roll: 89.90, won: true },
    { id: 10882, roll: 64.00, won: true }
  ])

  // UI state filters
  const [activeTab, setActiveTab] = useState('drawHistory') // 'drawHistory' | 'myBets'
  const [myBetsFilter, setMyBetsFilter] = useState('all') // 'all' | 'wins'
  const [showMoreResults, setShowMoreResults] = useState(false)


  // Clamp Target ranges based on current mode
  const clampTarget = (val, cond) => {
    let t = parseFloat(val)
    if (isNaN(t)) return cond === 'range' ? 45.00 : 50.00
    if (cond === 'range') {
      if (t < 0.00) t = 0.00
      if (t > 90.00) t = 90.00
    } else {
      if (t < 4.90) t = 4.90
      if (t > 95.10) t = 95.10
    }
    return parseFloat(t.toFixed(2))
  }

  // Probability calculations
  const winChance = condition === 'over' 
    ? 100 - target 
    : condition === 'under'
      ? target
      : 10 // Range mode is a fixed size 10 selection (10% chance)

  const calculatedMult = (100 - diceHouseFee) / winChance
  const multiplier = Math.max(1.03, Math.min(20.00, calculatedMult)).toFixed(2)
  const potentialProfit = (betAmount * parseFloat(multiplier) - betAmount).toFixed(2)

  // Inputs
  const handleBetChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '')
    let num = cleaned === '' ? '' : parseInt(cleaned)
    if (num !== '' && num > 1000) num = 1000
    setBetAmount(num)
  }

  const handleMultiplier = (action) => {
    if (action === 'min') setBetAmount(1)
    else if (action === 'max') setBetAmount(Math.min(1000, Math.floor(balance)))
    else if (action === 'half') setBetAmount(prev => Math.max(1, Math.round(prev / 2)))
    else if (action === 'double') setBetAmount(prev => Math.min(1000, Math.min(Math.floor(balance), prev * 2)))
  }

  const handleSliderChange = (e) => {
    setTarget(clampTarget(e.target.value, condition))
  }

  // Place bet action
  const handlePlaceBet = async () => {
    const parsedAmount = betAmount === '' ? 0 : parseInt(betAmount)
    if (parsedAmount > balance || parsedAmount < 1 || parsedAmount > 1000 || isRolling || betPlaced || loading) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const res = await fetch(`${API_BASE}/api/games/place-bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gameType: 'dice',
          betType: condition,
          betValue: String(target),
          amount: parsedAmount
        })
      });

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place bet')
      }

      if (data.walletBalance !== undefined) {
        setRealBalance(data.walletBalance)
      }

      setBetPlaced(true)
      setBetDetails({
        amount: parsedAmount,
        condition: condition,
        target: target,
        multiplier: parseFloat(multiplier),
        id: data.bet?._id || data.bet?.id,
        roundId: data.bet?.roundId
      })

      // Fetch latest bets immediately to display the new pending bet in the list
      fetchUserHistory()
    } catch (err) {
      console.error(err)
      setErrorToast(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  // Socket wagers scramble animation trigger
  useEffect(() => {
    if (isRolling) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActualRoll(null)
      setToastResult(null)
      let ticks = 0
      const interval = setInterval(() => {
        setDisplayRoll((Math.random() * 100).toFixed(2))
        ticks++
        if (ticks > 8) { // 0.8 seconds (8 ticks of 100ms)
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isRolling])

  // Settle wagers once server emits GAME_RESULT
  useEffect(() => {
    if (!isRolling && diceResult) {
      const finalRoll = diceResult.outcomeNumber
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayRoll(finalRoll.toFixed(2))
      setActualRoll(finalRoll)

      if (betPlaced && betDetails && String(diceResult.gameId) === String(betDetails.roundId)) {
        let userWon = false
        if (betDetails.condition === 'over') {
          userWon = finalRoll > betDetails.target
        } else if (betDetails.condition === 'under') {
          userWon = finalRoll < betDetails.target
        } else if (betDetails.condition === 'range') {
          userWon = finalRoll >= betDetails.target && finalRoll <= (betDetails.target + 10)
        }

        const payoutAmount = userWon ? parseFloat((betDetails.amount * betDetails.multiplier).toFixed(2)) : 0
        setToastResult({ won: userWon, amount: userWon ? payoutAmount - betDetails.amount : betDetails.amount, payout: payoutAmount })

        fetchUserHistory()

        setBetPlaced(false)
        setBetDetails(null)
      }
    }
  }, [isRolling, diceResult, betPlaced, betDetails])

  // Clear result toast auto-dismiss
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


  // Slider background track configurations
  const sliderGradient = condition === 'over'
    ? `linear-gradient(to right, #fee2e2 0%, #fee2e2 ${target}%, #dcfce7 ${target}%, #dcfce7 100%)`
    : condition === 'under'
      ? `linear-gradient(to right, #dcfce7 0%, #dcfce7 ${target}%, #fee2e2 ${target}%, #fee2e2 100%)`
      : `linear-gradient(to right, #fee2e2 0%, #fee2e2 ${target}%, #dcfce7 ${target}%, #dcfce7 ${target + 10}%, #fee2e2 ${target + 10}%, #fee2e2 100%)`

  const isLocked = dicePhase === 'locked' || diceTimeLeft <= 5
  const isBettingDisabled = isRolling || betPlaced || isLocked

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-slate-800 font-sans pb-20 relative select-none">
      {/* Floating Rules Button aligned symmetrically with back button */}
      <button
        onClick={() => setShowRules(true)}
        className="absolute -top-12 right-4 z-40 w-10 h-10 rounded-full bg-slate-950/60 hover:bg-slate-900/80 flex items-center justify-center border border-slate-800 shadow-lg backdrop-blur-sm cursor-pointer text-slate-300 hover:text-white transition-all active:scale-95"
        title="Rules"
      >
        <HelpCircle size={20} />
      </button>

      {/* ── RULES MODAL ── */}
      {showRules && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowRules(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-100 animate-[scaleUp_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors border-0">
              <X size={16} className="text-slate-500" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Sparkles size={16} className="text-primary" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Dice Pro Rules</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-650 leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
              <p>• <strong>Automatic 30s Cycle:</strong> The game runs continuously. A result is drawn automatically every 30 seconds.</p>
              <p>• <strong>Wager Modes:</strong>
                <br />- <strong>Roll Over:</strong> Bet that the rolled number will land higher than your target.
                <br />- <strong>Roll Under:</strong> Bet that the rolled number will land lower than your target.
                <br />- <strong>Range (10):</strong> Bet that the rolled number lands inside a custom size 10 range (e.g. 20.00 to 30.00). Wins exactly 9.80x payouts!
              </p>
              <p>• <strong>Bet Lock:</strong> Betting closes automatically when the timer reaches 5 seconds.</p>
              <p>• <strong>Provably Fair:</strong> Outcomes are generated via secure random seed hashing.</p>
            </div>
            <button onClick={() => setShowRules(false)} className="w-full mt-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 cursor-pointer border-0">
              Got It
            </button>
          </div>
        </div>
      )}

      
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
      )}
      
      {/* ── WALLET BALANCE CARD ── */}
      <div className="px-4 pt-4 relative z-10">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Wallet Balance</p>
            <p className="text-2xl font-bold text-slate-800 tracking-tight">₹{balance.toFixed(2)}</p>
          </div>
          <button onClick={() => onNavigate?.('wallet')} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer border-0">
            Wallet
          </button>
        </div>
      </div>

      {/* ── RECENT RESULTS SCOREBOARD ROW ── */}
      <div className="px-4 pt-3 relative z-10">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <History size={11} className="text-slate-400" /> Recent Results
            </span>
            <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Dice Rolls</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-0.5">
            {(diceHistory.length > 0 ? diceHistory : history).slice(0, 8).map((h, i) => (
              <div 
                key={i} 
                className={`shrink-0 min-w-[58px] py-1.5 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm transition-all hover:scale-105 ${
                  h.roll >= 50.00 
                    ? 'bg-emerald-500/10 border-emerald-100 text-emerald-600' 
                    : 'bg-rose-500/10 border-rose-100 text-rose-600'
                }`}
              >
                {h.roll.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pt-4 space-y-4">

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
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold border backdrop-blur-md z-20 flex items-center gap-1.5 animate-[slideDown_0.3s_ease-out] shadow-sm ${
              toastResult.won 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100/50'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {toastResult.won ? `Won: +₹${toastResult.amount.toFixed(2)}` : `Lost: -₹${toastResult.amount.toFixed(2)}`}
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
                {isRolling ? '00:00' : '00:' + String(Math.max(0, timeLeft)).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Digital Screen Display */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-150 rounded-2xl py-6 flex flex-col items-center justify-center relative min-h-[140px] shadow-inner">
            <div className={`text-6xl font-black tracking-tighter tabular-nums transition-all ${
              isRolling 
                ? 'text-slate-400 scale-95 blur-[0.5px]' 
                : actualRoll !== null 
                  ? (condition === 'over' 
                      ? (actualRoll > target ? 'text-emerald-600 scale-105' : 'text-slate-700') 
                      : condition === 'under'
                        ? (actualRoll < target ? 'text-emerald-600 scale-105' : 'text-slate-700')
                        : (actualRoll >= target && actualRoll <= target + 10 ? 'text-emerald-600 scale-105' : 'text-slate-700'))
                  : 'text-slate-700'
            }`}>
              {displayRoll}
            </div>

            {/* Display message below digital roll */}
            <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-center">
              {isRolling ? (
                <span className="text-primary flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Rolling Dice
                </span>
              ) : isLocked && !betPlaced ? (
                <span className="text-rose-500 flex items-center gap-1">
                  <Lock size={10} /> Betting Locked
                </span>
              ) : betPlaced && betDetails ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-indigo-650 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check size={9} /> Bet Placed: ₹{betDetails.amount}
                  </span>
                  <span className="text-slate-400 text-[8px] font-semibold lowercase">
                    ({betDetails.condition === 'over' ? 'over' : betDetails.condition === 'under' ? 'under' : 'range'} {
                      betDetails.condition === 'range' 
                        ? `${betDetails.target.toFixed(2)}-${(betDetails.target + 10).toFixed(2)}`
                        : betDetails.target.toFixed(2)
                    })
                  </span>
                </div>
              ) : (
                <span className="text-slate-400">Place Your Bet</span>
              )}
            </div>
          </div>

          {/* Slider track area */}
          <div className="my-8 relative px-1">
            <div className="relative h-3 w-full bg-slate-100 rounded-full shadow-inner border border-slate-200/50">
              
              {/* Pastel Gradient track */}
              <div 
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{ background: sliderGradient }}
              />

              {/* Target Marker Visual overlay */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-slate-450 z-10 transition-all duration-100" style={{ left: `${target}%` }} />

              {/* Knob thumb container */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-slate-300 rounded-full shadow-md z-20 flex items-center justify-center transition-all duration-100 pointer-events-none"
                style={{ left: `${target}%` }}
              >
                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
              </div>

              {/* Range End Knob Thumb (Only in Range mode) */}
              {condition === 'range' && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-slate-350 rounded-full shadow-md z-20 flex items-center justify-center transition-all duration-105 pointer-events-none"
                  style={{ left: `${target + 10}%` }}
                >
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                </div>
              )}

              {/* Drag input overlaid */}
              <input
                type="range"
                min={condition === 'range' ? '0' : '4.9'}
                max={condition === 'range' ? '90' : '95.1'}
                step="0.01"
                value={target}
                onChange={handleSliderChange}
                disabled={isBettingDisabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-30"
              />

              {/* Pin indicator for actual rolled result */}
              {!isRolling && actualRoll !== null && (
                <div 
                  className="absolute -top-4 w-5 h-5 bg-indigo-655 rounded-full shadow-md z-20 flex items-center justify-center border-2 border-white transition-all duration-500 animate-[bounce_1s_infinite] -translate-x-1/2"
                  style={{ left: `${actualRoll}%` }}
                >
                  <span className="text-[7px] text-white font-extrabold">{Math.round(actualRoll)}</span>
                </div>
              )}

            </div>

            {/* scale labels */}
            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-2 px-0.5">
              <span>0</span>
              <span>25</span>
              <span>55</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* Range Mode Quick Select Options */}
          {condition === 'range' && (
            <div className="flex flex-wrap gap-2 justify-center mb-1 animate-[fadeIn_0.15s_ease-out]">
              {[0, 20, 40, 60, 80].map((start) => (
                <button
                  key={start}
                  disabled={isBettingDisabled}
                  onClick={() => setTarget(start)}
                  className={`px-3 py-1.5 border rounded-xl text-[10px] font-black tracking-wider transition-all cursor-pointer border-0 outline-none ${
                    target === start
                      ? 'bg-primary text-white border-primary shadow-sm shadow-indigo-150'
                      : 'bg-slate-50 text-slate-605 border-slate-200 hover:border-slate-350'
                  }`}
                >
                  {start} - {start + 10}
                </button>
              ))}
            </div>
          )}

          {/* Stats details capsule grid */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/50 mb-1">
            <div className="bg-white border border-slate-150 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Multiplier</span>
              <span className="text-sm font-bold text-slate-805">{multiplier}x</span>
            </div>
            <div className="bg-white border border-indigo-100 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[9px] text-indigo-500 font-semibold uppercase tracking-wider mb-0.5">
                {condition === 'over' ? 'Roll Over' : condition === 'under' ? 'Roll Under' : 'Roll Range'}
              </span>
              <span className="text-sm font-extrabold text-slate-850">
                {condition === 'range' ? `${target.toFixed(2)}-${(target+10).toFixed(2)}` : target.toFixed(2)}
              </span>
            </div>
            <div className="bg-white border border-slate-150 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm">
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Win Chance</span>
              <span className="text-sm font-bold text-slate-805">{winChance.toFixed(2)}%</span>
            </div>
          </div>

          {/* Interactive controls (with locking overlay) */}
          <div className="relative p-0.5 rounded-3xl overflow-hidden">
            {isLocked && timeLeft <= 5 && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-[1.5px] rounded-3xl z-30 flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out]">
                <Clock size={28} className="text-rose-500 mb-1.5 animate-bounce" />
                <span className="text-rose-600 text-[10px] font-black uppercase tracking-widest">Betting Locked</span>
                <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-500 to-red-600 font-mono tracking-tighter animate-[scaleUp_0.5s_infinite_alternate] drop-shadow-sm">
                  00:{String(timeLeft).padStart(2, '0')}
                </span>
              </div>
            )}

            {/* Interactive controls */}
            <div className="space-y-3">
            
            {/* Condition Mode selector */}
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50">
              {['under', 'over', 'range'].map((cond) => {
                const isActive = condition === cond
                return (
                  <button
                    key={cond}
                    onClick={() => {
                      setCondition(cond)
                      if (cond === 'range') {
                        setTarget(45.00) // Default start range
                      } else {
                        setTarget(50.50)
                      }
                    }}
                    disabled={isBettingDisabled}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border-0 outline-none disabled:cursor-not-allowed ${
                      isActive 
                        ? 'bg-white text-slate-850 shadow-sm border border-slate-200/10' 
                        : 'text-slate-505 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    {cond === 'under' ? 'Roll Under' : cond === 'over' ? 'Roll Over' : 'Range (10)'}
                  </button>
                )
              })}
            </div>

            {/* bet amount input field */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-between">
              <div className="flex items-center pl-2 flex-1">
                <span className="text-slate-400 text-xs font-bold mr-1">₹</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={betAmount}
                  onChange={(e) => handleBetChange(e.target.value)}
                  onBlur={() => {
                    if (betAmount === '' || parseInt(betAmount) < 1) setBetAmount(1)
                  }}
                  disabled={isBettingDisabled}
                  className="bg-transparent text-slate-805 font-extrabold text-sm outline-none w-full border-0 font-mono"
                  placeholder="1 - 1000"
                />
              </div>
              <div className="flex gap-1 pr-0.5">
                {['½', '2x', 'Max'].map(action => (
                  <button 
                    key={action}
                    onClick={() => handleMultiplier(action === '½' ? 'half' : action === '2x' ? 'double' : 'max')}
                    disabled={isBettingDisabled}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-605 text-[10px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50 border-0"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center px-1 text-[10px]">
              <span className="text-slate-400 font-medium">Profit on Win</span>
              <span className="font-bold text-emerald-600 font-mono">₹{potentialProfit}</span>
            </div>

            {/* Bet Button state resolver */}
            {betPlaced ? (
              <div className="w-full py-3.5 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-700 font-bold flex items-center justify-center gap-2 text-xs shadow-sm">
                <Loader2 size={14} className="animate-spin" />
                Bet Placed — Waiting for result...
              </div>
            ) : isLocked ? (
              <div className="w-full py-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold flex items-center justify-center gap-1.5 text-xs">
                <Lock size={12} />
                Betting Closed (Locks at 5s)
              </div>
            ) : (
              <button 
                onClick={handlePlaceBet}
                disabled={betAmount > balance || betAmount <= 0 || loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-1 border-0"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} fill="white" className="border-0 outline-none" />
                )}
                {loading ? 'Placing Bet...' : `Place Bet (₹${betAmount})`}
              </button>
            )}

          </div>
          </div> {/* End of Interactive controls container */}
        </div>

        {/* ── DUAL TAB HISTORY SECTION ── */}
        <div className="space-y-3 pb-6 mt-4">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('drawHistory')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
                activeTab === 'drawHistory'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-505 hover:text-slate-700 bg-transparent'
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
                  : 'text-slate-505 hover:text-slate-700 bg-transparent'
              }`}
            >
              <Clock size={14} className={activeTab === 'myBets' ? 'text-primary' : 'text-slate-400'} />
              My Bets
            </button>
          </div>

          {/* Draw History List */}
          {activeTab === 'drawHistory' && (
            <div className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm space-y-3 animate-[fadeIn_0.15s_ease-out]">
              {(diceHistory.length > 0 ? diceHistory : history).slice(0, showMoreResults ? 20 : 10).map((res, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold py-1.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <span className="text-slate-400 font-mono">Period #{res.id}</span>
                  <div className="flex items-center gap-3">
                    <span className={`w-14 text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      res.roll >= 50.00 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                      {res.roll >= 50.00 ? 'High' : 'Low'}
                    </span>
                    <span className={`w-14 h-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow-sm ${
                      res.roll >= 50.00 ? 'bg-emerald-500 border border-emerald-450' : 'bg-rose-500 border border-rose-450'
                    }`}>
                      {parseFloat(res.roll).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              {(diceHistory.length > 0 ? diceHistory : history).length > 10 && (
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
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Wagers Log</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                  <button
                    onClick={() => setMyBetsFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border-0 outline-none ${
                      myBetsFilter === 'all'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-505 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setMyBetsFilter('wins')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border-0 outline-none ${
                      myBetsFilter === 'wins'
                        ? 'bg-white text-slate-850 shadow-sm'
                        : 'text-slate-505 hover:text-slate-700 bg-transparent'
                    }`}
                  >
                    Wins Only
                  </button>
                </div>
              </div>

              {(() => {
                const diceBets = betsList
                  .filter(b => b.gameType === 'dice')
                  .map(b => {
                    const formattedDate = new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    const targetLabel = b.betType === 'range'
                      ? `RANGE ${parseFloat(b.betValue).toFixed(2)}-${(parseFloat(b.betValue)+10).toFixed(2)}`
                      : `${b.betType.toUpperCase()} ${parseFloat(b.betValue).toFixed(2)}`
                    
                    return {
                      id: b._id ? `BET-${b._id.slice(-6).toUpperCase()}` : '',
                      period: b.roundId,
                      target: targetLabel,
                      wager: b.betAmount,
                      outcome: b.outcome || 'Waiting...',
                      profit: b.status === 'pending' ? 0 : b.status === 'won' ? parseFloat((b.payout - b.betAmount).toFixed(2)) : -b.betAmount,
                      status: b.status === 'pending' ? 'Pending' : b.status === 'won' ? 'Won' : 'Lost',
                      date: formattedDate
                    }
                  })
                const filteredBets = diceBets.filter((bet) => myBetsFilter === 'all' || bet.status === 'Won')

                if (diceBets.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No bets placed yet. Place some wagers to track them here!
                    </div>
                  )
                }

                if (filteredBets.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No winning bets found.
                    </div>
                  )
                }

                return (
                  <div className="max-h-[360px] overflow-y-auto pr-0.5 space-y-3">
                    {filteredBets.map((bet) => (
                      <div key={bet.id} className="border border-slate-105 bg-slate-50/50 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                        {/* Top Row: Period ID & Status */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-455 font-bold font-mono">Period #{bet.period}</span>
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
                            <span className="text-slate-450 font-semibold">Target:</span>
                            <span className="font-black text-[10px] px-2 py-0.5 rounded-lg border bg-indigo-50 border-indigo-100 text-indigo-750">
                              {bet.target}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-450 font-semibold">Wager:</span>
                            <span className="font-extrabold text-slate-700 font-mono">₹{bet.wager}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Outcome & Profit */}
                        <div className="flex justify-between items-center text-xs border-t border-slate-100/85 pt-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-450 font-semibold">Roll Outcome:</span>
                            <span className={`font-bold text-[10px] ${
                              bet.outcome === 'Waiting...' ? 'text-amber-600' : 'text-slate-650'
                            }`}>{bet.outcome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-450 font-semibold">Profit:</span>
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

      </div>

      {/* Floating Game Lobby Grid Overlay */}
      <GameLobbyModal 
        isOpen={showLobby} 
        onClose={() => setShowLobby(false)} 
        onNavigate={onNavigate}
        activeGameId="diceGame"
      />
    </div>
  )
}
