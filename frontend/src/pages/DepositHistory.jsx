import { useState, useEffect } from 'react'
import { ArrowLeft, CreditCard, Calendar, Clock, AlertTriangle, MessageSquare, Check, X, FileImage, Upload, HelpCircle } from 'lucide-react'

export default function DepositHistory({ onBack }) {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Appeal Form States
  const [appealingId, setAppealingId] = useState(null) // deposit transaction ID being appealed
  const [utrNumber, setUtrNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)
  
  // Toast Alert State
  const [toast, setToast] = useState(null)
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchHistory = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/payment/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        throw new Error('Failed to retrieve deposit history.')
      }
      const data = await res.json()
      setDeposits(data)
    } catch (err) {
      setError(err.message)
      showToast(err.message || 'Error fetching records', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

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
    if (!whatsappNumber.trim()) {
      showToast('Please enter your active WhatsApp number.', 'error')
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

      showToast('🎉 Appeal submitted successfully! We are verifying your payment.', 'success')
      setAppealingId(null)
      setUtrNumber('')
      setWhatsappNumber('')
      setScreenshotFile(null)
      
      // Refresh history to update local statuses
      fetchHistory()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingAppeal(false)
    }
  }

  // Helper check: Is deposit pending and less than 7 days old
  const canAppeal = (deposit) => {
    if (deposit.status.toLowerCase() !== 'pending') return false
    const createdAt = new Date(deposit.createdAt).getTime()
    const ageMs = Date.now() - createdAt
    return ageMs <= 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#070b13] text-slate-100 pb-8 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] ${
          toast.type === 'success' ? 'bg-indigo-600' : 'bg-rose-650 border border-rose-500'
        } text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-white hover:opacity-80">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0c1222]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center cursor-pointer transition-all"
          >
            <ArrowLeft size={16} className="text-slate-355" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Deposit Records</h1>
            <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Verify your payment history and file appeals.</p>
          </div>
        </div>
        <button
          onClick={fetchHistory}
          className="px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 transition-all"
        >
          Refresh
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-550 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold">Streaming deposit entries...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center my-6">
            <AlertTriangle className="mx-auto text-rose-400 mb-2" size={24} />
            <p className="text-xs font-bold text-rose-300">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-3 px-4 py-2 bg-rose-650 hover:bg-rose-600 text-[10px] font-bold rounded-lg text-white"
            >
              Retry Sync
            </button>
          </div>
        ) : deposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/20 border border-slate-900 border-dashed rounded-2xl p-6">
            <CreditCard size={36} className="text-slate-700 mb-3" />
            <p className="text-xs font-bold text-slate-400">No deposit records found</p>
            <p className="text-[9px] text-slate-500 mt-1">Submit your first recharge in the Wallet to generate records.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deposits.map((rec) => {
              const showAppealForm = appealingId === rec.id
              const isAppealable = canAppeal(rec)

              return (
                <div 
                  key={rec.id} 
                  className={`bg-[#0c1222]/60 border rounded-2xl p-3.5 transition-all ${
                    showAppealForm ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'border-slate-800/60 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Left Icon Badge */}
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                      <CreditCard size={15} className="text-indigo-400" />
                    </div>

                    {/* Middle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Pay0 Gateway Deposit</span>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(rec.createdAt).toLocaleString('en-US', { 
                            month: 'short', 
                            day: '2-digit', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono select-all">
                          ID: {rec.transactionId}
                        </span>
                      </div>
                    </div>

                    {/* Right Amount & Status */}
                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-black text-indigo-400">
                        +₹{parseFloat(rec.amount).toFixed(2)}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${
                        rec.status.toLowerCase() === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : rec.status.toLowerCase() === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-450 border-rose-500/20'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Appeal Trigger Link */}
                  {isAppealable && !showAppealForm && (
                    <div className="mt-3 pt-3 border-t border-slate-800/40 flex justify-end">
                      <button
                        onClick={() => {
                          setAppealingId(rec.id)
                          setUtrNumber('')
                          setWhatsappNumber('')
                          setScreenshotFile(null)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.25 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/25 text-[10px] font-bold text-amber-400 cursor-pointer transition-all"
                      >
                        <AlertTriangle size={11} />
                        ⚠️ Appeal Payment
                      </button>
                    </div>
                  )}

                  {/* Low-profile input wrapper grid for Dispute Form */}
                  {showAppealForm && (
                    <form 
                      onSubmit={(e) => handleSubmitAppeal(e, rec)} 
                      className="mt-3.5 pt-3.5 border-t border-slate-800/80 space-y-3 animate-[fadeIn_0.2s_ease-out]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 uppercase tracking-wider">
                          <AlertTriangle size={11} /> File Dispute Appeal
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppealingId(null)}
                          className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-350 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <div className="p-3 text-xs rounded-xl border border-slate-850 bg-slate-950/50 space-y-3.5">
                        {/* UTR Input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                            12-Digit UTR Number
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            value={utrNumber}
                            onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Enter 12-digit transaction UTR reference"
                            className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-100 rounded-lg text-xs placeholder:text-slate-600 focus:outline-none transition-all font-mono"
                          />
                        </div>

                        {/* WhatsApp Input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                            WhatsApp Phone Number
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-550 text-[10px] font-bold font-mono">
                              +91
                            </span>
                            <input
                              type="text"
                              maxLength={10}
                              value={whatsappNumber}
                              onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Enter active WhatsApp mobile"
                              className="w-full h-8 pl-10 pr-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-100 rounded-lg text-xs placeholder:text-slate-600 focus:outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        {/* Screenshot File Upload */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">
                            Recharge Payment Screenshot
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="flex-1 flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-slate-300 cursor-pointer transition-all text-[10px]">
                              <Upload size={12} />
                              {screenshotFile ? (
                                <span className="font-semibold text-indigo-400 truncate max-w-[150px]">{screenshotFile.name}</span>
                              ) : (
                                <span>Choose Screenshot</span>
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
                                className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-400 transition-all cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-500">Only JPG, PNG and WEBP file types up to 5MB are accepted.</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={() => setAppealingId(null)}
                          className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 text-[10px] font-bold bg-slate-800/40 hover:bg-slate-800 cursor-pointer border-0"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingAppeal}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-955 text-[10px] font-black cursor-pointer border-0 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                        >
                          {submittingAppeal ? 'Filing Appeal...' : 'Submit Appeal'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
