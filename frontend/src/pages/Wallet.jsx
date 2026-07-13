import { useState, useRef, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { calculateWithdrawalFee, WITHDRAW_MIN, WITHDRAW_MAX } from '../utils/withdrawalFee'
import { translateError } from '../utils/errorTranslator'

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

import { getVipLevel, getVipLimit } from '../utils/vipTiers'
import {
  ArrowDownRight, ArrowUpRight, CreditCard, Check, X, AlertCircle,
  Building2, Smartphone, Lock, Upload, IndianRupee, Tag, ChevronRight,
  RefreshCw, Info, Eye, EyeOff, Award, HelpCircle, Gift
} from 'lucide-react'


const DEPOSIT_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]
const WITHDRAW_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

/* ══════════════════════════════════════════════════════════════
   MAIN WALLET COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function Wallet({ onNavigate, initialTab }) {
  const { 
    user, 
    balance, 
    realBalance,
    bonusBalance,
    lockedBalance
  } = useUser()
  const [activeTab, setActiveTab] = useState(initialTab || 'deposit')
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    setActiveTab(initialTab || 'deposit')
  }

  /* Toast */
  const [toast, setToast] = useState(null)
  const showToast = (msg, type = 'success') => {
    const finalMsg = type === 'error' ? translateError(msg) : msg;
    setToast({ msg: finalMsg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const tabs = [
    { id: 'deposit', label: 'Deposit', icon: ArrowDownRight },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
    { id: 'methods', label: 'Methods', icon: CreditCard },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'error'
              ? 'bg-red-500'
              : 'bg-primary'
          } text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2`}
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">My Wallet</h1>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate?.('support')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700 transition-all cursor-pointer border-0 outline-none"
          >
            <HelpCircle size={14} />
            Support
          </button>

          <button
            onClick={() => onNavigate?.('transactionRecords')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200"
          >
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Records
          </button>
        </div>
      </header>

      {/* ── Balance Card ── */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <p className="text-white/80 text-sm font-medium mb-1">Total Balance</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight">
                ₹{Math.floor(balance)}
                <span className="text-2xl text-white/70">
                  .{(balance % 1).toFixed(2).slice(2)}
                </span>
              </span>
              <button
                onClick={() => {
                  const el = document.querySelector('.refresh-spin')
                  if (el) {
                    el.classList.add('animate-spin')
                    setTimeout(() => el.classList.remove('animate-spin'), 600)
                  }
                }}
                className="mb-2 p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className="text-white/80 refresh-spin" />
              </button>
            </div>
            
            {/* Split Balances */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/10 text-[10px]">
              <div>
                <p className="text-indigo-100 font-bold truncate">Real Cash</p>
                <p className="text-sm font-black mt-0.5">₹{realBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="border-l border-white/10 pl-2">
                <p className="text-indigo-100 font-bold truncate">Locked Bonus</p>
                <p className="text-sm font-black mt-0.5">₹{bonusBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="border-l border-white/10 pl-2">
                <p className="text-indigo-100 font-bold truncate">Pending Payout</p>
                <p className="text-sm font-black mt-0.5">₹{lockedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="px-4 pt-4">
        <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-4 flex-1">
        {activeTab === 'deposit' && <DepositTab onNavigate={onNavigate} showToast={showToast} />}
        {activeTab === 'withdraw' && (
          <WithdrawTab
            onNavigate={onNavigate}
          />
        )}
        {activeTab === 'methods' && (
          <PaymentMethodsTab
            userName={user?.name || 'Demo User'}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════════════
   DEPOSIT TAB
   ══════════════════════════════════════════════════════════════ */

function CountdownTimer({ countdownText, voucherId }) {
  const parseCountdownText = (text) => {
    const [h, m, s] = text.split(':').map(Number)
    return h * 3600 + m * 60 + s
  }

  const [seconds, setSeconds] = useState(() => parseCountdownText(countdownText))
  const [prevVoucherId, setPrevVoucherId] = useState(voucherId)
  const [prevCountdownText, setPrevCountdownText] = useState(countdownText)

  if (voucherId !== prevVoucherId || countdownText !== prevCountdownText) {
    setPrevVoucherId(voucherId)
    setPrevCountdownText(countdownText)
    setSeconds(parseCountdownText(countdownText))
  }

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const formatSeconds = (sec) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
  }

  return (
    <div className="bg-amber-50 border border-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
      <svg className="w-3.5 h-3.5 text-amber-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      {formatSeconds(seconds)}
    </div>
  )
}

function CompactVoucherSelector({ selectedVoucher, onSelectVoucher, onOpenDrawer, vouchers }) {
  const displayVoucher = selectedVoucher || vouchers?.[0]
  const isSelected = selectedVoucher !== null

  if (!displayVoucher) {
    return (
      <div 
        onClick={onOpenDrawer}
        className="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500">No active offer coupons available</span>
        </div>
        <span className="text-[10px] text-indigo-600 font-black">View Offers</span>
      </div>
    )
  }

  return (
    <div 
      onClick={onOpenDrawer}
      className={`relative bg-white border border-slate-200 rounded-2xl pl-6 pr-6 py-4 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all cursor-pointer select-none overflow-hidden ${
        isSelected ? 'border-emerald-500 bg-emerald-50/5 shadow-emerald-50/20' : ''
      }`}
    >
      {/* Curved Ticket Cutouts (Left & Right) */}
      <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 rounded-full bg-slate-50 border-r border-slate-200 z-10" />
      <div className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-5 h-5 rounded-full bg-slate-50 border-l border-slate-200 z-10" />

      {/* Checkbox Radio on Left */}
      <div 
        onClick={(e) => {
          e.stopPropagation()
          if (displayVoucher.type !== 'GAMEPLAY_FREEBIE') {
            onSelectVoucher(displayVoucher)
          } else {
            onOpenDrawer()
          }
        }}
        className="shrink-0 z-10 pl-1 py-2"
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected 
            ? 'border-emerald-500 bg-emerald-500' 
            : 'border-slate-300 bg-white'
        }`}>
          {isSelected && <Check size={12} className="text-white font-bold" strokeWidth={3} />}
        </div>
      </div>

      {/* Ticket Details (middle) */}
      <div className="flex-1 min-w-0 pr-1 z-10">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-800 truncate">{displayVoucher.title}</span>
        </div>
        
        {/* Rules */}
        <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-500 leading-snug">
          {displayVoucher.rules.slice(0, 2).map((rule, idx) => (
            <p key={idx} className="flex items-center gap-1">
              <span className="text-emerald-500">•</span>
              {rule}
            </p>
          ))}
        </div>

        {/* Expiry and Countdown */}
        <div className="mt-2.5 flex items-center justify-between text-[9px] text-slate-400 border-t border-dashed border-slate-200 pt-2 font-medium">
          <span>{displayVoucher.expiry}</span>
          <CountdownTimer countdownText={displayVoucher.countdownText} voucherId={displayVoucher.id} />
        </div>
      </div>

      {/* Right Chevron & Voucher Count Badge */}
      <div 
        onClick={(e) => {
          e.stopPropagation()
          onOpenDrawer()
        }}
        className="shrink-0 z-10 pl-2 pr-1 border-l border-slate-200 flex flex-col items-center justify-center h-12"
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute -top-4 -right-3.5 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-20 shadow-sm animate-pulse">
            {vouchers?.length || 0}
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
      </div>
    </div>
  )
}

