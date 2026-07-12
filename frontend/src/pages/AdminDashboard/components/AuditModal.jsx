import React from 'react';
import { X, ArrowDownRight, ArrowUpRight, Clock, Receipt, Coins, Activity } from 'lucide-react';

export default function AuditModal({
  user,
  history,
  loading,
  onClose
}) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0a0f1c] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-[#0f1629]/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">USER HISTORY & AUDIT TRAIL</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-indigo-400 font-semibold">{user.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono text-sm">{user.phone}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-sm">UID: {user.uid}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 animate-pulse">Retrieving comprehensive audit logs...</p>
            </div>
          ) : (
            <>
              {/* Ledger Activity Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Receipt size={18} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-300 tracking-widest uppercase">Ledger Activity (Recent 50)</h3>
                </div>
                
                {(!history?.transactions || history.transactions.length === 0) ? (
                  <div className="bg-[#0f1629]/50 border border-slate-800/50 border-dashed rounded-2xl p-8 text-center">
                    <p className="text-slate-500 text-sm">No transactions recorded for this user.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.transactions.map((tx, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#0f1629] border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'win' || tx.type === 'refund' || tx.type.includes('credit')
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {(tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'win' || tx.type === 'refund' || tx.type.includes('credit')) 
                              ? <ArrowUpRight size={20} /> 
                              : <ArrowDownRight size={20} />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${
                                tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'win' || tx.type === 'refund' || tx.type.includes('credit')
                                  ? 'text-emerald-400' 
                                  : 'text-rose-400'
                              }`}>
                                {(tx.type === 'deposit' || tx.type === 'bonus' || tx.type === 'win' || tx.type === 'refund' || tx.type.includes('credit')) ? '+' : '-'}₹{Math.abs(parseFloat(tx.amount)).toFixed(2)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                                {tx.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 max-w-lg truncate">{tx.description}</p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 font-mono">
                              <Clock size={10} />
                              {new Date(tx.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Balance After</p>
                          <p className="text-sm font-mono text-white">₹{parseFloat(tx.balance_after).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Wager Records Section */}
              <section className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Coins size={18} className="text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-300 tracking-widest uppercase">Wager Records (Recent 50)</h3>
                </div>
                
                {(!history?.bets || history.bets.length === 0) ? (
                  <div className="bg-[#0f1629]/50 border border-slate-800/50 border-dashed rounded-2xl p-8 text-center">
                    <p className="text-slate-500 text-sm">No bets placed by this user.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.bets.map((bet, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#0f1629] border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">₹{parseFloat(bet.bet_amount).toFixed(2)}</span>
                            <span className="text-xs text-slate-400">on</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-blue-400 uppercase">
                              {bet.target}
                            </span>
                            <span className="text-xs text-slate-500 font-mono ml-2">Round: {bet.round_id}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              bet.is_settled 
                                ? bet.payout_amount > 0 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-400'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {!bet.is_settled ? 'PENDING' : bet.payout_amount > 0 ? 'WON' : 'LOST'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(bet.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Payout</p>
                          <p className={`text-sm font-mono font-bold ${bet.payout_amount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {bet.payout_amount > 0 ? `+₹${parseFloat(bet.payout_amount).toFixed(2)}` : '₹0.00'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0f1629]/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
