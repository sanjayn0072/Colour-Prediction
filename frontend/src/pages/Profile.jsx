import { useState, useEffect } from 'react'
import { useUser, resolveImg } from '../context/UserContext'
import { useGame } from '../context/GameContext'
import { getVipLevel, VIP_TIERS } from '../utils/vipTiers'
import { 
  Settings, Shield, History, HelpCircle, ChevronRight, LogOut, Award, 
  ArrowLeft, Mail, Phone, Lock, Eye, EyeOff, 
  MessageCircle, ChevronDown, ChevronUp,
  ShoppingBag, Check, Info as InfoIcon, Users, Gift, Trophy, Share2, Copy,
  ChevronLeft, AlertCircle, X, QrCode, BarChart3
} from 'lucide-react'

function generateNumeric16Id() {
  const now = new Date();
  const sec = String(now.getSeconds()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const unique = String(Math.floor(1000 + Math.random() * 9000));
  return `${sec}${min}${hour}${day}${month}${year}${unique}`;
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
    return Promise.resolve();
  }
}

const SUB_PAGES = {
  account: {
    title: 'Account Details',
    gradient: 'from-blue-500 to-indigo-600',
  },
  vip: {
    title: 'VIP Club & Rewards',
    gradient: 'from-amber-500 to-yellow-600',
  },
  refer: {
    title: 'Refer & Earn Hub',
    gradient: 'from-emerald-500 to-teal-600',
  },
  orders: {
    title: 'My Orders',
    gradient: 'from-pink-500 to-rose-600',
  },
  transactions: {
    title: 'Transaction History',
    gradient: 'from-purple-500 to-violet-600',
  },
  support: {
    title: 'Help & Support',
    gradient: 'from-orange-500 to-red-500',
  },
}

const createVipRewardTx = (selectedLevelView, rewardType, rewardAmount) => {
  const timestamp = Date.now()
  const dateStr = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  const labelMap = {
    levelUp: 'Level Up',
    weekly: 'Weekly',
    monthly: 'Monthly'
  }
  return {
    id: generateNumeric16Id(),
    title: `VIP Lvl ${selectedLevelView} ${labelMap[rewardType]} Reward`,
    amount: rewardAmount,
    status: 'Completed',
    date: dateStr,
    game: 'VIP Reward',
    timestamp
  }
}

const createReferralRewardTx = (amount) => {
  const timestamp = Date.now()
  const dateStr = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  return {
    id: generateNumeric16Id(),
    title: 'Referral Commission Claimed',
    amount,
    status: 'Completed',
    date: dateStr,
    game: 'Referral Reward',
    timestamp
  }
}

