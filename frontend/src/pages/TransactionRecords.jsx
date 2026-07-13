import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Info, Copy, Check, ChevronDown, ChevronUp, AlertTriangle, Upload, X, Loader2, AlertCircle } from 'lucide-react'

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

export default function TransactionRecords({ onBack }) {
  const { depositRecords, withdrawRecords, betRecords, fetchUserHistory } = useUser()
  const [activeTab, setActiveTab] = useState('deposit')
  const [copiedId, setCopiedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Appeal dispute form and toast states
  const [appealingId, setAppealingId] = useState(null)
  const [utrNumber, setUtrNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getDepositStatusLabel = (rec) => {
    const statusLower = rec.status.toLowerCase();
    const appealStatusLower = rec.appealStatus ? rec.appealStatus.toLowerCase() : null;

    if (appealStatusLower === 'approved') {
      return "Approved by the customer service";
    }
    if (appealStatusLower === 'rejected') {
      return "Appeal Rejected";
    }
    if (appealStatusLower === 'pending') {
      return "Appeal Pending";
    }
    if (statusLower === 'failed') {
      return "Deposit Failed";
    }
    return rec.status;
  };

  const getDepositStatusStyles = (rec) => {
    const statusLower = rec.status.toLowerCase();
    const appealStatusLower = rec.appealStatus ? rec.appealStatus.toLowerCase() : null;

    if (appealStatusLower === 'approved') {
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
    if (appealStatusLower === 'rejected' || statusLower === 'failed') {
      return 'bg-red-50 text-red-550 border-red-100';
    }
    if (appealStatusLower === 'pending' || statusLower === 'pending') {
      return 'bg-amber-50 text-amber-600 border-amber-100';
    }
    return 'bg-slate-50 text-slate-500 border-slate-200';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be under 5MB.', 'error')
        return
      }
      setScreenshotFile(file)
    }
  }

  const handleSubmitAppeal = async (e, deposit) => {
    e.preventDefault()
    if (!utrNumber.trim()) {
      showToast('Please enter the 12-digit UTR number.', 'error')
      return
    }
    if (utrNumber.trim().length !== 12) {
      showToast('UTR number must be exactly 12 digits.', 'error')
      return
    }
    if (!whatsappNumber.trim()) {
      showToast('Please enter your active WhatsApp number.', 'error')
      return
    }
    if (whatsappNumber.trim().length !== 10) {
      showToast('WhatsApp phone number must be exactly 10 digits.', 'error')
      return
    }
    if (!screenshotFile) {
      showToast('Please upload a screenshot of your payment.', 'error')
      return
    }

    setSubmittingAppeal(true)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    
    const formData = new FormData()
    formData.append('utr', utrNumber.trim())
    formData.append('whatsapp', whatsappNumber.trim())
    formData.append('screenshot', screenshotFile)
    if (deposit?.dbId) {
      formData.append('depositId', deposit.dbId)
    }

    try {
      const res = await fetch(`${API_BASE}/api/payment/appeal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit payment appeal.')
      }

      showToast('🎉 Appeal submitted successfully! We will verify it shortly.', 'success')
      setAppealingId(null)
      setUtrNumber('')
      setWhatsappNumber('')
      setScreenshotFile(null)
      
      // Refresh history to update local statuses
      fetchUserHistory?.()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingAppeal(false)
    }
  }

  const handleCopy = (id) => {
    copyToClipboard(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-6 relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
        } text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span className="flex-1 text-[11px] leading-relaxed">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80 border-0 bg-transparent cursor-pointer">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={16} className="text-slate-600" />
        </button>
        <h1 className="text-base font-bold text-slate-800">Transaction Records</h1>
      </header>

      {/* Tab Selectors */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 sticky top-[61px] z-30">
        <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner font-sans">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
              activeTab === 'deposit'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            <ArrowDownRight size={14} className={activeTab === 'deposit' ? 'text-indigo-600' : 'text-slate-400'} />
            Deposits
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
              activeTab === 'withdraw'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            <ArrowUpRight size={14} className={activeTab === 'withdraw' ? 'text-indigo-650' : 'text-slate-400'} />
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('bets')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
              activeTab === 'bets'
                ? 'bg-white text-indigo-650 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            <svg className={`w-3.5 h-3.5 ${activeTab === 'bets' ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Game Bets
          </button>
        </div>
      </div>

      {/* Info notice explaining TRX ID */}
      <div className="px-4 pt-4 bg-slate-50 shrink-0">
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 flex items-start gap-2.5 shadow-sm">
          <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-750 leading-relaxed font-medium">
            <span className="font-bold text-indigo-900 block mb-0.5">TRX ID Tracking</span>
            A unique TRX ID is assigned to every deposit and withdrawal transaction. These IDs are record-tracking reference codes used to verify transfer history and resolve account billing inquiries or issues with customer support quickly.
          </p>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 px-4 py-4 space-y-3 bg-slate-50">
        {activeTab === 'deposit' ? (
          depositRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg className="w-12 h-12 mb-3 stroke-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-xs font-bold text-slate-500">No deposit records found</p>
              <p className="text-[10px] text-slate-400 mt-1">Make a deposit to see your records here.</p>
            </div>
          ) : (
            depositRecords.map((rec) => {
              const showAppealForm = appealingId === rec.id
              const isAppealable = rec.status.toLowerCase() === 'pending' && (Date.now() - rec.timestamp <= 7 * 24 * 60 * 60 * 1000)

              return (
                <div key={rec.id} className={`bg-white border rounded-2xl p-3.5 shadow-sm transition-all ${
                  showAppealForm ? 'border-indigo-500/50 shadow-md shadow-indigo-500/5' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center gap-3.5">
                    {/* Left Icon Badge */}
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <ArrowDownRight size={18} />
                    </div>

                    {/* Middle Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Deposit via {rec.method || 'UPI'}</span>
                        {rec.voucher && (
                          <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 border border-indigo-100">Voucher</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium mt-0.5">
                        <span>{rec.date}</span>
                        <span>•</span>
                        <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-500">{rec.id}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(rec.id)
                          }}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer flex items-center gap-0.5 border-0 bg-transparent"
                          title="Copy Transaction ID"
                        >
                          {copiedId === rec.id ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                          {copiedId === rec.id && <span className="text-[8px] text-emerald-650 font-bold">Copied</span>}
                        </button>
                      </div>
                      {rec.voucher && (
                        <p className="text-[9px] text-indigo-500 font-semibold mt-1">🎟️ code: {rec.voucher}</p>
                      )}
                    </div>

                    {/* Right Column (Amount & Status) */}
                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-sm font-extrabold ${
                        rec.status.toLowerCase() === 'completed' || (rec.appealStatus && rec.appealStatus.toLowerCase() === 'approved')
                          ? 'text-emerald-600'
                          : rec.status.toLowerCase() === 'pending' || (rec.appealStatus && rec.appealStatus.toLowerCase() === 'pending')
                          ? 'text-amber-600'
                          : 'text-red-500'
                      }`}>
                        +₹{rec.amount.toLocaleString()}
                      </span>
                      {rec.bonus > 0 && (
                        <span className="text-[8px] text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                          +₹{rec.bonus} Bonus
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border tracking-wide ${getDepositStatusStyles(rec)}`}>
                        {getDepositStatusLabel(rec)}
                      </span>
                    </div>
                  </div>

                  {/* Rejected Appeal Callout Banner */}
                  {rec.appealStatus === 'rejected' && rec.appealAdminNote && (
                    <div className="mt-3 p-3.5 bg-red-50/70 border border-red-100 rounded-2xl flex items-start gap-2.5 text-red-850 animate-[fadeIn_0.2s_ease-out] shadow-sm">
                      <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                      <div className="text-[10px] leading-relaxed text-left">
                        <span className="font-bold text-red-955 block mb-0.5">Appeal Rejected by Support</span>
                        <span className="font-semibold">{rec.appealAdminNote}</span>
                      </div>
                    </div>
                  )}

                  {/* 7-Day Appeal Trigger Link */}
                  {isAppealable && !showAppealForm && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => {
                          setAppealingId(rec.id)
                          setUtrNumber('')
                          setWhatsappNumber('')
                          setScreenshotFile(null)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-700 cursor-pointer transition-all outline-none"
                      >
                        <AlertTriangle size={12} className="text-amber-600 animate-pulse" />
                        Appeal Payment
                      </button>
                    </div>
                  )}

                  {/* Dispute Form */}
                  {showAppealForm && (
                    <form 
                      onSubmit={(e) => handleSubmitAppeal(e, rec)} 
                      className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-3.5 animate-[fadeIn_0.15s_ease-out]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-indigo-655 flex items-center gap-1.5 uppercase tracking-wider">
                          <AlertTriangle size={12} className="text-amber-550 animate-pulse" /> File Payment Appeal
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppealingId(null)}
                          className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-655 cursor-pointer border-0 bg-transparent"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="p-3.5 text-xs rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                        {/* UTR Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                            12-Digit UTR Number
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Enter 12-digit transaction UTR"
                            className="w-full h-9 px-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 rounded-xl text-xs placeholder:text-slate-350 focus:outline-none transition-all font-mono"
                          />
                        </div>

                        {/* WhatsApp Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                            WhatsApp Phone Number
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 text-[10px] font-bold font-mono">
                              +91
                            </span>
                            <input
                              type="text"
                              maxLength={10}
                              value={whatsappNumber}
                              onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Enter active WhatsApp number"
                              className="w-full h-9 pl-10 pr-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 rounded-xl text-xs placeholder:text-slate-355 focus:outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        {/* Screenshot File Upload */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                            Recharge Payment Screenshot
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50/50 text-slate-500 hover:text-slate-600 cursor-pointer transition-all text-[10px]">
                              <Upload size={13} className="text-slate-400" />
                              {screenshotFile ? (
                                <span className="font-semibold text-indigo-600 truncate max-w-[180px]">{screenshotFile.name}</span>
                              ) : (
                                <span>Choose Screenshot Image</span>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                            {screenshotFile && (
                              <button
                                type="button"
                                onClick={() => setScreenshotFile(null)}
                                className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center text-red-550 transition-all cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-400">Only JPG, PNG and WEBP file types up to 5MB are accepted.</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAppealingId(null)}
                          className="px-3 py-2 rounded-xl text-slate-555 hover:text-slate-700 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 cursor-pointer border-0"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingAppeal}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[10px] font-extrabold cursor-pointer border-0 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                        >
                          {submittingAppeal ? (
                            <>
                              <Loader2 size={11} className="animate-spin" />
                              Filing Appeal...
                            </>
                          ) : (
                            'Submit Appeal'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )
            })
          )) : activeTab === 'withdraw' ? (
          withdrawRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg className="w-12 h-12 mb-3 stroke-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-xs font-bold text-slate-500">No withdrawal records found</p>
              <p className="text-[10px] text-slate-400 mt-1">Your initiated withdrawals will appear here.</p>
            </div>
          ) : (
            withdrawRecords.map((rec) => {
              const isExpanded = expandedId === rec.id
              return (
                <div 
                  key={rec.id} 
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm hover:border-slate-300 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Left Icon Badge */}
                    <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                      <ArrowUpRight size={18} />
                    </div>

                    {/* Middle Column */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-800 block">
                        Withdrawal to {(rec.method || '').includes('Bank') || rec.method === 'BANK' ? 'Bank' : 'UPI'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium mt-0.5">
                        <span>{rec.date}</span>
                        <span>•</span>
                        <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-500">{rec.id}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(rec.id)
                          }}
                          className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer flex items-center gap-0.5 border-0 bg-transparent outline-none"
                          title="Copy Transaction ID"
                        >
                          {copiedId === rec.id ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                          {copiedId === rec.id && <span className="text-[8px] text-emerald-650 font-bold">Copied</span>}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-550 font-medium mt-1">
                        Fee: <span className="text-red-500 font-bold">₹{rec.fee}</span> · Net: <span className="text-emerald-600 font-bold">₹{rec.netAmount}</span>
                      </p>
                    </div>

                    {/* Right Column (Amount & Status) */}
                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-extrabold text-red-500">
                        -₹{rec.amount.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wide ${
                          rec.status === 'PAID' || rec.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          rec.status === 'PENDING' || rec.status === 'Processing' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                          rec.status === 'APPROVED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          rec.status === 'REJECTED' ? 'bg-red-50 text-red-500 border-red-100' :
                          'bg-slate-50 text-slate-550 border-slate-200'
                        }`}>
                          {rec.status}
                        </span>
                        {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expandable details timeline */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-[fadeIn_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
                      <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 space-y-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-400">Payment Method:</span>
                          <span className="font-bold text-slate-800">{rec.method}</span>
                        </div>
                        {rec.method === 'UPI' ? (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-400">UPI ID:</span>
                            <span className="font-bold text-slate-800 font-mono">{rec.upiId}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400">Beneficiary:</span>
                              <span className="font-bold text-slate-800">{rec.accountHolderName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400">Account Number:</span>
                              <span className="font-bold text-slate-800 font-mono">{rec.accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-400">IFSC Code:</span>
                              <span className="font-bold text-slate-800 font-mono">{rec.ifscCode}</span>
                            </div>
                          </>
                        )}
                        {rec.utrNumber && (
                          <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100/50 px-2.5 py-1.5 rounded-lg text-indigo-700 font-mono font-bold mt-1">
                            <span>UTR Ref:</span>
                            <span className="flex items-center gap-1.5">
                              {rec.utrNumber}
                              <button 
                                onClick={() => handleCopy(rec.utrNumber)}
                                className="p-0.5 rounded hover:bg-slate-200 text-indigo-500 hover:text-indigo-700 transition-colors border-0 bg-transparent"
                              >
                                {copiedId === rec.utrNumber ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              </button>
                            </span>
                          </div>
                        )}
                        {rec.adminNote && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-amber-800 text-[10px] leading-relaxed">
                            <span className="font-bold block mb-0.5">Admin Comment:</span>
                            {rec.adminNote}
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      <div className="px-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Withdrawal Progress Timeline</p>
                        <div className="relative border-l-2 border-slate-200 ml-1.5 pl-4 space-y-4">
                          {/* Step 1: Created */}
                          <div className="relative">
                            <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                            <div>
                              <p className="text-xs font-bold text-slate-800">Request Registered</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">The withdrawal order was generated and funds were successfully locked.</p>
                              <p className="text-[9px] text-slate-400 font-medium font-sans mt-0.5">{rec.date}</p>
                            </div>
                          </div>

                          {/* Step 2: Approved / Rejected */}
                          {(rec.status === 'APPROVED' || rec.status === 'PAID' || rec.status === 'REJECTED') && (
                            <div className="relative">
                              <span className={`absolute -left-[22px] top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                                rec.status === 'REJECTED' ? 'bg-red-500' : 'bg-indigo-600'
                              }`} />
                              <div>
                                <p className="text-xs font-bold text-slate-800">
                                  {rec.status === 'REJECTED' ? 'Request Rejected' : 'Verification Approved'}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {rec.status === 'REJECTED' 
                                    ? `This request was audited and rejected by administration. Locked funds have been re-credited.` 
                                    : 'Administrative review check completed. Transfer transaction initiated.'}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Step 3: Paid */}
                          {rec.status === 'PAID' && (
                            <div className="relative">
                              <span className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                              <div>
                                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                  <Check size={12} strokeWidth={3} />
                                  Payout Sent (Success)
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Payment dispatched with verified UTR transaction registry entry.
                                </p>
                                {rec.paidAt && (
                                  <p className="text-[9px] text-slate-400 font-medium font-sans mt-0.5">
                                    Paid Timestamp: {new Date(rec.paidAt).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )
        ) : (
          betRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <svg className="w-12 h-12 mb-3 stroke-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p className="text-xs font-bold text-slate-550">No game wagers found</p>
              <p className="text-[10px] text-slate-400 mt-1">Place bets on Colour or Dice games to see records here.</p>
            </div>
          ) : (
            betRecords.map((rec) => (
              <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
                {/* Left Icon Badge */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                  rec.amount > 0 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {rec.amount > 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                </div>

                {/* Middle Column */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-805 block">{rec.title}</span>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium mt-0.5">
                    <span>{rec.date}</span>
                    <span>•</span>
                    <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-500">{rec.id}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(rec.id)
                      }}
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-650 transition-colors cursor-pointer flex items-center gap-0.5 border-0 bg-transparent outline-none"
                      title="Copy Transaction ID"
                    >
                      {copiedId === rec.id ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                      {copiedId === rec.id && <span className="text-[8px] text-emerald-600 font-bold">Copied</span>}
                    </button>
                  </div>
                </div>

                {/* Right Column */}
                <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-sm font-extrabold ${rec.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {rec.amount > 0 ? `+₹${rec.amount.toFixed(2)}` : `-₹${Math.abs(rec.amount).toFixed(2)}`}
                  </span>
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wide">
                    {rec.status}
                  </span>
                </div>
              </div>
            ))
          )         )
        }
      </div>
    </div>
  )
}
