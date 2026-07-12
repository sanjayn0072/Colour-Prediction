import { useState, useEffect } from 'react'
import { translateError } from '../utils/errorTranslator'
import { ArrowLeft, Info, Banknote, Ticket, Gift, Sparkles, X, Gamepad2, AlertCircle, Trophy, Copy, Check } from 'lucide-react'
import { useUser } from '../context/UserContext'
import GameLobbyModal from '../components/GameLobbyModal'

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.top = "0"
    textArea.style.left = "0"
    textArea.style.position = "fixed"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Fallback copy failed', err)
    }
    document.body.removeChild(textArea)
    return Promise.resolve()
  }
}

/* ── GAME-RELATED PRIZE DEFINITIONS ── */
const WHEEL_PRIZES = [
  { id: 1, label: 'Bonus ₹500', icon: Gift, color: 'from-indigo-100 to-indigo-50/30', val: 500, type: 'bonus', desc: '₹500 Bonus Wallet (10x Wager)', wager: '10x Wagering', textColor: 'text-indigo-950', iconColor: 'text-indigo-600' },
  { id: 2, label: 'Cash ₹10', icon: Banknote, color: 'from-emerald-100 to-emerald-50/30', val: 10, type: 'cash', desc: '₹10 Cash (No Wager)', wager: 'No wagering', textColor: 'text-emerald-950', iconColor: 'text-emerald-600' },
  { id: 3, label: 'Voucher 50%', icon: Ticket, color: 'from-amber-100 to-yellow-50/30', val: 'SPIN50', type: 'voucher', desc: '50% Extra Deposit Bonus Code', wager: 'No wagering', textColor: 'text-amber-950', iconColor: 'text-amber-600' },
  { id: 4, label: 'Cash ₹50', icon: Banknote, color: 'from-emerald-100 to-emerald-50/30', val: 50, type: 'cash', desc: '₹50 Cash (No Wager)', wager: 'No wagering', textColor: 'text-emerald-950', iconColor: 'text-emerald-600' },
  { id: 5, label: 'Bonus ₹100', icon: Gift, color: 'from-indigo-100 to-indigo-50/30', val: 100, type: 'bonus', desc: '₹100 Bonus Wallet (10x Wager)', wager: '10x Wagering', textColor: 'text-indigo-950', iconColor: 'text-indigo-600' },
  { id: 6, label: 'Voucher 25%', icon: Ticket, color: 'from-amber-100 to-yellow-50/30', val: 'LUCKY25', type: 'voucher', desc: '25% Extra Deposit Bonus Code', wager: 'No wagering', textColor: 'text-amber-950', iconColor: 'text-amber-600' },
  { id: 7, label: 'Cash ₹20', icon: Banknote, color: 'from-emerald-100 to-emerald-50/30', val: 20, type: 'cash', desc: '₹20 Cash (No Wager)', wager: 'No wagering', textColor: 'text-emerald-950', iconColor: 'text-emerald-600' },
  { id: 8, label: 'Bonus ₹250', icon: Gift, color: 'from-indigo-100 to-indigo-50/30', val: 250, type: 'bonus', desc: '₹250 Bonus Wallet (10x Wager)', wager: '10x Wagering', textColor: 'text-indigo-950', iconColor: 'text-indigo-600' },
]

