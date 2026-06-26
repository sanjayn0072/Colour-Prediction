import { useState } from 'react'
import { useUser } from '../context/UserContext'
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Info, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

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
  const { depositRecords, withdrawRecords, betRecords } = useUser()
  const [activeTab, setActiveTab] = useState('deposit')
  const [copiedId, setCopiedId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const handleCopy = (id) => {
    copyToClipboard(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-6">
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
            depositRecords.map((rec) => (
              <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
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
                      className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-655 transition-colors cursor-pointer flex items-center gap-0.5"
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
                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm font-extrabold text-emerald-600">
                    +₹{rec.amount.toLocaleString()}
                  </span>
                  {rec.bonus > 0 && (
                    <span className="text-[8px] text-emerald-700 font-black bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                      +₹{rec.bonus} Bonus
                    </span>
                  )}
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-wide">
                    Completed
                  </span>
                </div>
              </div>
            ))
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
