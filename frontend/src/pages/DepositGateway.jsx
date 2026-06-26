import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { ArrowLeft, Copy, Check, QrCode, Clock, Shield, AlertCircle, HelpCircle } from 'lucide-react'

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
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

const COMPANY_UPI = 'colourplay@ybl'
const COMPANY_BANK = {
  name: 'ColourPlay Technologies Pvt Ltd',
  accountNumber: '9876543210123456',
  ifsc: 'SBIN0001234',
  bank: 'State Bank of India',
  branch: 'Mumbai Main Branch',
  type: 'Current Account',
}

export default function DepositGateway({ depositData, onBack, onNavigate }) {
  const { addDeposit, setDepositRecords } = useUser()
  /* This state simulates backend control — only one method active at a time */
  const [activeDepositMethod] = useState('upi')
  const [copied, setCopied] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [utr, setUtr] = useState('')
  
  const [orderData, setOrderData] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [orderError, setOrderError] = useState(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const amount = depositData?.amount || 0
  const voucher = depositData?.voucher || null

  useEffect(() => {
    let active = true
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token') || ''
        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
        const res = await fetch(`${API_BASE}/api/wallet/create-deposit-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount })
        })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to create deposit order')
        }
        const data = await res.json()
        if (active) {
          setOrderData(data)
          setLoadingOrder(false)
        }
      } catch (err) {
        if (active) {
          setOrderError(err.message)
          setLoadingOrder(false)
        }
      }
    }
    fetchOrder()
    return () => { active = false }
  }, [amount, reloadTrigger])

  const handleCopy = (text, field) => {
    copyToClipboard(text);
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConfirm = async () => {
    if (!orderData) return
    setProcessing(true)
    try {
      const token = localStorage.getItem('token') || ''
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const res = await fetch(`${API_BASE}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: orderData.amount,
          transactionId: orderData.transactionId,
          signature: orderData.signature,
          utr: utr
        })
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to confirm deposit')
      }
      
      let bonus = 0
      let voucherTitle = ''
      if (voucher) {
        const pct = typeof voucher === 'object' ? voucher.percent : (voucher.includes('june-14') ? 1 : voucher.includes('super') ? 3 : voucher.includes('pro') ? 5 : 0)
        bonus = Math.floor(amount * (pct / 100))
        voucherTitle = typeof voucher === 'object' ? voucher.title : voucher
      }
      
      addDeposit(amount, bonus)
      
      const newRecord = {
        id: orderData.transactionId,
        amount: amount,
        bonus: bonus,
        status: 'Completed',
        date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
        method: activeDepositMethod === 'upi' ? 'UPI' : 'Bank Transfer',
        voucher: voucherTitle || null,
        utr: utr,
        timestamp: Date.now()
      }
      setDepositRecords(prev => [newRecord, ...prev])
      setConfirmed(true)
    } catch (err) {
      console.error(err)
      alert(err.message || 'An error occurred during verification')
    } finally {
      setProcessing(false)
    }
  }

  if (loadingOrder) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6">
        <div className="w-10 h-10 border-4 border-indigo-655/30 border-t-indigo-600 rounded-full animate-spin mb-4" style={{ borderTopColor: '#4f46e5' }} />
        <p className="text-sm text-slate-500 font-medium">Generating secure payment session...</p>
      </div>
    )
  }

  if (orderError) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6 text-center">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Session Generation Failed</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{orderError}</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              setOrderError(null)
              setLoadingOrder(true)
              setReloadTrigger(prev => prev + 1)
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }


  /* ── Success Screen ── */
  if (confirmed) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 shadow-lg shadow-emerald-100">
          <Check size={36} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Payment Submitted!</h2>
        <p className="text-sm text-slate-500 mt-2 text-center leading-relaxed max-w-xs">
          Your deposit of <span className="font-bold text-slate-700">₹{amount.toLocaleString()}</span> is being verified. Amount will be credited within 5-10 minutes.
        </p>
        {voucher && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <p className="text-xs text-emerald-700 font-semibold">🎟️ Voucher "{typeof voucher === 'object' ? voucher.title : voucher}" applied!</p>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
          <Clock size={14} />
          <span className="text-xs font-semibold">Estimated: 5-10 minutes</span>
        </div>
        <button
          onClick={onBack}
          className="mt-8 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-200/50 cursor-pointer hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          Back to Wallet
        </button>
      </div>
    )
  }

  /* ── Main Gateway ── */
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <h1 className="text-base font-bold text-slate-800">Complete Deposit</h1>
      </header>

      <div className="px-4 pt-5 flex-1">
        {/* Amount Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white relative overflow-hidden mb-5">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Deposit Amount</p>
            <p className="text-3xl font-bold mt-1">₹{amount.toLocaleString()}</p>
            {voucher && (
              <div className="mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur px-2.5 py-1 rounded-full">
                <span className="text-[10px] font-bold text-white/90">🎟️ {typeof voucher === 'object' ? voucher.title : voucher}</span>
              </div>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
          <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Send the <span className="font-bold">exact amount</span> shown above. Your deposit will be verified and credited automatically within 5-10 minutes.
          </p>
        </div>

        {/* ── Dynamic Payment Block ── */}
        {activeDepositMethod === 'upi' ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Pay via UPI</h3>

            {/* QR Code */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
              <div className="w-48 h-48 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center mb-4">
                <QrCode size={64} className="text-slate-300 mb-2" />
                <p className="text-[10px] text-slate-400 font-medium">Scan to Pay</p>
              </div>
              <p className="text-xs text-slate-500 text-center">Scan this QR code using any UPI app<br />(GPay, PhonePe, Paytm, etc.)</p>
            </div>

            {/* UPI ID */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-medium mb-2">Or pay directly to UPI ID</p>
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                <span className="text-sm font-mono font-bold text-indigo-700">{COMPANY_UPI}</span>
                <button
                  onClick={() => handleCopy(COMPANY_UPI, 'upi')}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 cursor-pointer hover:underline"
                >
                  {copied === 'upi' ? (
                    <><Check size={12} /> Copied!</>
                  ) : (
                    <><Copy size={12} /> Copy</>
                  )}
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-700 mb-2">How to pay</p>
              <div className="space-y-2">
                {[
                  'Open your UPI app (GPay, PhonePe, etc.)',
                  `Send exactly ₹${amount.toLocaleString()} to ${COMPANY_UPI}`,
                  'After payment, tap "I Have Made the Payment" below',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-600">{i + 1}</span>
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Pay via Bank Transfer</h3>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {[
                { label: 'Account Name', value: COMPANY_BANK.name, key: 'name' },
                { label: 'Account Number', value: COMPANY_BANK.accountNumber, key: 'accNo' },
                { label: 'IFSC Code', value: COMPANY_BANK.ifsc, key: 'ifsc' },
                { label: 'Bank', value: COMPANY_BANK.bank, key: 'bank' },
                { label: 'Branch', value: COMPANY_BANK.branch, key: 'branch' },
                { label: 'Account Type', value: COMPANY_BANK.type, key: 'type' },
              ].map((item, i, arr) => (
                <div
                  key={item.key}
                  className={`p-4 flex items-center justify-between ${i !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{item.value}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(item.value, item.key)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 cursor-pointer hover:underline shrink-0 ml-3"
                  >
                    {copied === item.key ? (
                      <><Check size={12} /> Copied!</>
                    ) : (
                      <><Copy size={12} /> Copy</>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Steps */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-700 mb-2">How to pay</p>
              <div className="space-y-2">
                {[
                  'Open your banking app or net banking',
                  `Transfer exactly ₹${amount.toLocaleString()} to the account above`,
                  'Use NEFT/IMPS/RTGS for instant transfer',
                  'After payment, tap "I Have Made the Payment" below',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-indigo-600">{i + 1}</span>
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* UTR Input Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mt-5 space-y-2 animate-[fadeIn_0.2s_ease-out]">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Enter 12-Digit UTR (UPI Ref No)
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            value={utr}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '')
              if (val.length <= 12) setUtr(val)
            }}
            placeholder="e.g. 614002689210"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <p className="text-[10px] text-slate-400 leading-normal">
            *Ensure to copy the UTR/Reference number from your payment app transaction details and paste it here to verify deposit.
          </p>
        </div>

        {/* Important Notice */}
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3 mt-5">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">Important</p>
            <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
              • Send the exact amount: ₹{amount.toLocaleString()}<br />
              • Only confirm after completing payment and entering UTR<br />
              • Do not close this page during verification
            </p>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={processing || utr.length !== 12}
          className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-200/50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check size={16} />
              {utr.length === 12 ? 'I Have Made the Payment' : 'Enter 12-Digit UTR to Confirm'}
            </>
          )}
        </button>

        {/* Support helper block */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
          <HelpCircle size={14} className="text-indigo-600 shrink-0" />
          <span>Need help with payment?</span>
          <button 
            type="button"
            onClick={() => onNavigate?.('support')}
            className="text-indigo-650 font-bold hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
          >
            Chat with AI Support
          </button>
        </div>
      </div>
    </div>
  )
}