function VoucherSelectionDrawer({ show, onClose, selectedVoucher, onSelectVoucher, vouchers, claimFreeVoucher, showToast }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-[32px] border border-slate-100 max-h-[85vh] flex flex-col shadow-2xl animate-[zoomIn_0.25s_ease-out] overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Tag size={16} className="text-indigo-500" />
            Select Offer Voucher
          </h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
          >
            <X size={14} className="text-slate-600" />
          </button>
        </div>

        {/* Voucher list */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-5 py-4 space-y-3 bg-slate-50 overscroll-contain">
          {vouchers?.length === 0 ? (
            <div className="text-center py-10">
              <Tag size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-semibold">You have no active coupons available.</p>
            </div>
          ) : vouchers?.map((v) => {
            const isSelected = selectedVoucher?.id === v.id
            const isFreebie = v.type === 'GAMEPLAY_FREEBIE'

            return (
              <div 
                key={v.id}
                onClick={async () => {
                  if (isFreebie) {
                    const res = await claimFreeVoucher(v.id)
                    if (res.success) {
                      showToast(res.message || 'Free bet claimed successfully!', 'success')
                      onClose()
                    } else {
                      showToast(res.error || 'Failed to claim coupon.', 'error')
                    }
                  } else {
                    onSelectVoucher(v)
                    onClose()
                  }
                }}
                className={`relative bg-white border-2 rounded-2xl pl-6 pr-6 py-4 shadow-sm transition-all cursor-pointer select-none overflow-hidden flex items-center gap-4 ${
                  isSelected 
                    ? 'border-emerald-500 bg-emerald-500/5 shadow-emerald-50' 
                    : isFreebie 
                      ? 'border-indigo-200 bg-indigo-50/5 hover:border-indigo-300'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Curved Ticket Cutouts (Left & Right) */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 rounded-full bg-slate-50 border-r border-slate-200 z-10" />
                <div className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-5 h-5 rounded-full bg-slate-50 border-l border-slate-200 z-10" />

                {/* Radio Circle or Gift icon */}
                <div className="shrink-0 z-10 pl-1">
                  {isFreebie ? (
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Gift size={12} className="text-indigo-600" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={12} className="text-white font-bold" strokeWidth={3} />}
                    </div>
                  )}
                </div>

                {/* Ticket Details */}
                <div className="flex-1 min-w-0 pr-1 z-10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-slate-800 truncate">{v.title}</span>
                  </div>
                  
                  {/* Rules */}
                  <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-500 leading-snug">
                    {v.rules.map((rule, idx) => (
                      <p key={idx} className="flex items-center gap-1">
                        <span className="text-emerald-500">•</span>
                        {rule}
                      </p>
                    ))}
                  </div>

                  {/* Expiry and Countdown */}
                  <div className="mt-2.5 flex items-center justify-between text-[9px] text-slate-400 border-t border-dashed border-slate-200 pt-2 font-medium">
                    <span>{v.expiry}</span>
                    <CountdownTimer countdownText={v.countdownText} voucherId={v.id} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DepositTab({ onNavigate, showToast }) {
  const { vouchers, claimFreeVoucher } = useUser()
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [showVoucherDrawer, setShowVoucherDrawer] = useState(false)

  const selectedAmount = amount ? parseInt(amount) : customAmount ? parseInt(customAmount) : 0
  
  // Calculate Cash and Bonus Reward splits for the summary boxes
  let cashReward = 0;
  let bonusReward = 0;

  if (selectedVoucher) {
    const code = String(selectedVoucher.id || '').trim().toUpperCase();
    const rewardAmt = parseFloat(selectedVoucher.rewardAmount || 0);

    if (code === 'WELCOME150') {
      cashReward = 150.00;
      bonusReward = 0.00;
    } else if (code === 'HIGHROLLER500') {
      cashReward = 300.00;
      bonusReward = 200.00;
    } else if (code === 'CASHBACK200') {
      cashReward = 140.00;
      bonusReward = 60.00;
    } else if (code === 'SURVIVAL100') {
      cashReward = 25.00;
      bonusReward = 25.00;
    } else if (code === 'FREEBET50') {
      cashReward = 0.00;
      bonusReward = 30.00;
    } else if (code === 'COMEBACK200') {
      cashReward = 120.00;
      bonusReward = 80.00;
    } else if (code === 'ACTIVEPLAY50') {
      cashReward = 45.00;
      bonusReward = 5.00;
    } else if (code === 'LOYALTY250') {
      cashReward = 162.50;
      bonusReward = 87.50;
    } else if (code === 'WEEKEND50') {
      cashReward = 37.50;
      bonusReward = 12.50;
    } else if (code === 'RELOAD999') {
      cashReward = 549.45;
      bonusReward = 449.55;
    } else if (code === 'LUCKY5') {
      cashReward = 0.05 * selectedAmount;
      bonusReward = 0.00;
    } else if (code === 'LUCKY10') {
      cashReward = 0.10 * selectedAmount;
      bonusReward = 0.00;
    } else if (code === 'LUCKY15') {
      cashReward = 0.15 * selectedAmount;
      bonusReward = 0.00;
    } else {
      cashReward = 0.00;
      bonusReward = rewardAmt;
    }
  }

  const hasValidationError = selectedAmount > 0 && (selectedAmount < 100 || selectedAmount > 5000 || selectedAmount % 100 !== 0)
  const canProceed = selectedAmount >= 100 && selectedAmount <= 5000 && selectedAmount % 100 === 0

  const handleSelectAmount = (val) => {
    setAmount(String(val))
    setCustomAmount('')
  }

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomAmount(val)
    setAmount('')
  }

  const handleSelectVoucher = (v) => {
    if (selectedVoucher?.id === v.id) {
      setSelectedVoucher(null)
    } else {
      setSelectedVoucher(v)
      if (selectedAmount < v.minDeposit) {
        handleSelectAmount(v.minDeposit)
        showToast(`Amount adjusted to ₹${v.minDeposit} for this voucher!`)
      }
    }
  }

  const handleProceed = () => {
    if (!canProceed) {
      if (selectedAmount < 100) {
        showToast('Minimum deposit amount is ₹100', 'error')
      } else if (selectedAmount > 5000) {
        showToast('Maximum deposit amount is ₹5,000', 'error')
      } else if (selectedAmount % 100 !== 0) {
        showToast('Deposit amount must be a multiple of ₹100', 'error')
      }
      return
    }
    if (selectedVoucher && selectedAmount < selectedVoucher.minDeposit) {
      showToast(`Minimum deposit for ${selectedVoucher.title} is ₹${selectedVoucher.minDeposit}`, 'error')
      return
    }
    onNavigate?.('depositGateway', { amount: selectedAmount, voucher: selectedVoucher })
  }

  // Auto-clear selectedVoucher if it is claimed or no longer in vouchers list
  useEffect(() => {
    if (selectedVoucher && !vouchers.some(v => v.id === selectedVoucher.id)) {
      setSelectedVoucher(null)
    }
  }, [vouchers])

  return (
    <div className="space-y-5">
      {/* Amount Selection */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Select Amount
        </label>
        <div className="grid grid-cols-6 gap-2">
          {DEPOSIT_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => handleSelectAmount(a)}
              className={`py-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                parseInt(amount) === a
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-primary/30'
              }`}
            >
              ₹{a}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Or Enter Custom Amount
        </label>
        <div className="relative">
          <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            inputMode="numeric"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="Enter amount (multiples of 100)"
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        {hasValidationError ? (
          <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
            <AlertCircle size={12} /> {
              selectedAmount < 100 ? 'Minimum deposit is ₹100' :
              selectedAmount > 5000 ? 'Maximum deposit is ₹5,000' :
              'Amount must be in multiples of ₹100'
            }
          </p>
        ) : (
          <p className="text-[10px] text-slate-400 font-medium mt-1.5 uppercase tracking-wide">
            Deposit min: ₹100 & max: ₹5,000 allowed each time (multiples of ₹100)
          </p>
        )}
      </div>

      {/* Side-by-side Cash & Bonus double calculation cards */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-0.5">
          Receive Summary (For This Deposit)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Cash Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col items-center justify-center relative overflow-hidden shadow-sm hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500" />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Cash Credited</span>
            <span className="text-xl font-black text-emerald-600 font-mono">₹{(selectedAmount + cashReward).toFixed(2)}</span>
          </div>
          {/* Bonus Box */}
          <div className="bg-gradient-to-b from-white to-slate-50/50 border border-slate-200 rounded-2xl p-3.5 flex flex-col items-center justify-center relative overflow-hidden shadow-sm hover:border-purple-500/30 transition-colors">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-purple-500" />
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Promo Bonus</span>
            <span className="text-xl font-black text-purple-600 font-mono">₹{bonusReward.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Voucher Selection Container */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Deposit Offer Voucher
        </label>
        <CompactVoucherSelector
          selectedVoucher={selectedVoucher}
          onSelectVoucher={handleSelectVoucher}
          onOpenDrawer={() => setShowVoucherDrawer(true)}
          vouchers={vouchers}
        />
      </div>

      {/* Proceed Button */}
      <button
        onClick={handleProceed}
        disabled={!canProceed}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <ArrowDownRight size={16} />
        {canProceed
          ? `Proceed to Deposit — ₹${selectedAmount.toLocaleString()}`
          : 'Select an Amount'}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Min. deposit: ₹100 · Instant processing
      </p>

      {/* Support Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-650 shadow-sm mt-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-primary shrink-0" />
          <span>Having issues with your deposit?</span>
        </div>
        <button 
          onClick={() => onNavigate?.('support')}
          className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
        >
          Chat with Support
        </button>
      </div>

      {/* Drawer */}
      <VoucherSelectionDrawer
        show={showVoucherDrawer}
        onClose={() => setShowVoucherDrawer(false)}
        selectedVoucher={selectedVoucher}
        onSelectVoucher={handleSelectVoucher}
        vouchers={vouchers}
        claimFreeVoucher={claimFreeVoucher}
        showToast={showToast}
      />
    </div>
  )
}

function WithdrawTab({ onNavigate }) {
  const { user, availableBalance, realBalance, bonusBalance, requiredWager, depositRecords, withdrawRecords, setWithdrawRecords, savedBanks, savedUpis, fetchUserHistory } = useUser()
  const [amount, setAmount] = useState('')
  const [customAmount, setCustomAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState(savedBanks.length > 0 ? 'bank' : savedUpis.length > 0 ? 'upi' : 'bank')
  
  const [selectedBankIdx, setSelectedBankIdx] = useState(0)
  const [selectedUpiIdx, setSelectedUpiIdx] = useState(0)

  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState(null)

  const selectedAmount = amount ? parseInt(amount) : customAmount ? parseInt(customAmount) : 0
  const feeData = calculateWithdrawalFee(selectedAmount)

  const hasBanks = savedBanks.length > 0
  const hasUpis = savedUpis.length > 0
  const hasMethods = hasBanks || hasUpis

  const activeBank = hasBanks ? savedBanks[selectedBankIdx] : null
  const activeUpi = hasUpis ? savedUpis[selectedUpiIdx] : null

  const methodAvailable =
    (withdrawMethod === 'bank' && activeBank) || (withdrawMethod === 'upi' && activeUpi)

  const totalDeposit = user?.totalDeposits || 0
  const vipLevel = getVipLevel(totalDeposit)
  const vipLimit = vipLevel === 0 ? 2000 : getVipLimit(vipLevel)
  const totalWithdrawn = withdrawRecords.reduce((acc, curr) => acc + (['PENDING', 'PROCESSING', 'APPROVED', 'PAID'].includes(curr.status) ? curr.amount : 0), 0)
  const showCapacityCard = totalWithdrawn >= vipLimit || (selectedAmount > 0 && totalWithdrawn + selectedAmount > vipLimit) || vipLevel === 0

  /* Validation */
  let validationError = null
  if (selectedAmount > 0) {
    if (selectedAmount < WITHDRAW_MIN) {
      validationError = `Minimum withdrawal is ₹${WITHDRAW_MIN}`
    } else if (selectedAmount > WITHDRAW_MAX) {
      validationError = `Maximum withdrawal is ₹${WITHDRAW_MAX.toLocaleString()}`
    } else if (selectedAmount > availableBalance) {
      validationError = `Insufficient available balance. You have ₹${availableBalance.toFixed(2)} available.`
    } else if (selectedAmount % 100 !== 0) {
      validationError = 'Amount must be in multiples of ₹100'
    }
  }

  const canWithdraw =
    selectedAmount >= WITHDRAW_MIN &&
    selectedAmount <= WITHDRAW_MAX &&
    selectedAmount <= availableBalance &&
    selectedAmount % 100 === 0 &&
    hasMethods &&
    methodAvailable &&
    !validationError

  const handleSelectAmount = (val) => {
    setAmount(String(val))
    setCustomAmount('')
    setServerError(null)
  }

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setCustomAmount(val)
    setAmount('')
    setServerError(null)
  }

  const handleWithdraw = async () => {
    if (!canWithdraw) return
    setProcessing(true)
    setServerError(null)

    try {
      const token = localStorage.getItem('token') || ''
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      
      const payload = {
        amount: selectedAmount,
        paymentMethod: withdrawMethod === 'bank' ? 'BANK' : 'UPI',
      }

      if (withdrawMethod === 'bank') {
        payload.accountHolderName = activeBank.holderName
        payload.accountNumber = activeBank.accountNumber
        payload.ifscCode = activeBank.ifsc
      } else {
        payload.upiId = activeUpi.upiId
      }

      const response = await fetch(`${API_BASE}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Withdrawal failed')
      }

      await fetchUserHistory()
      setSuccess(true)
    } catch (err) {
      setServerError(err.message || 'Connection error. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Withdrawal Initiated!</h2>
        <p className="text-sm text-slate-500 mt-1 text-center px-4 leading-relaxed">
          ₹{selectedAmount.toLocaleString()} will be sent to your{' '}
          {withdrawMethod === 'bank' ? `bank account (****${activeBank.accountNumber.slice(-4)})` : `UPI (${activeUpi.upiId})`} within 24 hours.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 w-full max-w-xs animate-[scaleUp_0.2s_ease-out]">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Withdrawal Amount</span>
            <span className="font-bold text-slate-700">₹{selectedAmount}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Processing Fee (Deducted on payout)</span>
            <span className="font-bold text-red-500">+₹{feeData.fee}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-200 pt-1 mt-1">
            <span className="text-slate-500 font-semibold">Total Wallet Deduction</span>
            <span className="font-bold text-indigo-600">₹{selectedAmount}</span>
          </div>
        </div>
        <button
          onClick={() => {
            setSuccess(false)
            setAmount('')
            setCustomAmount('')
          }}
          className="mt-6 px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl cursor-pointer hover:bg-primary/90 transition-colors"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Wagering Requirement Alert */}
      {requiredWager > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 shadow-sm border-dashed border-amber-250 animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-xs font-bold text-amber-800">Active Bonus Wagering (Informational)</p>
            <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
              Your bonus balance (₹{bonusBalance.toFixed(2)}) is locked. You can still withdraw your real money balance (₹{realBalance.toFixed(2)}). To convert your bonus to withdrawable real cash, wager ₹{requiredWager.toLocaleString()} more in games.
            </p>
          </div>
        </div>
      )}

      {/* No methods linked warning */}
      {!hasMethods && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3 animate-[fadeIn_0.2s_ease-out]">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">No Payment Method Linked</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Please add a Bank Account or UPI in the "Methods" tab before withdrawing.
            </p>
          </div>
        </div>
      )}

      {/* Method Toggle and Account Lists */}
      {hasMethods && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Withdraw Method
            </label>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                disabled={!hasBanks}
                onClick={() => setWithdrawMethod('bank')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  withdrawMethod === 'bank'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Building2 size={14} /> Bank Account
              </button>
              <button
                disabled={!hasUpis}
                onClick={() => setWithdrawMethod('upi')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  withdrawMethod === 'upi'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Smartphone size={14} /> UPI Account
              </button>
            </div>
          </div>

          {/* Account Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
              Select Destination Account
            </label>
            {withdrawMethod === 'bank' && hasBanks && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {savedBanks.map((bank, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedBankIdx(idx)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      selectedBankIdx === idx 
                        ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Building2 size={16} className={selectedBankIdx === idx ? 'text-indigo-600' : 'text-slate-400'} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800">Bank ****{bank.accountNumber.slice(-4)}</p>
                        <p className="text-[9px] text-slate-400 font-medium font-mono truncate">{bank.ifsc} · {bank.holderName}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selectedBankIdx === idx ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedBankIdx === idx && <Check size={8} className="text-white font-bold" strokeWidth={3} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {withdrawMethod === 'upi' && hasUpis && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {savedUpis.map((upi, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedUpiIdx(idx)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                      selectedUpiIdx === idx 
                        ? 'border-indigo-500 bg-indigo-50/10 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Smartphone size={16} className={selectedUpiIdx === idx ? 'text-indigo-600' : 'text-slate-400'} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{upi.upiId}</p>
                        <p className="text-[9px] text-slate-400 font-medium truncate">{upi.holderName}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selectedUpiIdx === idx ? 'border-primary bg-primary' : 'border-slate-300 bg-white'
                    }`}>
                      {selectedUpiIdx === idx && <Check size={8} className="text-white font-bold" strokeWidth={3} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Amount Selection */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Select Amount
        </label>
        <div className="grid grid-cols-3 gap-2">
          {WITHDRAW_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => handleSelectAmount(a)}
              className={`py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                parseInt(amount) === a
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-primary/30'
              }`}
            >
              ₹{a.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
          Or Enter Custom Amount
        </label>
        <div className="relative">
          <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            inputMode="numeric"
            value={customAmount}
            onChange={handleCustomChange}
            placeholder="₹100 — ₹5,000 (multiples of 100)"
            className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        {validationError && (
          <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
            <AlertCircle size={12} /> {validationError}
          </p>
        )}
        {serverError && (
          <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1 animate-[fadeIn_0.2s_ease-out]">
            <AlertCircle size={12} /> {serverError}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-1">
          Withdrawable: ₹{availableBalance.toFixed(2)} · Min: ₹{WITHDRAW_MIN} · Max: ₹{WITHDRAW_MAX.toLocaleString()}
        </p>
      </div>

      {/* ── Fee Calculator ── */}
      {selectedAmount >= WITHDRAW_MIN && selectedAmount <= WITHDRAW_MAX && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Info size={13} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Fee Breakdown</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 font-semibold">Withdrawal Amount (Payout)</span>
              <span className="text-sm font-bold text-slate-800">₹{selectedAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-slate-500 font-medium">Processing Fee</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">
                  {feeData.feePercent}%
                </span>
              </div>
              <span className="text-sm font-bold text-red-500">+₹{feeData.fee.toLocaleString()}</span>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total Wallet Deduction</span>
              <span className="text-lg font-bold text-indigo-600">₹{(selectedAmount + feeData.fee).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Button */}
      <button
        onClick={handleWithdraw}
        disabled={!canWithdraw || processing}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <ArrowUpRight size={16} />
            {canWithdraw
              ? `Withdraw — You Receive ₹${selectedAmount.toLocaleString()}`
              : !hasMethods
              ? 'Link a Payment Method First'
              : selectedAmount > 0
              ? 'Fix Errors Above'
              : 'Select an Amount'}
          </>
        )}
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Processed within 24 hours · ₹{WITHDRAW_MIN}–₹{WITHDRAW_MAX.toLocaleString()} per transaction
      </p>

      {/* Support Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-650 shadow-sm mt-2">
        <div className="flex items-center gap-1.5">
          <HelpCircle size={14} className="text-primary shrink-0" />
          <span>Need help with your withdrawal?</span>
        </div>
        <button 
          onClick={() => onNavigate?.('support')}
          className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
        >
          Chat with Support
        </button>
      </div>
    </div>
  )
}

function BankAccountCard({ bank, onEdit, onDelete }) {
  const [showAccount, setShowAccount] = useState(false)
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-emerald-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-600" strokeWidth={3} />
          <span className="text-xs font-bold text-emerald-700">Bank Account Linked</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="text-xs font-semibold text-primary cursor-pointer hover:underline"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-semibold text-rose-500 cursor-pointer hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Account Number</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-800 font-mono">
              {showAccount ? bank.accountNumber : '****' + bank.accountNumber.slice(-4)}
            </span>
            <button onClick={() => setShowAccount(!showAccount)} className="cursor-pointer text-slate-400">
              {showAccount ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">IFSC Code</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{bank.ifsc}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Account Holder</span>
          <div className="flex items-center gap-1">
            <Lock size={10} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-800">{bank.holderName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpiAccountCard({ upi, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-emerald-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-600" strokeWidth={3} />
          <span className="text-xs font-bold text-emerald-700">UPI Account Linked</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="text-xs font-semibold text-primary cursor-pointer hover:underline"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-semibold text-rose-500 cursor-pointer hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">UPI ID</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{upi.upiId}</span>
        </div>
        {/* DO NOT show QR Code preview here per user request! */}
        <div className="flex justify-between">
          <span className="text-xs text-slate-500">Account Holder</span>
          <div className="flex items-center gap-1">
            <Lock size={10} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-800">{upi.holderName}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentMethodsTab({ userName, showToast }) {
  const { savedBanks, setSavedBanks, savedUpis, setSavedUpis, fetchUserHistory } = useUser()
  const [activeSection, setActiveSection] = useState('bank')
  const [formMode, setFormMode] = useState('list')
  const [editIndex, setEditIndex] = useState(null)

  const handleDeleteBank = async (idx, e) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/wallet/payment-methods/bank`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete bank account');
      }
      showToast('❌ Bank account deleted.')
      await fetchUserHistory()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error deleting bank account', 'error')
    }
  }

  const handleDeleteUpi = async (idx, e) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/wallet/payment-methods/upi`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete UPI account');
      }
      showToast('❌ UPI account deleted.')
      await fetchUserHistory()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error deleting UPI account', 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Section Toggle */}
      {formMode === 'list' && (
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm font-bold">
          <button
            onClick={() => setActiveSection('bank')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
              activeSection === 'bank' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={14} /> Bank Account ({savedBanks.length})
          </button>
          <button
            onClick={() => setActiveSection('upi')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
              activeSection === 'upi' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone size={14} /> UPI Account ({savedUpis.length})
          </button>
        </div>
      )}

      {/* Render list or forms */}
      {formMode === 'list' ? (
        activeSection === 'bank' ? (
          <div className="space-y-3">
            {savedBanks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm flex flex-col items-center">
                <Building2 size={24} className="text-slate-350 mb-2" />
                <p className="text-xs font-bold">No bank accounts linked yet</p>
                <button
                  onClick={() => setFormMode('add')}
                  className="mt-3 text-xs font-bold text-primary border border-primary/20 px-3.5 py-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
                >
                  + Add Bank Account
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {savedBanks.map((bank, idx) => (
                    <BankAccountCard 
                      key={idx}
                      bank={bank} 
                      onEdit={() => {
                        setEditIndex(idx)
                        setFormMode('edit')
                      }}
                      onDelete={(e) => handleDeleteBank(idx, e)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setFormMode('add')}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-primary/50 text-slate-500 hover:text-primary rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-white/50 transition-all cursor-pointer"
                >
                  <Building2 size={14} />
                  Add Another Bank Account
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {savedUpis.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 shadow-sm flex flex-col items-center">
                <Smartphone size={24} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold">No UPI accounts linked yet</p>
                <button
                  onClick={() => setFormMode('add')}
                  className="mt-3 text-xs font-bold text-primary border border-primary/20 px-3.5 py-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
                >
                  + Add UPI Account
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {savedUpis.map((upi, idx) => (
                    <UpiAccountCard 
                      key={idx}
                      upi={upi} 
                      onEdit={() => {
                        setEditIndex(idx)
                        setFormMode('edit')
                      }}
                      onDelete={(e) => handleDeleteUpi(idx, e)}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setFormMode('add')}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-primary/50 text-slate-500 hover:text-primary rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-white/50 transition-all cursor-pointer"
                >
                  <Smartphone size={14} />
                  Add Another UPI Account
                </button>
              </>
            )}
          </div>
        )
      ) : activeSection === 'bank' ? (
        <BankAccountForm
          userName={userName}
          savedBank={formMode === 'edit' ? savedBanks[editIndex] : null}
          onSave={async (data) => {
            const token = localStorage.getItem('token')
            const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
            try {
              const response = await fetch(`${API_BASE}/api/wallet/link-bank`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  accountNumber: data.accountNumber,
                  ifsc: data.ifsc,
                  bankName: data.bankName || 'Linked Account'
                })
              });
              const resData = await response.json();
              if (!response.ok) {
                throw new Error(resData.error || 'Failed to link bank account');
              }
              showToast(formMode === 'edit' ? '✅ Bank account updated successfully!' : '✅ Bank account saved successfully!');
              await fetchUserHistory();
              setFormMode('list');
              setEditIndex(null);
            } catch (err) {
              console.error(err);
              showToast(err.message || 'Error linking bank account', 'error');
            }
          }}
          onCancel={() => {
            setFormMode('list')
            setEditIndex(null)
          }}
        />
      ) : (
        <UpiAccountForm
          userName={userName}
          savedUpi={formMode === 'edit' ? savedUpis[editIndex] : null}
          onSave={async (data) => {
            const token = localStorage.getItem('token')
            const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
            try {
              const response = await fetch(`${API_BASE}/api/wallet/link-upi`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  upiId: data.upiId
                })
              });
              const resData = await response.json();
              if (!response.ok) {
                throw new Error(resData.error || 'Failed to link UPI ID');
              }
              showToast(formMode === 'edit' ? '✅ UPI account updated successfully!' : '✅ UPI account saved successfully!');
              await fetchUserHistory();
              setFormMode('list');
              setEditIndex(null);
            } catch (err) {
              console.error(err);
              showToast(err.message || 'Error linking UPI ID', 'error');
            }
          }}
          onCancel={() => {
            setFormMode('list')
            setEditIndex(null)
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

function BankAccountForm({ userName, savedBank, onSave, onCancel }) {
  const [accountNumber, setAccountNumber] = useState(savedBank?.accountNumber || '')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(savedBank?.accountNumber || '')
  const [ifsc, setIfsc] = useState(savedBank?.ifsc || '')

  const accountMismatch =
    confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber
  const ifscValid = /^[A-Z0-9]{4,16}$/.test(ifsc.toUpperCase())
  const canSave =
    accountNumber.length >= 9 &&
    accountNumber.length <= 16 &&
    accountNumber === confirmAccountNumber &&
    ifscValid

  const handleSave = () => {
    if (!canSave) return
    onSave({
      accountNumber,
      ifsc: ifsc.toUpperCase(),
      holderName: userName,
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Building2 size={16} className="text-indigo-500" />
        {savedBank ? 'Edit Bank Account' : 'Add Bank Account'}
      </h3>

      {/* Account Number */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
          Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
          placeholder="Enter account number (Max 16 digits)"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Re-enter Account Number */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
          Re-enter Account Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={confirmAccountNumber}
          onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))}
          placeholder="Re-enter to confirm"
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 transition-all ${
            accountMismatch
              ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
              : 'border-slate-200 focus:ring-primary/30 focus:border-primary'
          }`}
        />
        {accountMismatch && (
          <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> Account numbers do not match
          </p>
        )}
      </div>

      {/* IFSC Code */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
          IFSC Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
          placeholder="e.g. SBIN0001234"
          maxLength={16}
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 transition-all ${
            ifsc.length > 0 && !ifscValid
              ? 'border-red-300 focus:ring-red-250 focus:border-red-400'
              : 'border-slate-200 focus:ring-primary/30 focus:border-primary'
          }`}
        />
        {ifsc.length > 0 && !ifscValid && (
          <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> Invalid IFSC format (must be 4 to 16 alphanumeric characters)
          </p>
        )}
      </div>

      {/* Account Holder Name — READ ONLY */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          Account Holder Name
          <Lock size={10} className="text-slate-400" />
        </label>
        <div className="relative">
          <input
            type="text"
            value={userName}
            readOnly
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-200 px-2 py-0.5 rounded">
            <Lock size={8} /> Auto-filled
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 italic">
          This name is pulled from your signup profile and cannot be changed.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Check size={16} />
        {savedBank ? 'Update Bank Account' : 'Save Bank Account'}
      </button>

      <button
        onClick={onCancel}
        className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

function UpiAccountForm({ userName, savedUpi, onSave, onCancel, showToast }) {
  const [upiId, setUpiId] = useState(savedUpi?.upiId || '')
  const [qrPreview, setQrPreview] = useState(savedUpi?.qrImage || null)
  const fileInputRef = useRef(null)

  const upiValid = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/.test(upiId)
  const canSave = upiValid

  const handleQrUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be under 5MB', 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => setQrPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    if (!canSave) return
    onSave({
      upiId,
      qrImage: qrPreview,
      holderName: userName,
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Smartphone size={16} className="text-indigo-500" />
        {savedUpi ? 'Edit UPI Account' : 'Add UPI Account'}
      </h3>

      {/* UPI ID */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
          UPI ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value.trim())}
          placeholder="yourname@upi"
          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 transition-all ${
            upiId.length > 3 && !upiValid
              ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
              : 'border-slate-200 focus:ring-primary/30 focus:border-primary'
          }`}
        />
        {upiId.length > 3 && !upiValid && (
          <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
            <AlertCircle size={12} /> Invalid UPI format (e.g. name@upi)
          </p>
        )}
      </div>

      {/* QR Code Upload */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
          QR Code Image <span className="text-slate-400">(Optional)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleQrUpload}
          className="hidden"
        />
        {qrPreview ? (
          <div className="relative w-full">
            <img
              src={qrPreview}
              alt="QR Preview"
              className="w-full h-40 object-contain bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button
              onClick={() => {
                setQrPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
          >
            <Upload size={24} className="text-slate-400" />
            <p className="text-xs text-slate-500 font-medium">Tap to upload QR image</p>
            <p className="text-[10px] text-slate-400">PNG, JPG up to 5MB</p>
          </button>
        )}
      </div>

      {/* Account Holder Name — READ ONLY */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          UPI Account Holder Name
          <Lock size={10} className="text-slate-400" />
        </label>
        <div className="relative">
          <input
            type="text"
            value={userName}
            readOnly
            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-200 px-2 py-0.5 rounded">
            <Lock size={8} /> Auto-filled
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 italic">
          This name is pulled from your signup profile and cannot be changed.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Check size={16} />
        {savedUpi ? 'Update UPI Account' : 'Save UPI Account'}
      </button>

      <button
        onClick={onCancel}
        className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