export default function Profile({ onLogout, initialSubPage, onNavigate }) {
  const { user, setUser, orders, depositRecords, betRecords, fetchWinLossStats } = useUser()
  const [subPage, setSubPage] = useState(initialSubPage || null)
  const [prevInitialSubPage, setPrevInitialSubPage] = useState(initialSubPage)
  const [showWinLossModal, setShowWinLossModal] = useState(false)
  const [winLossStats, setWinLossStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleOpenWinLossStats = async (e) => {
    if (e) e.stopPropagation()
    setShowWinLossModal(true)
    setLoadingStats(true)
    const stats = await fetchWinLossStats()
    setWinLossStats(stats)
    setLoadingStats(false)
  }

  if (initialSubPage !== prevInitialSubPage) {
    setPrevInitialSubPage(initialSubPage)
    setSubPage(initialSubPage)
  }

  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [language, setLanguage] = useState('English')
  const [showSafeCenter, setShowSafeCenter] = useState(false)
  const [showPolicyText, setShowPolicyText] = useState(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFaVerified, setTwoFaVerified] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)
  const [showVipMilestones, setShowVipMilestones] = useState(true)
  const [totpCode, setTotpCode] = useState('')
  const [twoFaCopied, setTwoFaCopied] = useState(false)
  const [totpError, setTotpError] = useState(false)
  const [gameMode, setGameMode] = useState('Parity (Standard)')
  const [dailyBetLimit, setDailyBetLimit] = useState('No Limit')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const defaultAvatar = '/avatars/Avatar_1.jpg'

  const totalDeposit = user?.totalDeposits || 0
  
  const vipLevel = getVipLevel(totalDeposit)
  const totalWinnings = Math.max(parseFloat(user?.totalWinnings || 0), betRecords.filter(r => r.amount > 0 && r.game !== 'VIP Reward' && r.game !== 'Referral Reward').reduce((acc, curr) => acc + curr.amount, 0))
  const gamesPlayed = Math.max(parseInt(user?.gamesPlayed || 0, 10), betRecords.filter(r => r.amount < 0).length)

  const menuItems = [
    { id: 'vip', label: 'VIP Club & Privileges', icon: Award, color: 'text-amber-500 bg-amber-50' },
    { id: 'refer', label: 'Refer & Earn', icon: Users, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, color: 'text-pink-500 bg-pink-50' },
    { id: 'transactions', label: 'Transaction History', icon: History, color: 'text-purple-500 bg-purple-50' },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, color: 'text-orange-500 bg-orange-50' },
  ]

  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, color: 'text-red-500 bg-red-50' })
  }

  /* ── Sub Page Wrapper ── */
  if (subPage) {
    const meta = SUB_PAGES[subPage]
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
        {/* Sub-page header */}
        <div className={`relative bg-gradient-to-br ${meta.gradient} px-4 pt-8 pb-6 rounded-b-[1.5rem] overflow-hidden shrink-0`}>
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
          <button onClick={() => setSubPage(null)} className="relative z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors mb-3">
            <ArrowLeft size={16} className="text-white" />
          </button>
          <h1 className="relative z-10 text-lg font-bold text-white">{meta.title}</h1>
        </div>
        <div className="flex-1 px-4 pt-5 overflow-y-auto">
          <SubPageContent 
            page={subPage} 
            orders={orders} 
            onNavigate={(sub) => setSubPage(sub)} 
            onSelectAvatarClick={() => setShowAvatarPicker(true)}
          />
        </div>
      </div>
    )
  }

  /* ── Main Profile ── */
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      <div 
        onClick={() => setSubPage('account')}
        className="bg-white px-4 pt-8 pb-6 shadow-sm border-b border-slate-200 relative cursor-pointer hover:bg-slate-50/80 transition-colors"
      >
        {/* Settings Gear Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowSettingsModal(true)
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer text-slate-500"
        >
          <Settings size={20} />
        </button>

        <div className="flex items-center gap-4">
          <div 
            className="relative group shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setShowAvatarPicker(true)
            }}
          >
            {/* Animated Premium Glowing Halo */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-600 opacity-80 blur-[3px] group-hover:opacity-100 group-hover:blur-[5px] transition-all duration-500 animate-[spin_8s_linear_infinite]" />
            <div className="relative w-20 h-20 rounded-full bg-white p-1 cursor-pointer transition-transform duration-500 group-hover:scale-105">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                <img 
                  src={user?.avatar || defaultAvatar} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm z-10">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-full p-1.5 shadow-sm">
                <Award size={14} className="text-white" />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{user?.name || 'Demo User'}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{user?.email || 'demo@rrclub.com'}</p>
            <p className="text-[10px] text-slate-450 mt-1 font-mono font-bold flex items-center gap-1">
              UID: {user?.uid || '102948'}
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(user?.uid || '102948')
                  setToast('UID copied to clipboard!')
                }}
                className="p-0.5 rounded hover:bg-slate-100 transition-colors text-slate-450 hover:text-slate-650 cursor-pointer"
                title="Copy UID"
              >
                <Copy size={10} />
              </button>
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setSubPage('vip')
              }}
              className="inline-flex items-center gap-1.5 mt-2 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-left cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <Award size={12} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">VIP Level {vipLevel}</span>
            </button>
          </div>
        </div>

        <div 
          onClick={handleOpenWinLossStats}
          className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 pt-4 cursor-pointer hover:bg-slate-50/50 rounded-2xl p-1 transition-all"
          title="Click to view detailed win/loss stats"
        >
          <div className="text-center">
            <p className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-center gap-1">Total Winnings <BarChart3 size={11} className="text-slate-400" /></p>
            <p className="text-lg font-bold text-emerald-600">
              ₹{(totalWinnings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center border-l border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 flex items-center justify-center gap-1">Games Played <History size={11} className="text-slate-400" /></p>
            <p className="text-lg font-bold text-indigo-600">
              {gamesPlayed}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 flex-1">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Settings & Preferences</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'support') {
                    onNavigate?.('support')
                  } else if (item.id === 'admin') {
                    onNavigate?.('admin')
                  } else {
                    setSubPage(item.id)
                  }
                }}
                className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  index !== menuItems.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </button>
            )
          })}
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-6 flex items-center justify-center gap-2 py-4 bg-white border border-red-100 rounded-2xl text-red-600 hover:bg-red-50 transition-colors shadow-sm cursor-pointer"
        >
          <LogOut size={18} />
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>

      {/* Win/Loss Stats Modal */}
      {showWinLossModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowWinLossModal(false)}
        >
          <div 
            className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-700 relative overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500" />
                Win/Loss Statement
              </h2>
              <button 
                onClick={() => setShowWinLossModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer border-0"
              >
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4 pr-1 py-1">
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-slate-400">Loading betting aggregates...</p>
                </div>
              ) : winLossStats ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time-Period Statement</p>
                  
                  {/* Period Stats Grid */}
                  <div className="space-y-3">
                    {[
                      { key: 'today', title: 'Today (Real-time)', data: winLossStats.today },
                      { key: 'week', title: 'Last 7 Days', data: winLossStats.week },
                      { key: 'month', title: 'Last 30 Days', data: winLossStats.month },
                      { key: 'lifetime', title: 'Lifetime Account', data: winLossStats.lifetime }
                    ].map((period) => {
                      const net = period.data.net;
                      const isProfit = net >= 0;

                      return (
                        <div key={period.key} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700">{period.title}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isProfit 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                              {isProfit ? `+₹${net.toFixed(2)}` : `-₹${Math.abs(net).toFixed(2)}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-200/40 text-[10px] text-slate-500 font-medium">
                            <div>
                              <p className="text-[9px] text-slate-400">Total Wagered</p>
                              <p className="font-bold text-slate-700">₹{period.data.wagered.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400">Total Payout</p>
                              <p className="font-bold text-slate-700">₹{period.data.won.toFixed(2)}</p>
                            </div>
                          </div>

                          {period.key === 'lifetime' && (
                            <div className="text-[9px] text-slate-400 pt-1.5 flex justify-between font-bold">
                              <span>Total Rounds Played</span>
                              <span className="text-slate-600 font-black">{period.data.totalGames} Rounds</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs font-semibold text-slate-400">Failed to load statistics.</p>
                </div>
              )}
            </div>

            {/* Note */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 shrink-0">
              <p className="text-[9px] text-indigo-700 font-semibold leading-relaxed">
                ℹ️ Win/Loss statistics are computed from completed transaction aggregates directly inside the secure transaction engine.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal Overlay */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-700 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-primary animate-[spin_4s_linear_infinite]" />
                Security & Preferences
              </h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* Scrollable container for settings options */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              
              {/* Preferences Section */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Preferences</h3>

                {/* Game Mode Selection */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700">Default Game Mode</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{gameMode}</span>
                  </div>
                  <div className="relative">
                    <select
                      value={gameMode}
                      onChange={(e) => setGameMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      <option>Parity (Standard)</option>
                      <option>Sapre (3min)</option>
                      <option>Bcone (5min)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Responsible Gaming limit */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-755">Daily Bet Limit</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{dailyBetLimit}</span>
                  </div>
                  <div className="relative">
                    <select
                      value={dailyBetLimit}
                      onChange={(e) => setDailyBetLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      <option>No Limit (Standard)</option>
                      <option>₹1,000 / Day</option>
                      <option>₹5,000 / Day</option>
                      <option>₹10,000 / Day</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Dynamic Theme Selector / Animation Toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">Battery Saver Mode</span>
                    <span className="text-[8px] text-slate-400">Disable intensive UI animations</span>
                  </div>
                  <button
                    onClick={() => {
                      setAnimationsEnabled(!animationsEnabled)
                      setToast(!animationsEnabled ? 'Battery Saver enabled (animations reduced).' : 'Battery Saver disabled (animations enabled).')
                    }}
                    className={`w-10 h-5.5 rounded-full p-0.5 cursor-pointer transition-all flex items-center ${
                      !animationsEnabled ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-white shadow-sm flex items-center justify-center">
                      {!animationsEnabled ? <Check size={8} className="text-primary font-bold" /> : <X size={8} className="text-slate-400" />}
                    </span>
                  </button>
                </div>

                {/* Betting History Quick Summary Toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">VIP Milestones Progress</span>
                    <span className="text-[8px] text-slate-400">Display progress bars on dashboard</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowVipMilestones(!showVipMilestones)
                      setToast(!showVipMilestones ? 'VIP progress milestones enabled.' : 'VIP progress milestones disabled.')
                    }}
                    className={`w-10 h-5.5 rounded-full p-0.5 cursor-pointer transition-all flex items-center ${
                      showVipMilestones ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <span className="w-4.5 h-4.5 rounded-full bg-white shadow-sm flex items-center justify-center">
                      {showVipMilestones ? <Check size={8} className="text-primary font-bold" /> : <X size={8} className="text-slate-400" />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Policy Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'about', label: 'About Us' },
                    { id: 'responsible', label: 'Responsible' },
                    { id: 'fairplay', label: 'Fairplay' }
                  ].map((policy) => (
                    <button
                      type="button"
                      key={policy.id}
                      onClick={() => setShowPolicyText(policy.id)}
                      className="py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-slate-650 hover:bg-slate-100 text-[10px] font-extrabold transition-all cursor-pointer outline-none"
                    >
                      {policy.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-5 text-[8px] font-bold text-slate-400 pt-1 border-t border-slate-100">
              <span>Version: 1.1.4.0(1.0.4)</span>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Selection Modal Overlay */}
      {showAvatarPicker && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div 
            className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-wider">CHOOSE AVATAR</h2>
              <p className="text-[10px] text-slate-400 mt-1">Select a cartoon profile avatar</p>
            </div>

            <div className="grid grid-cols-4 gap-3 max-h-[45vh] overflow-y-auto p-1">
              {Array.from({ length: 12 }, (_, i) => {
                const avatarUrl = `/avatars/Avatar_${i + 1}.jpg`;
                const isSelected = user?.avatar === avatarUrl;
                return (
                  <button
                    key={i}
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
                        const response = await fetch(`${API_BASE}/api/auth/profile`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ avatar: avatarUrl })
                        });
                        if (response.ok) {
                          setUser(prev => ({ ...prev, avatar: avatarUrl }));
                        }
                      } catch (err) {
                        console.error('Failed to update profile picture:', err);
                      }
                      setShowAvatarPicker(false);
                    }}
                    className={`aspect-square rounded-2xl overflow-hidden bg-slate-50 border-2 transition-all p-1 hover:scale-105 active:scale-95 cursor-pointer ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={avatarUrl} className="w-full h-full object-cover" alt={`Avatar ${i + 1}`} />
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setShowAvatarPicker(false)}
              className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Safe Center Modal */}
      {showSafeCenter && (
        <SafeCenterModal onClose={() => setShowSafeCenter(false)} />
      )}

      {/* Policy Text Modal */}
      {showPolicyText && (
        <PolicyTextModal type={showPolicyText} onClose={() => setShowPolicyText(null)} />
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[90%] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
          <Check size={16} />
          <span className="flex-1 text-xs">{toast}</span>
        </div>
      )}
    </div>
  )
}

/* ── Sub Page Content ──────────────────────────────── */
function SubPageContent({ page, orders, onNavigate, onSelectAvatarClick }) {
  switch (page) {
    case 'account':
      return <AccountDetails onSelectAvatarClick={onSelectAvatarClick} />
    case 'vip':
      return <VipClub onNavigate={onNavigate} />
    case 'refer':
      return <ReferEarn />
    case 'orders':
      return <MyOrders orders={orders} />
    case 'transactions':
      return <TransactionHistory />
    case 'support':
      return <HelpSupport />
    default:
      return null
  }
}
/* ── Account Details ── */
function AccountDetails({ onSelectAvatarClick }) {
  const { user, fetchUserHistory } = useUser()
  const [toast, setToast] = useState(null)
  const [emailVal, setEmailVal] = useState(user?.email || '')
  const [nameVal, setNameVal] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(t)
    }
  }, [toast])

  useEffect(() => {
    if (user) {
      setEmailVal(user.email || '')
      setNameVal(user.name || '')
    }
  }, [user])

  const defaultAvatar = '/avatars/Avatar_1.jpg'
  const name = user?.name || 'Demo User'
  const email = user?.email || 'demo@rrclub.com'
  const phone = user?.phone || '+91 99999 99999'

  const handleSaveProfile = async () => {
    if (!nameVal.trim()) {
      setToast('Full Name is required.')
      return
    }
    
    // If it's a temp email prefix matching phone, treat it as empty/optional
    const isTempEmail = emailVal.trim().includes('@temp-user.com');
    if (emailVal.trim() && !isTempEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal.trim())) {
      setToast('Invalid email address format.')
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: emailVal.trim()
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.')
      }

      await fetchUserHistory()
      setToast('Profile updated successfully!')
    } catch (err) {
      setToast(err.message || 'Error updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  // Display user-friendly email in UI (hide temp emails)
  const displayEmail = emailVal.includes('@temp-user.com') ? '' : emailVal;

  return (
    <div className="space-y-4">
      {/* Profile Avatar Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center shadow-sm relative overflow-hidden">
        <div 
          onClick={onSelectAvatarClick}
          className="relative group cursor-pointer mb-3"
        >
          {/* Animated Premium Glowing Halo */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-600 opacity-80 blur-[3px] group-hover:opacity-100 group-hover:blur-[5px] transition-all duration-500 animate-[spin_8s_linear_infinite]" />
          <div className="relative w-24 h-24 rounded-full bg-white p-1 transition-transform duration-500 group-hover:scale-105">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative">
              <img 
                src={user?.avatar || defaultAvatar} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[10px] text-white font-bold text-center px-1">Change Avatar</span>
              </div>
            </div>
          </div>
        </div>
        <h4 className="text-sm font-black text-slate-800">{name}</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">{email.includes('@temp-user.com') ? 'No email linked' : email}</p>
      </div>

      {/* Edit Profile Fields */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 mb-2">Account Settings</h3>
        <div className="space-y-3.5">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">User UID</label>
            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-500 flex items-center justify-between select-none">
              <span>{user?.uid || '102948'}</span>
              <button 
                onClick={() => {
                  copyToClipboard(user?.uid || '102948')
                  setToast('UID copied to clipboard!')
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
              >
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
            <input
              type="text"
              value={nameVal}
              disabled
              readOnly
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed select-none focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email Address (Optional)</label>
            <input
              type="email"
              value={displayEmail}
              onChange={(e) => setEmailVal(e.target.value)}
              placeholder="Add email address"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone Number</label>
            <div className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-xl text-xs font-semibold text-slate-500 select-none">
              {phone}
            </div>
          </div>


          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Member Since</label>
            <div className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-xl text-xs font-semibold text-slate-500 select-none">
              June 2025
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full py-3 mt-4 bg-primary text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-amber-300 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-md shadow-primary/10 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[90%] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
          <Check size={16} />
          <span className="flex-1 text-xs">{toast}</span>
        </div>
      )}
    </div>
  )
}

function VipClub() {
  const { user, claimedVipRewards, setClaimedVipRewards, setBetRecords, addBonus, fetchUserHistory } = useUser()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [toast, setToast] = useState(null)
  
  const totalDeposit = user?.totalDeposits || 0

  const currentVipLevel = getVipLevel(totalDeposit)

  const [selectedLevelView, setSelectedLevelView] = useState(currentVipLevel || 1)

  const nextTierIndex = currentVipLevel < 20 ? currentVipLevel : null
  const nextTier = nextTierIndex !== null ? VIP_TIERS[nextTierIndex] : null

  let progressPercent
  let depositRemaining
  if (nextTier) {
    depositRemaining = nextTier.minDeposit - totalDeposit
    progressPercent = Math.min(100, (totalDeposit / nextTier.minDeposit) * 100)
  } else {
    progressPercent = 100
  }

  const viewedTier = VIP_TIERS[selectedLevelView - 1]

  const handleClaim = async (rewardType, rewardAmount) => {
    const rewardKey = `${selectedLevelView}-${rewardType}`
    if (claimedVipRewards.includes(rewardKey)) return
    
    try {
      const token = localStorage.getItem('token') || ''
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      
      const response = await fetch(`${API_BASE}/api/wallet/claim-vip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vipLevel: selectedLevelView,
          rewardType,
          amount: rewardAmount
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim VIP reward')
      }

      await fetchUserHistory()
      setToast({ msg: `🎉 Successfully claimed ₹${rewardAmount} VIP Bonus!`, type: 'success' })
    } catch (err) {
      setToast({ msg: err.message || 'Error claiming VIP reward', type: 'error' })
    }
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const viewedRewards = [
    { 
      type: 'levelUp', 
      title: 'Level Up Bonus', 
      desc: 'Instant upgrade bonus.', 
      amount: viewedTier.levelUp, 
      icon: Award 
    },
    { 
      type: 'weekly', 
      title: 'Weekly Bonus', 
      desc: 'Claimable every Tuesday.', 
      amount: viewedTier.weekly, 
      icon: Gift, 
      time: '16/6/2026 00:00:00' 
    },
    { 
      type: 'monthly', 
      title: 'Monthly Bonus', 
      desc: 'Claimable on 2nd of each month.', 
      amount: viewedTier.monthly, 
      icon: Trophy, 
      time: '2/7/2026 00:00:00' 
    }
  ]

  if (viewedTier.commission > 0) {
    viewedRewards.push({
      type: 'commission',
      title: 'Rebate Commission',
      desc: 'Earn commission on direct referral play.',
      amount: viewedTier.commission,
      icon: Share2
    })
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
          <Check size={16} />
          <span className="flex-1 text-xs">{toast.msg}</span>
        </div>
      )}

      {/* VIP Level Progress Card */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-white/10 rounded-full" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                {currentVipLevel}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">VIP {currentVipLevel} Active</span>
            </div>
            {nextTier && (
              <div className="flex items-center gap-2 text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-100">VIP {currentVipLevel + 1}</span>
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm">
                  {currentVipLevel + 1}
                </span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>Deposit Progress</span>
              <span>₹{totalDeposit.toLocaleString()} / {nextTier ? `₹${nextTier.minDeposit.toLocaleString()}` : 'Max'}</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          
          {nextTier ? (
            <p className="text-xs text-amber-50/80 mt-4 text-center leading-relaxed">
              Deposit <span className="font-bold text-white">₹{depositRemaining.toLocaleString()}</span> more to unlock <span className="font-bold text-white">VIP Level {currentVipLevel + 1}</span> privileges!
            </p>
          ) : (
            <p className="text-xs text-amber-50/80 mt-4 text-center leading-relaxed">
              🎉 Outstanding! You have unlocked the ultimate <span className="font-bold text-white">VIP Level 20</span> rank!
            </p>
          )}
        </div>
      </div>

      {/* Level Carousel Selector Card */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <button 
          onClick={() => setSelectedLevelView(v => Math.max(1, v - 1))}
          disabled={selectedLevelView === 1}
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>
        <div className="text-center">
          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Viewing Level</span>
          <h3 className="text-base font-extrabold text-slate-800 mt-1">VIP Level {selectedLevelView}</h3>
          <p className="text-[10px] text-slate-400 font-medium">Req. Deposit: ₹{viewedTier.minDeposit.toLocaleString()}</p>
        </div>
        <button 
          onClick={() => setSelectedLevelView(v => Math.min(20, v + 1))}
          disabled={selectedLevelView === 20}
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronRight size={16} className="text-slate-600" />
        </button>
      </div>

      {/* Privileges Info Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">VIP Privileges</h3>
        <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <li className="flex items-start gap-1.5">
            <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span><span className="font-semibold text-slate-800">Weekly Bonus</span>: Login every <span className="font-bold text-amber-600">Tuesday</span> to claim your VIP reward.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span><span className="font-semibold text-slate-800">Monthly Bonus</span>: Login every <span className="font-bold text-amber-600">2nd of the month</span> to claim your loyalty reward.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span><span className="font-semibold text-slate-800">Level Up Bonus</span>: Claim instant cash payouts immediately upon level upgrade.</span>
          </li>
          {viewedTier.commission > 0 && (
            <li className="flex items-start gap-1.5 animate-[fadeIn_0.2s_ease-out]">
              <Check size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span><span className="font-semibold text-slate-800">Rebate Commission</span>: Earn <span className="font-bold text-amber-600">{viewedTier.commission}%</span> commission on direct referral play.</span>
            </li>
          )}
        </ul>
      </div>

      {/* VIP Rewards List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Privilege Rewards</h3>
        {viewedRewards.map((reward) => {
          const Icon = reward.icon
          const rewardKey = `${selectedLevelView}-${reward.type}`
          const isLvlLocked = currentVipLevel < selectedLevelView
          const isClaimed = claimedVipRewards.includes(rewardKey)

          return (
            <div key={reward.type} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                  <Icon size={20} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800">{reward.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">{reward.desc}</p>
                  {reward.time && !isLvlLocked && !isClaimed && (
                    <span className="text-[9px] font-medium text-amber-600 block mt-1">Available at: {reward.time}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-xs font-extrabold text-slate-800">
                  {reward.type === 'commission' ? `${reward.amount}%` : `₹${reward.amount.toLocaleString()}`}
                </span>
                {isLvlLocked ? (
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Lock size={8} /> Locked
                  </span>
                ) : reward.type === 'commission' ? (
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    Active
                  </span>
                ) : isClaimed ? (
                  <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Check size={10} /> Claimed
                  </span>
                ) : (
                  <button 
                    onClick={() => handleClaim(reward.type, reward.amount)}
                    className="text-[9px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold px-2.5 py-1 rounded-lg shadow-sm cursor-pointer transition-all"
                  >
                    Claim Now
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upgrade Action Button */}
      <button 
        onClick={() => setShowUpgradeModal(true)}
        className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-bold text-sm rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
      >
        <Award size={16} /> VIP Milestones Chart
      </button>

      {/* Upgrade Modal Details */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6" onClick={() => setShowUpgradeModal(false)}>
          <div className="max-w-sm w-full bg-white rounded-3xl p-5 text-center space-y-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">VIP Upgrade Milestones</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                Weekly: <span className="font-semibold text-amber-600">3%</span> · Monthly: <span className="font-semibold text-amber-600">5%</span> of Deposit Requirement.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/50 text-xs">
              <div className="grid grid-cols-4 p-3 bg-slate-100 font-bold text-[9px] text-slate-500 uppercase tracking-wider rounded-t-2xl sticky top-0 z-10 shadow-sm">
                <span>Rank</span>
                <span>Deposit</span>
                <span>Lvl Up</span>
                <span>Comm.</span>
              </div>
              <div className="divide-y divide-slate-100">
                {VIP_TIERS.map((tier) => (
                  <div key={tier.level} className={`grid grid-cols-4 p-3 items-center text-[10px] ${currentVipLevel === tier.level ? 'bg-amber-50 font-bold text-amber-800' : 'text-slate-600'}`}>
                    <span>VIP {tier.level}</span>
                    <span>₹{tier.minDeposit.toLocaleString()}</span>
                    <span>₹{tier.levelUp.toLocaleString()}</span>
                    <span>{tier.commission}%</span>
                  </div>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0"
            >
              Close Chart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Refer & Earn Hub ── */
function ReferEarn() {
  const { 
    user,
    unclaimedReferral, setUnclaimedReferral, 
    directReferralReward, betCommissionReward,
    setBetRecords, depositRecords, addBonus 
  } = useUser()
  const { socket } = useGame()
  
  const [referralSignups, setReferralSignups] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [commissionLogs, setCommissionLogs] = useState([])
  const [loadingCommissions, setLoadingCommissions] = useState(false)

  const totalDeposit = depositRecords.reduce((acc, curr) => acc + (curr.status === 'Completed' ? curr.amount : 0), 0)
  const vipLevel = getVipLevel(totalDeposit)
  const [activeTab, setActiveTab] = useState('rewards') // 'rewards' | 'rules' | 'leaderboard' | 'referrals'
  
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`

    if (activeTab === 'rewards') {
      const fetchCommissions = async () => {
        setLoadingCommissions(true)
        try {
          const res = await fetch(`${API_BASE}/api/wallet/transactions`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          if (res.ok) {
            const data = await res.json()
            const filtered = data.filter(t => ['referral_bonus', 'commission'].includes(t.type))
            setCommissionLogs(filtered)
          }
        } catch (err) {
          console.error('Error fetching commission logs:', err)
        } finally {
          setLoadingCommissions(false)
        }
      }
      fetchCommissions()
    }
    
    if (activeTab === 'referrals') {
      const fetchReferrals = async () => {
        setLoadingReferrals(true)
        try {
          const res = await fetch(`${API_BASE}/api/auth/referrals`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
          if (res.ok) {
            const data = await res.json()
            setReferralSignups(data)
          }
        } catch (err) {
          console.error('Error fetching referrals:', err)
        } finally {
          setLoadingReferrals(false)
        }
      }
      fetchReferrals()
    }
    
    if (activeTab === 'leaderboard') {
      const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true)
        try {
          const res = await fetch(`${API_BASE}/api/games/leaderboard`)
          if (res.ok) {
            const data = await res.json()
            setLeaderboard(data)
          }
        } catch (err) {
          console.error('Error fetching leaderboard:', err)
        } finally {
          setLoadingLeaderboard(false)
        }
      }
      fetchLeaderboard()
    }
  }, [activeTab])

  // Socket listener for real-time leaderboard updates
  useEffect(() => {
    if (!socket) return
    const handleLeaderboardUpdate = (data) => {
      setLeaderboard(data)
    }
    socket.on('leaderboard_update', handleLeaderboardUpdate)
    return () => {
      socket.off('leaderboard_update', handleLeaderboardUpdate)
    }
  }, [socket])
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState(null)

  const referralLink = `${window.location.origin}/register?invitecode=${user?.uid || ''}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
      .then(() => {
        setToast("📋 Referral Link copied to clipboard successfully!")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error('Failed to copy using navigator.clipboard', err)
        copyToClipboard(referralLink)
        setToast("📋 Referral Link copied to clipboard successfully!")
      })
  }

  const handleClaimCommission = () => {
    if (unclaimedReferral <= 0) return
    const amount = unclaimedReferral
    addBonus(amount, 'commission')
    setUnclaimedReferral(0)
    
    // Log transaction
    const newTx = createReferralRewardTx(amount)
    setBetRecords(prev => [newTx, ...prev])

    setToast(`🎉 Claimed ₹${amount.toLocaleString()} directly to your wallet!`)
    setTimeout(() => setToast(null), 3000)
  }

  const handleShareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RRClub Referral',
          text: 'Join RRClub and play prediction games to win real cash!',
          url: referralLink,
        })
      } catch {
        // ignore
      }
    } else {
      handleCopy()
      setToast('📋 Link copied to clipboard! Share it with your friends.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleSocialShare = (platform) => {
    let url = ''
    if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent('Join RRClub and play prediction games to win real cash!\n' + referralLink)}`
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join RRClub and play prediction games to win real cash!')}`
    } else if (platform === 'facebook') {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'rules', label: 'Refer Rules' },
    { id: 'rewards', label: 'My Rewards' },
    { id: 'referrals', label: 'My Referrals' },
  ]

  return (
    <div className="space-y-4 pb-10">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
          <Check size={16} />
          <span className="flex-1 text-xs">{toast}</span>
        </div>
      )}

      {/* Refer sub-tabs */}
      <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-hide shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[75px] text-center py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap px-1 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: MY REWARDS */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {/* Commission tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Commission Cash</span>
              <span className="text-xl font-extrabold text-emerald-600 block mt-1">₹{(directReferralReward + betCommissionReward).toFixed(2)}</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Referrals Reward</span>
              <span className="text-xl font-extrabold text-indigo-600 block mt-1">₹{directReferralReward.toFixed(2)}</span>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">Commission Breakdown</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><span className="text-[9px] text-slate-400 block font-medium">Direct Referrals</span><span className="text-xs font-bold text-slate-700 block mt-0.5">₹{directReferralReward.toFixed(2)}</span></div>
              <div><span className="text-[9px] text-slate-400 block font-medium">Bet Commission</span><span className="text-xs font-bold text-slate-700 block mt-0.5">₹{betCommissionReward.toFixed(2)}</span></div>
              <div><span className="text-[9px] text-slate-400 block font-medium">Active Rate</span><span className="text-xs font-bold text-slate-700 block mt-0.5">{vipLevel >= 5 ? `${VIP_TIERS[vipLevel - 1].commission.toFixed(1)}%` : '0%'}</span></div>
              <div><span className="text-[9px] text-slate-400 block font-medium">Refer VIP req.</span><span className="text-xs font-bold text-slate-700 block mt-0.5">VIP 5+</span></div>
            </div>
          </div>

          {/* Current Claimable Card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-lg shadow-emerald-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">Current Claimable Bonus</span>
                <span className="text-2xl font-black block mt-0.5">₹{unclaimedReferral.toLocaleString()}</span>
              </div>
              <button
                onClick={handleClaimCommission}
                disabled={unclaimedReferral <= 0}
                className="bg-white hover:bg-slate-50 text-emerald-600 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                Claim Now
              </button>
            </div>
            <p className="text-[10px] text-emerald-100/90 leading-relaxed">
              * Commission claims are processed instantly. Once claimed, the amount is added directly into your global wallet balance to withdraw or play.
            </p>
          </div>

          {/* Referral History list */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Date</span>
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {loadingCommissions ? (
                [1, 2].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse flex justify-between">
                    <div className="w-16 h-4 bg-slate-200 rounded" />
                    <div className="w-32 h-4 bg-slate-200 rounded" />
                    <div className="w-12 h-4 bg-slate-200 rounded" />
                  </div>
                ))
              ) : commissionLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No commission earnings recorded yet.
                </div>
              ) : (
                commissionLogs.map((log, i) => (
                  <div key={i} className="p-4 flex justify-between items-center">
                    <span className="text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-slate-700">{log.description}</span>
                    <span className="font-semibold text-emerald-600">+₹{parseFloat(log.amount).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REFER RULES */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">How referrals work</h4>
          <div className="space-y-4">
            {[
              { title: 'Invite Friends', desc: 'Share your referral code/link via social networks or copy-paste it directly.' },
              { title: 'Registration', desc: 'Your friends register an account using your referral link or unique coupon code.' },
              { title: 'First Deposits', desc: 'When your referrals deposit ₹100 or more, you secure ₹10 reward instantly.' },
              { title: 'Earn Commission', desc: 'Earn direct commissions starting at VIP 5 (scales from 0.5% up to 2.0% at VIP 20).' }
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 font-bold text-emerald-600 text-xs">
                  {i + 1}
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">{step.title}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
            <span className="w-10">Rank</span>
            <span className="flex-1">Player Name</span>
            <span className="text-right">Total Profit</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {loadingLeaderboard ? (
              [1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-6 h-4 bg-slate-200 rounded" />
                    <div className="w-8 h-8 bg-slate-200 rounded-full" />
                    <div className="w-24 h-4 bg-slate-200 rounded" />
                  </div>
                  <div className="w-12 h-4 bg-slate-200 rounded text-right" />
                </div>
              ))
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No profit entries recorded yet.
              </div>
            ) : (
              leaderboard.map((item, i) => (
                <div key={i} className="px-4 py-3.5 flex items-center">
                  <span className="w-10 font-bold text-slate-500 flex items-center gap-0.5">
                    {item.rank} {item.badge && <span className="text-sm">{item.badge}</span>}
                  </span>
                  {item.avatar && (
                    <img 
                      src={item.avatar} 
                      alt="" 
                      className="w-6 h-6 rounded-full border border-slate-200 mr-2"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                  <span className="flex-1 font-semibold text-slate-800">{item.name}</span>
                  <span className="text-right font-bold text-emerald-600">{item.prize}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY REFERRALS */}
      {activeTab === 'referrals' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Referral Details</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {loadingReferrals ? (
              [1, 2, 3].map((_, i) => (
                <div key={i} className="p-4 animate-pulse flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-slate-200 rounded" />
                    <div className="w-32 h-3 bg-slate-200 rounded" />
                  </div>
                  <div className="w-12 h-4 bg-slate-200 rounded" />
                </div>
              ))
            ) : referralSignups.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                You have not referred anyone yet.
              </div>
            ) : (
              referralSignups.map((friend, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-800">User {friend.phone}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Joined: {new Date(friend.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="font-bold text-emerald-600">Registered</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Share Box & Referral Actions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share your referral link</h4>
        
        {/* Link Copy Box */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-xs font-mono font-bold text-slate-500 truncate mr-3">{referralLink}</span>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 cursor-pointer hover:underline shrink-0 ml-1"
          >
            {copied ? (
              <><Check size={14} /> Copied!</>
            ) : (
              <><Copy size={14} /> Copy</>
            )}
          </button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button 
            onClick={() => handleSocialShare('whatsapp')}
            className="py-3 bg-[#25d366] hover:bg-[#20ba5a] text-white font-bold text-[10px] rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.705 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>WhatsApp</span>
          </button>
          <button 
            onClick={() => handleSocialShare('telegram')}
            className="py-3 bg-[#0088cc] hover:bg-[#007cb8] text-white font-bold text-[10px] rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
              <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.3-.07-.46-.52-.16L7.74 12.2l-4.1-1.28c-.89-.28-.91-.89.19-1.32L19.88 3.56c.74-.27 1.39.18 1.16 1.08l-2.73 12.87c-.2 1.01-.8 1.26-1.65.78l-4.14-3.05-2 1.93c-.22.22-.4.4-.82.4z"/>
            </svg>
            <span>Telegram</span>
          </button>
          <button 
            onClick={() => handleSocialShare('facebook')}
            className="py-3 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-[10px] rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
              <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615z"/>
            </svg>
            <span>Facebook</span>
          </button>
          <button 
            onClick={handleShareLink}
            className="py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] rounded-2xl cursor-pointer flex flex-col items-center justify-center gap-1 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Share2 size={20} />
            <span>Share Link</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── My Orders Subpage ── */
function MyOrders({ orders }) {
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null)

  if (activeTrackingOrder) {
    const trackingTimeline = activeTrackingOrder.tracking || [
      { 
        title: 'Order Confirmed', 
        desc: 'Your order has been confirmed.', 
        time: activeTrackingOrder.orderDate || 'Just now', 
        completed: true 
      },
      { 
        title: 'Shipped', 
        desc: 'Item is being processed at warehouse.', 
        time: 'In transit', 
        completed: activeTrackingOrder.status === 'Shipped' || activeTrackingOrder.status === 'Delivered' 
      },
      { 
        title: 'Out for Delivery', 
        desc: 'Courier agent has left for delivery.', 
        time: 'Pending', 
        completed: activeTrackingOrder.status === 'Delivered' 
      },
      { 
        title: 'Delivered', 
        desc: 'Order delivered to customer.', 
        time: activeTrackingOrder.deliveryDate || 'Within 5 days', 
        completed: activeTrackingOrder.status === 'Delivered' 
      }
    ];

    return (
      <div className="space-y-4 pb-10">
        <button 
          onClick={() => setActiveTrackingOrder(null)}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to My Orders
        </button>

        {/* Tracking Details Page */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
            <img 
              src={resolveImg(activeTrackingOrder.product.image)} 
              alt={activeTrackingOrder.product.title} 
              className="w-16 h-16 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-800 truncate">{activeTrackingOrder.product.title}</h4>
              <p className="text-xs text-primary font-bold mt-0.5">₹{activeTrackingOrder.product.price.toLocaleString()}</p>
              <p className="text-[9px] font-mono text-slate-400 mt-1">ID: {activeTrackingOrder.id}</p>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeTrackingOrder.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
              activeTrackingOrder.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
              activeTrackingOrder.status === 'Shipped' ? 'bg-purple-50 text-purple-600' :
              'bg-amber-50 text-amber-600'
            }`}>
              {activeTrackingOrder.status}
            </span>
          </div>

          {/* Shipping Address details */}
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shipping Information</h5>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">{activeTrackingOrder.address.name}</span>
                <span className="text-[9px] font-bold bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded uppercase">{activeTrackingOrder.address.type}</span>
              </div>
              <p className="text-slate-500">Phone: {activeTrackingOrder.address.mobile}</p>
              <p className="text-slate-600 leading-relaxed mt-1">
                {activeTrackingOrder.address.address}
                {activeTrackingOrder.address.landmark && <span className="block text-[10px] text-slate-400 font-medium">Landmark: {activeTrackingOrder.address.landmark}</span>}
                <span className="block font-medium mt-0.5">{activeTrackingOrder.address.city}, {activeTrackingOrder.address.state} - {activeTrackingOrder.address.pin}</span>
              </p>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Delivery Timeline</h5>
            <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 ml-2.5">
              {trackingTimeline.map((track, i) => (
                <div key={i} className="relative">
                  {/* Timeline bullet */}
                  <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                    track.completed ? 'border-emerald-500' : 'border-slate-200'
                  }`}>
                    {track.completed && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                  </span>
                  
                  {/* Title & Desc */}
                  <div>
                    <h6 className={`text-xs font-bold ${track.completed ? 'text-slate-800' : 'text-slate-400'}`}>
                      {track.title}
                    </h6>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{track.desc}</p>
                    <span className="text-[9px] font-mono text-slate-400 mt-1 block">{track.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700 leading-relaxed flex gap-2">
            <InfoIcon size={14} className="shrink-0 mt-0.5" />
            <span>
              Orders are dispatched through BlueDart. For any changes to your shipping details, contact our support team.
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <ShoppingBag size={36} className="text-slate-300 mb-2.5" />
        <h3 className="text-sm font-bold text-slate-700">No Orders Placed</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
          You haven't bought any products yet. Visit our shop on the Home page to browse premium tech gear!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-10">
      {orders.map((order) => (
        <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <img 
              src={resolveImg(order.product.image)} 
              alt={order.product.title} 
              className="w-12 h-12 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-bold text-slate-800 truncate pr-2">{order.product.title}</h4>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                  order.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                  order.status === 'Shipped' ? 'bg-purple-50 text-purple-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1">₹{order.product.price.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Order Date: {order.orderDate}</p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
            <span className="text-[9px] font-mono text-slate-400">ID: {order.id}</span>
            <button 
              onClick={() => setActiveTrackingOrder(order)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
            >
              Track Order <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Transaction History ── */
function TransactionHistory() {
  const { depositRecords, withdrawRecords, betRecords } = useUser()
  
  const allTxns = [
    ...depositRecords.map(r => ({
      id: r.id,
      title: r.isAdjustment ? 'Game Rebate Reward' : `Deposit via ${r.method}`,
      desc: r.isAdjustment ? (r.adminNotes || 'Completed payment') : (r.voucher ? `Voucher: ${r.voucher}` : 'Completed payment'),
      amount: `+₹${(r.amount + (r.bonus || 0)).toLocaleString()}`,
      color: 'text-emerald-600',
      dot: 'bg-emerald-500',
      timestamp: r.timestamp || 0,
      date: r.date,
      type: 'Deposit'
    })),
    ...withdrawRecords.map(r => ({
      id: r.id,
      title: r.isAdjustment ? 'Game Rebate Reward' : `Withdrawal to ${r.method.includes('Bank') ? 'Bank Account' : 'UPI Account'}`,
      desc: r.isAdjustment ? (r.adminNote || 'Wallet Adjustment') : `Processing Fee: -₹${r.fee}`,
      amount: `-₹${r.amount.toLocaleString()}`,
      color: 'text-red-500',
      dot: 'bg-red-500',
      timestamp: r.timestamp || 0,
      date: r.date,
      type: 'Withdrawal'
    })),
    ...betRecords.map(r => ({
      id: r.id,
      title: r.title,
      desc: `Game Activity: ${r.game}`,
      amount: r.amount > 0 ? `+₹${r.amount.toLocaleString()}` : `-₹${Math.abs(r.amount).toLocaleString()}`,
      color: r.amount > 0 ? 'text-emerald-600' : 'text-red-500',
      dot: r.amount > 0 ? 'bg-emerald-500' : 'bg-red-500',
      timestamp: r.timestamp || 0,
      date: r.date,
      type: r.amount > 0 ? 'Winnings' : 'Bet'
    }))
  ]

  allTxns.sort((a, b) => b.timestamp - a.timestamp)

  if (allTxns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <svg className="w-10 h-10 mb-2 stroke-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 00-2 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p className="text-xs font-semibold">No transactions logged yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
      {allTxns.map((tx) => (
        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${tx.dot} shrink-0`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{tx.title}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {tx.date} · {tx.id}
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">{tx.desc}</p>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <span className={`text-sm font-bold ${tx.color}`}>{tx.amount}</span>
            <span className="block text-[8px] bg-slate-100 border border-slate-200 text-slate-500 font-black px-1.5 py-0.5 rounded-md mt-1 uppercase tracking-wide">
              {tx.type}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Safe Center Modal ── */
function SafeCenterModal({ onClose }) {
  const [showPass, setShowPass] = useState(false)
  const [twoFA, setTwoFA] = useState(true)
  const [twoFaVerified, setTwoFaVerified] = useState(true)
  const [totpCode, setTotpCode] = useState('')
  const [twoFaCopied, setTwoFaCopied] = useState(false)
  const [totpError, setTotpError] = useState(false)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [toast, setToast] = useState(null)

  const handleUpdatePassword = () => {
    if (!currentPass || !newPass || !confirmPass) {
      setToast({ msg: 'Please fill in all fields', type: 'error' })
      return
    }
    if (newPass !== confirmPass) {
      setToast({ msg: 'Passwords do not match', type: 'error' })
      return
    }
    setToast({ msg: 'Password updated successfully!', type: 'success' })
    setCurrentPass('')
    setNewPass('')
    setConfirmPass('')
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] max-w-sm w-[90%] ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'} text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1 text-xs">{toast.msg}</span>
        </div>
      )}

      <div 
        className="max-w-xs w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-700 max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Shield size={16} className="text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Safe Center</h3>
        </div>

        {/* Two Factor Auth Toggle (Admins Only) */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700">Two-Factor Auth</span>
                <span className="text-[8px] text-slate-400 mt-0.5">Secure your account actions</span>
              </div>
              <button
                onClick={() => {
                  if (twoFA) {
                    setTwoFA(false)
                    setTwoFaVerified(false)
                    setToast({ msg: 'Two-Factor Authentication disabled', type: 'success' })
                  } else {
                    setTwoFA(true)
                    setTwoFaVerified(false)
                  }
                }}
                className={`w-10 h-5.5 rounded-full p-0.5 cursor-pointer transition-all flex items-center ${
                  twoFA ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                }`}
              >
                <span className="w-4.5 h-4.5 rounded-full bg-white shadow-sm flex items-center justify-center">
                  {twoFA ? <Check size={8} className="text-indigo-600 font-bold" /> : <X size={8} className="text-slate-400" />}
                </span>
              </button>
            </div>

            {/* Detailed 2FA Setup/Status Section */}
            {twoFA && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3.5 transition-all animate-[fadeIn_0.2s_ease-out]">
                {twoFaVerified ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Shield size={14} className="animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">2FA Active & Secured</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Your account is protected by Google Authenticator. Verification codes will be required for large withdrawals and password changes.
                    </p>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-2">
                      <span className="text-[9px] font-mono text-slate-400">Secret: •••• •••• •••• Z24W</span>
                      <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Linked</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Shield size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Setup 2FA Protection</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-relaxed">
                      1. Scan this QR code or copy the key into your Google Authenticator app.
                    </p>

                    {/* QR Code and Secret Key Setup */}
                    <div className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-3.5 relative overflow-hidden">
                      <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-2 bg-slate-50">
                        <QrCode size={40} className="text-indigo-600" />
                      </div>
                      <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 mt-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-700 select-all">CP7X98Y6Z24W44UT</span>
                        <button
                          onClick={() => {
                            copyToClipboard('CP7X98Y6Z24W44UT')
                            setTwoFaCopied(true)
                            setTimeout(() => setTwoFaCopied(false), 2000)
                          }}
                          className="text-[9px] font-bold text-indigo-600 flex items-center gap-0.5 cursor-pointer hover:underline"
                        >
                          {twoFaCopied ? 'Copied' : <Copy size={10} />}
                        </button>
                      </div>
                    </div>

                    {/* Verification Input */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enter 6-Digit Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => {
                          setTotpCode(e.target.value.replace(/[^0-9]/g, ''))
                          setTotpError(false)
                        }}
                        placeholder="000 000"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center text-sm font-bold font-mono tracking-widest text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {totpError && (
                        <p className="text-[9px] text-red-500 font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Invalid 6-digit verification code
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (totpCode.length === 6) {
                          setTwoFaVerified(true)
                          setTotpCode('')
                          setToast({ msg: '🎉 2FA linked successfully!', type: 'success' })
                        } else {
                          setTotpError(true)
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[10px] rounded-xl shadow-md cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all"
                    >
                      Verify & Bind
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Change Password Form */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Update Password</span>
          
          <div className="relative">
            <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type={showPass ? 'text' : 'password'} 
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Current Password" 
              className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>

          <input 
            type="password" 
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="New Password" 
            className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
          />
          
          <input 
            type="password" 
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Confirm New Password" 
            className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
          />

          <button 
            onClick={handleUpdatePassword}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Update Password
          </button>
        </div>

        {/* Back Button */}
        <button 
          onClick={onClose}
          className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          Close Safe Center
        </button>
      </div>
    </div>
  )
}

/* ── Policy Text Modal ── */
function PolicyTextModal({ type, onClose }) {
  const titleMap = {
    about: 'About Us',
    responsible: 'Responsible Gaming',
    fairplay: 'Fairplay Guide',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy'
  }

  const contentMap = {
    about: 'RRClub is India\'s most trusted gaming and colour prediction platform. We offer a state-of-the-art gaming experience with real-time analytics, instant payouts, and premium rewards. Our platform operates with top-tier encryption to ensure maximum safety and security for all players.',
    responsible: 'Gaming is an enjoyable form of entertainment. To prevent gaming addiction and promote responsible behaviors: 1. Set a personal budget for deposits. 2. Never chase losses. 3. Take regular breaks. 4. If you need self-exclusion, contact support to lock your account temporarily.',
    fairplay: 'All predictions are determined using secure random number generation (RNG) servers. The game outcomes are mathematically validated to be 100% transparent and provably fair. Neither players nor administrators can manipulate active rounds.',
    terms: 'By registering on RRClub, you agree to: 1. Be at least 18 years of age. 2. Use a single account. 3. Refrain from abusive or cooperative play. 4. Comply with standard verification requests. Violating these terms may result in account termination.',
    privacy: 'Your privacy is paramount. We store your data securely and use it only to facilitate deposits, withdrawals, and gameplay. We do not sell or share your personal details with third-party advertising companies. Standard SSL encryption is active.'
  }

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="max-w-xs w-full bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <InfoIcon size={16} className="text-indigo-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{titleMap[type]}</h3>
        </div>
        
        <p className="text-xs text-slate-600 leading-relaxed max-h-[50vh] overflow-y-auto pr-1">
          {contentMap[type]}
        </p>

        <button 
          onClick={onClose}
          className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          Close Window
        </button>
      </div>
    </div>
  )
}

/* ── Help & Support ── */
function HelpSupport() {
  const [openFaq, setOpenFaq] = useState(null)
  const faqs = [
    { q: 'How do I deposit money?', a: 'Go to the Wallet tab, tap "Deposit", choose your payment method (UPI, Card, or Bank Transfer), enter the amount, and confirm.' },
    { q: 'How to withdraw winnings?', a: 'Navigate to Wallet → Withdraw. Enter the amount and your bank details. Withdrawals are processed within 24 hours.' },
    { q: 'What are the game rules?', a: 'Select a colour (Red, Green, or Violet) and place your bet before the timer runs out. Red and Green pay 2×, Violet pays 9×.' },
    { q: 'How do referrals work?', a: 'Share your unique referral code with friends. When they sign up and make their first deposit, you both earn ₹100 bonus.' },
    { q: 'Is my data secure?', a: 'Yes. We use 256-bit SSL encryption and comply with all data protection regulations to keep your information safe.' },
  ]
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Frequently Asked Questions</h3>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {faqs.map((faq, i) => (
          <div key={i} className={i !== faqs.length - 1 ? 'border-b border-slate-100' : ''}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-800 pr-4">{faq.q}</span>
              {openFaq === i ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
            </button>
            {openFaq === i && <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed -mt-1">{faq.a}</div>}
          </div>
        ))}
      </div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mt-6">Contact Us</h3>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button className="w-full p-4 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
          <MessageCircle size={18} className="text-emerald-500" /><span className="text-sm font-semibold text-slate-800">Live Chat</span><span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Online</span>
        </button>
        <button className="w-full p-4 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
          <Mail size={18} className="text-blue-500" /><span className="text-sm font-semibold text-slate-800">Email Support</span><span className="ml-auto text-xs text-slate-400">support@rrclub.com</span>
        </button>
        <button className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer">
          <Phone size={18} className="text-orange-500" /><span className="text-sm font-semibold text-slate-800">Call Us</span><span className="ml-auto text-xs text-slate-400">+91 1800-XXX-XXXX</span>
        </button>
      </div>
    </div>
  )
}