const SEGMENT_ANGLE = 45

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export default function SpinWheel({ onNavigate }) {
  const { user, fetchUserHistory, addVoucher, wagerMultipliers } = useUser()
  const [showLobby, setShowLobby] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    const finalMsg = type === 'error' ? translateError(msg) : msg;
    setToast({ msg: finalMsg, type })
    setTimeout(() => setToast(null), 3500)
  }
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [copiedVoucher, setCopiedVoucher] = useState(false)
  
  // Sync latest user details from server on mount
  useEffect(() => {
    fetchUserHistory()
  }, [])

  const totalDeposit = user?.totalDeposits || 0
  const totalSpinsEarned = Math.floor(totalDeposit / 200)
  const spinsLeft = Math.max(0, totalSpinsEarned - (user?.spinsCount || 0))

  const [wonPrize, setWonPrize] = useState(null)
  const [showWinModal, setShowWinModal] = useState(false)

  // Live winners ticker feed (using game rewards)
  const [recentWinners, setRecentWinners] = useState([
    { uid: '382941', prize: '₹250 Bonus' },
    { uid: '194827', prize: '50% Voucher' },
    { uid: '902844', prize: '₹50 Cash' },
    { uid: '782912', prize: '₹100 Bonus' },
    { uid: '482015', prize: '25% Voucher' },
    { uid: '682949', prize: '₹10 Cash' },
    { uid: '293818', prize: '₹500 Bonus' },
    { uid: '582030', prize: '₹20 Cash' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      const randomUid = String(Math.floor(100000 + Math.random() * 900000))
      const randomPrize = WHEEL_PRIZES[Math.floor(Math.random() * WHEEL_PRIZES.length)].label
      setRecentWinners(prev => [
        { uid: randomUid, prize: randomPrize },
        ...prev.slice(0, 7)
      ])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSpin = async () => {
    if (isSpinning || spinsLeft <= 0) return

    setIsSpinning(true)
    setCopiedVoucher(false)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/games/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Spin failed')
      }

      const data = await res.json()
      const prizeIndex = data.prizeIndex
      const extraSpins = 6 // Number of full rotations
      
      const targetSegmentAngle = prizeIndex * SEGMENT_ANGLE
      // Add slight offset so it lands exactly in the middle of the slice
      const targetAngle = 360 - targetSegmentAngle
      const newRotation = rotation + (360 * extraSpins) + targetAngle - (rotation % 360)

      setRotation(newRotation)

      setTimeout(() => {
        setIsSpinning(false)
        const prize = WHEEL_PRIZES[prizeIndex]
        const displayPrize = { ...prize, val: data.value }
        setWonPrize(displayPrize)
        setShowWinModal(true)

        if (displayPrize.type === 'voucher') {
          addVoucher(displayPrize.val)
        }

        // Sync and refresh context states from backend
        fetchUserHistory()
      }, 4500)

    } catch (err) {
      setIsSpinning(false)
      showToast(err.message, 'error')
    }
  }

  const handleCopyVoucher = (code) => {
    copyToClipboard(code)
    setCopiedVoucher(true)
    setTimeout(() => setCopiedVoucher(false), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-slate-800 relative overflow-hidden font-sans pb-20 select-none">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-indigo-650'
          } text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2`}
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
      
      {/* ── BACKGROUND LIGHTING AND GLOWS ── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[180%] h-[50vh] bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-24 h-24 bg-indigo-400/5 rounded-full blur-xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-32 h-32 bg-purple-400/5 rounded-full blur-xl pointer-events-none" />

      {/* ── LIVE WINNERS TICKER ── */}
      <div className="relative z-10 bg-slate-100/80 backdrop-blur-md border-y border-slate-200/80 py-2.5 overflow-hidden select-none shadow-sm">
        <div className="flex items-center gap-0 animate-[marquee_25s_linear_infinite] whitespace-nowrap">
          {[...recentWinners, ...recentWinners].map((winner, index) => (
            <div key={index} className="inline-flex items-center gap-2 mx-6 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
              <span className="font-mono font-bold text-slate-600">UID {winner.uid.slice(0,3) + '***' + winner.uid.slice(-1)}</span>
              <span className="text-slate-400">won</span>
              <span className="font-extrabold text-amber-600 flex items-center gap-1">
                <Sparkles size={11} className="inline text-amber-500" />
                {winner.prize}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 overflow-y-auto pt-4 space-y-5">
        
        {/* ── PROMOTIONAL CARD ── */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50/50 to-rose-50 rounded-3xl p-5 border border-indigo-100/60 shadow-md relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_black_1px,_transparent_1px)] bg-[size:10px_10px]" />
          <h1 className="text-2xl font-black tracking-tight text-indigo-950 italic mb-1 flex items-center gap-1.5 font-sans">
            LUCKY <span className="text-indigo-600">SPIN</span>
          </h1>
          <p className="text-xs text-slate-600 leading-snug max-w-[70%] font-semibold">
            Complete deposits to earn spin keys. Win up to <span className="text-indigo-600 font-bold">₹500 Bonus Wallet</span> or Deposit Vouchers instantly!
          </p>
          <div className="absolute -bottom-2 -right-2 w-28 h-28 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-3 right-4 flex items-center justify-center p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm">
            <Trophy className="text-indigo-500 w-8 h-8" />
          </div>
        </div>

        {/* ── REDESIGNED MODERN WHEEL ── */}
        <div className="relative w-full max-w-[325px] aspect-square mx-auto my-3 shrink-0 flex items-center justify-center">
          
          {/* Subtle Outer Shadow */}
          <div className="absolute inset-0 rounded-full bg-slate-200/50 blur-md -z-10" />
          
          {/* Gold Bezel Frame */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-600 shadow-[0_15px_30px_rgba(0,0,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.6)] p-2 z-10 flex items-center justify-center">
            
            {/* Inner frame with static, elegant indicators */}
            <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-inner">
              {[...Array(24)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_0_4px_rgba(251,191,36,0.6)]"
                  style={{
                    top: '50%', left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 15}deg) translateY(-141px)`
                  }}
                />
              ))}
            </div>

            {/* The Rotating Slice-wheel */}
            <div 
              className="absolute inset-2.5 rounded-full overflow-hidden border border-amber-500/20 transition-transform ease-[cubic-bezier(0.15,0.70,0.10,1.0)] shadow-lg"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transitionDuration: isSpinning ? '4500ms' : '0ms'
              }}
            >
              {WHEEL_PRIZES.map((prize, i) => {
                const rotation = i * SEGMENT_ANGLE;
                return (
                  <div 
                    key={i}
                    className="absolute inset-0 origin-center"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    {/* Pie Segment */}
                    <div 
                      className={`absolute w-full h-full bg-gradient-to-b ${prize.color}`}
                      style={{
                        clipPath: 'polygon(50% 50%, 29.29% 0%, 70.71% 0%)'
                      }}
                    />
                    
                    {/* Segment text and Icon */}
                    <div className="absolute top-0 left-0 w-full h-[50%] flex flex-col items-center pt-7 select-none">
                      <span className={`text-[9.5px] font-black uppercase tracking-wider mb-2 text-center px-10 leading-none ${prize.textColor}`}>
                        {prize.label}
                      </span>
                      <prize.icon size={18} className={prize.iconColor} />
                    </div>
                  </div>
                );
              })}

              {/* Gold Slice Dividers to cover clip-path gaps and make the wheel look extremely premium */}
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-[50%] bg-gradient-to-b from-amber-400 via-amber-500/50 to-transparent origin-bottom z-10"
                  style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
                />
              ))}
            </div>

            {/* Center Dial Hub & Trigger Button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white border border-amber-400/40 p-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-20">
              <button 
                onClick={handleSpin}
                disabled={isSpinning || spinsLeft <= 0}
                className="w-full h-full rounded-full bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-400 hover:to-amber-600 border border-amber-300/20 flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_2px_4px_rgba(251,191,36,0.2)] active:scale-95 transition-all cursor-pointer disabled:from-slate-100 disabled:to-slate-200 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent pointer-events-none" />
                <span className="text-sm font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)] group-disabled:text-slate-400 tracking-wider">
                  SPIN
                </span>
                {spinsLeft > 0 && !isSpinning && (
                  <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded-full mt-0.5 animate-pulse shadow-sm">
                    {spinsLeft}
                  </span>
                )}
              </button>
            </div>
            
            {/* Elegant Pointer Pin */}
            <div 
              className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_6px_15px_rgba(217,119,6,0.35)] ${isSpinning ? 'pointer-ticking' : ''}`}
              style={{ transformOrigin: '50% 30%' }}
            >
              {/* Premium gauge needle pointer */}
              <div className="w-6 h-10 flex flex-col items-center relative">
                {/* Pivot cap with red indicator ruby */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-500 border border-amber-400/40 flex items-center justify-center shadow-md relative z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
                </div>
                {/* Sleek needle pointing down */}
                <div className="absolute top-3 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[22px] border-l-transparent border-r-transparent border-t-amber-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]" />
              </div>
            </div>

          </div>

          {/* Stand base */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-36 h-6 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 rounded-t-2xl shadow-sm border-t border-amber-100 -z-10" />
        </div>

        {/* ── STATS & KEY METER ── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 shrink-0">
          <div className="grid grid-cols-2 gap-3 font-sans">
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Deposits</span>
              <span className="text-base font-extrabold text-slate-800 block mt-0.5">₹{totalDeposit.toLocaleString()}</span>
            </div>
            <div className="bg-indigo-50/40 border border-indigo-100/40 rounded-2xl p-3 text-center">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block">Keys Available</span>
              <span className="text-base font-extrabold text-indigo-700 block mt-0.5">{spinsLeft} Spin Key{spinsLeft !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 font-sans">
              <span>Deposit Milestones Progress</span>
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px]">{Math.floor(totalDeposit / 200)} / 10 Spins Earned</span>
            </div>
            
            <div className="relative px-3 py-2 bg-slate-50 border border-slate-150 rounded-2xl">
              <div className="h-1.5 w-[92%] bg-slate-200 rounded-full absolute top-[21px] left-3" />
              <div 
                className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full absolute top-[21px] left-3 transition-all duration-700" 
                style={{ width: `${Math.min(92, (totalDeposit / 2000) * 92)}%` }} 
              />
              
              <div className="relative flex justify-between px-1">
                {[
                  { val: 200, label: '₹200' },
                  { val: 1000, label: '₹1K' },
                  { val: 1300, label: '₹1.3K' },
                  { val: 2000, label: '₹2K' },
                ].map((milestone, i) => {
                  const isReached = totalDeposit >= milestone.val
                  return (
                    <div key={i} className="flex flex-col items-center z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm transition-all border font-mono font-bold ${
                        isReached 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-100' 
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] text-slate-500 font-extrabold mt-1">{milestone.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Dynamic Warning Banner */}
          <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <AlertCircle size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10.5px] text-slate-600 leading-relaxed font-semibold">
              Winnings from cash/bonus segments carry a <span className="font-bold text-slate-800">10x Wagering Requirement</span> before withdrawal. Vouchers carry no wagering requirements and can be used on your next deposit.
            </p>
          </div>

          {/* Deposit More button */}
          <button 
            onClick={() => onNavigate?.('wallet')}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm tracking-wider uppercase rounded-2xl shadow-lg shadow-indigo-200/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 border-0"
          >
            Deposit Funds to Unlock Keys
          </button>
        </div>

        {/* ── PRIZE CATALOG GRID ── */}
        <div className="space-y-3 shrink-0 pb-10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1.5 flex items-center gap-1.5">
            <Info size={14} className="text-slate-400" />
            Prize segments details
          </h3>
          <div className="grid grid-cols-2 gap-3 font-sans">
            {WHEEL_PRIZES.map((prize) => {
              const Icon = prize.icon
              const isSelected = selectedCatalogItem === prize.id
              return (
                <div 
                  key={prize.id}
                  onClick={() => setSelectedCatalogItem(isSelected ? null : prize.id)}
                  className={`bg-white border rounded-2xl p-3.5 flex flex-col gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${prize.color} flex items-center justify-center text-white shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-800 truncate">{prize.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug">
                    {prize.desc}
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full self-start ${
                    prize.wager === 'No wagering' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {prize.wager}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── WIN MODAL DIALOG ── */}
      {showWinModal && wonPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          
          {/* Confetti / Sparkle background visual elements around the modal */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[35%] left-[20%] w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-60" />
            <div className="absolute top-[40%] right-[25%] w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce opacity-50" />
            <div className="absolute top-[55%] left-[28%] w-2 h-2 bg-indigo-400 rounded-full animate-pulse opacity-40" />
            <div className="absolute top-[60%] right-[20%] w-3.5 h-3.5 bg-purple-400 rounded-full animate-ping opacity-30" />
          </div>

          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-1.5 relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 animate-[slideUp_0.3s_ease-out]">
            
            {/* Background design pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#f59e0b_1px,_transparent_1px)] bg-[size:20px_20px] opacity-[0.03] pointer-events-none rounded-[2.5rem]" />

            {/* Top Badge: Floating Gold Trophy (Not cut off because there is no overflow-hidden on the wrapper!) */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-amber-950 rounded-full border-4 border-white shadow-[0_8px_24px_rgba(245,158,11,0.4)] flex items-center justify-center z-10 animate-[bounce_3s_infinite]">
              <Trophy size={38} className="text-amber-950" />
            </div>
            
            <div className="bg-gradient-to-b from-slate-50/50 to-white rounded-[2.2rem] pt-14 pb-8 px-6 text-center relative overflow-hidden border border-slate-100/50">
              
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100/30 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-100/20 rounded-full blur-2xl pointer-events-none" />

              <h2 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">Congratulations!</h2>
              <p className="text-xs text-slate-400 mb-6 font-semibold uppercase tracking-wider">You won a premium reward</p>
              
              {/* Premium inner prize card styled like a luxury ticket */}
              <div className="bg-white rounded-3xl p-6 border border-amber-200/50 shadow-[0_8px_24px_rgba(245,158,11,0.06)] mb-6 flex flex-col items-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_center,_black_1px,_transparent_1px)] bg-[size:8px_8px]" />
                
                {/* Ticket side cutouts for visual style */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-50 border-r border-amber-200/40 rounded-r-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-slate-50 border-l border-amber-200/40 rounded-l-full" />

                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-3.5 shadow-sm">
                  <wonPrize.icon size={30} className="text-amber-600 animate-[pulse_2s_infinite]" />
                </div>
                
                <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 tracking-tight leading-none mb-1.5">
                  {wonPrize.label}
                </span>
                <span className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">{wonPrize.desc}</span>
              </div>
              
              {/* Copy Code Block if it is a deposit voucher (string) */}
              {typeof wonPrize.val === 'string' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 mb-6 space-y-2 text-left shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-center">Your Deposit Voucher Code</span>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-mono font-black text-indigo-600 tracking-wider">{wonPrize.val}</span>
                    <button
                      onClick={() => handleCopyVoucher(wonPrize.val)}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all cursor-pointer bg-transparent border-0 outline-none p-0"
                    >
                      {copiedVoucher ? (
                        <><Check size={14} className="text-emerald-500" /> <span className="text-emerald-500 font-extrabold">Copied</span></>
                      ) : (
                        <><Copy size={14} /> Copy</>
                      )}
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-normal text-center">
                    Copy and apply this voucher on deposit page to get extra bonus.
                  </span>
                </div>
              )}

              {wonPrize.type === 'bonus' && (
                <div className="flex items-center gap-2 justify-center text-amber-700 bg-amber-50/60 border border-amber-200/50 px-4 py-2.5 rounded-2xl text-[11px] font-semibold mb-6 max-w-xs mx-auto shadow-sm">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  <span>Credited with {wagerMultipliers?.spinBonus ?? 10}x wagering requirement.</span>
                </div>
              )}
              {wonPrize.type === 'cash' && (
                <div className="flex items-center gap-2 justify-center text-emerald-700 bg-emerald-50/60 border border-emerald-200/50 px-4 py-2.5 rounded-2xl text-[11px] font-semibold mb-6 max-w-xs mx-auto shadow-sm">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>Credited directly to your cash balance with no wagering!</span>
                </div>
              )}
              {wonPrize.type === 'voucher' && (
                <div className="flex items-center gap-2 justify-center text-indigo-700 bg-indigo-50/60 border border-indigo-200/50 px-4 py-2.5 rounded-2xl text-[11px] font-semibold mb-6 max-w-xs mx-auto shadow-sm">
                  <Check size={14} className="text-indigo-500 shrink-0" />
                  <span>Automatically added to your Deposit Vouchers list!</span>
                </div>
              )}

              {/* Gold pulsing button with premium hover shadow */}
              <button 
                onClick={() => setShowWinModal(false)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-amber-500 text-amber-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_6px_20px_rgba(245,158,11,0.3)] active:scale-95 hover:scale-[1.01] transition-all cursor-pointer border-0 outline-none hover:brightness-105 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} className="text-amber-950/80 animate-spin" />
                Collect Winnings
              </button>
            </div>
            
            <button 
              onClick={() => setShowWinModal(false)}
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer bg-white shadow-md hover:text-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Game Lobby Grid Overlay */}
      <GameLobbyModal 
        isOpen={showLobby} 
        onClose={() => setShowLobby(false)} 
        onNavigate={onNavigate}
        activeGameId="spinWheel"
      />

      {/* Custom Styles and Animations */}
      <style>{`
        @keyframes pointer-tick {
          0% { transform: translateX(-50%) rotate(0deg); }
          15% { transform: translateX(-50%) rotate(16deg); }
          30% { transform: translateX(-50%) rotate(-6deg); }
          45% { transform: translateX(-50%) rotate(3deg); }
          60% { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }
        .pointer-ticking {
          animation: pointer-tick 0.1s infinite ease-out;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
