import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Clock, RefreshCw, X, QrCode, Copy, Check } from 'lucide-react';

export default function WithdrawalVerificationTab({
  adminToken,
  API_BASE,
  showToast,
  isSuperAdmin,
  isAdmin,
  fetchDashboardData
}) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1);
  const [withdrawTotalCount, setWithdrawTotalCount] = useState(0);
  const [withdrawSearch, setWithdrawSearch] = useState('');
  const [withdrawFilter, setWithdrawFilter] = useState('ALL');
  const [withdrawProcessingId, setWithdrawProcessingId] = useState(null);

  // Modal States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [predefinedReason, setPredefinedReason] = useState('Suspicious betting pattern detected');

  const [showPayModal, setShowPayModal] = useState(false);
  const [payId, setPayId] = useState(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [payUtr, setPayUtr] = useState('');
  const [payNote, setPayNote] = useState('');

  const [copiedState, setCopiedState] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const fetchWithdrawals = async () => {
    const token = adminToken || localStorage.getItem('token');
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/withdrawals?status=${withdrawFilter}&search=${withdrawSearch}&page=${withdrawPage}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setWithdrawals(data);
          setWithdrawTotalPages(1);
          setWithdrawTotalCount(data.length);
        } else {
          setWithdrawals(Array.isArray(data.records) ? data.records : []);
          setWithdrawTotalPages(data.pagination?.pages || 1);
          setWithdrawTotalCount(data.pagination?.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load admin withdrawals:', err);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [withdrawFilter, withdrawSearch, withdrawPage]);

  const handleApprove = async (id) => {
    setWithdrawProcessingId(id);
    const token = adminToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${id}/processing`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve request');
      showToast('Request approved successfully!', 'success');
      await fetchWithdrawals();
      if (fetchDashboardData) await fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setWithdrawProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectId) return;
    const token = adminToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${rejectId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ 
          rejectionReason: rejectNote,
          predefinedReason: predefinedReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject request');
      showToast('Request rejected and user balance re-credited successfully.', 'success');
      setShowRejectModal(false);
      setRejectId(null);
      setRejectNote('');
      setPredefinedReason('Suspicious betting pattern detected');
      await fetchWithdrawals();
      if (fetchDashboardData) await fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payId || !payUtr.trim()) return;
    const token = adminToken || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${payId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ utrNumber: payUtr, adminNote: payNote })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark as paid');
      showToast('Request marked as PAID and locked funds permanently released.', 'success');
      setShowPayModal(false);
      setPayId(null);
      setPayUtr('');
      setPayNote('');
      setSelectedWithdrawal(null);
      await fetchWithdrawals();
      if (fetchDashboardData) await fetchDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredWithdrawals = withdrawals.filter(req => {
    const matchesStatus = 
      withdrawFilter === 'ALL' || 
      (withdrawFilter === 'PENDING' && (req.status === 'PENDING' || req.status === 'PROCESSING')) ||
      (withdrawFilter === 'COMPLETED' && (req.status === 'PAID' || req.status === 'APPROVED')) ||
      (req.status === withdrawFilter);
    
    if (!matchesStatus) return false;

    const query = withdrawSearch?.toLowerCase() || '';
    if (!query) return true;
    
    return (
      req.id?.toString().toLowerCase().includes(query) ||
      (req.user_name || req.userName)?.toString().toLowerCase().includes(query) ||
      (req.phone_number || req.userPhone || req.phone)?.toString().includes(query) ||
      (req.withdrawal_id || req.withdrawalId)?.toString().toLowerCase().includes(query)
    );
  });

  const upiQrData = selectedWithdrawal ? `upi://pay?pa=${selectedWithdrawal.upiId}&pn=${encodeURIComponent(selectedWithdrawal.userName || 'Playnixclub User')}&am=${selectedWithdrawal.amount}&cu=INR&tn=${encodeURIComponent(selectedWithdrawal.withdrawalId)}&tr=${encodeURIComponent(selectedWithdrawal.withdrawalId)}` : '';

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out] font-sans pb-20">
      {/* Quick Metrics Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending Queue</p>
            <p className="text-xl font-black text-white mt-1">
              {filteredWithdrawals.filter(w => w.status === 'PENDING').length} <span className="text-[10px] text-amber-500 font-normal">requests</span>
            </p>
          </div>
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/15">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Processing Queue</p>
            <p className="text-xl font-black text-white mt-1">
              {filteredWithdrawals.filter(w => w.status === 'PROCESSING').length} <span className="text-[10px] text-blue-500 font-normal">active</span>
            </p>
          </div>
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/15">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Volume</p>
            <p className="text-xl font-black text-rose-500 mt-1 font-mono">
              ₹{filteredWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/15">
            <QrCode className="w-4 h-4 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search HUD Section */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by User, Phone, ID..."
            value={withdrawSearch}
            onChange={(e) => setWithdrawSearch(e.target.value)}
            className="flex-1 h-10 bg-slate-950 border border-slate-800 focus:border-slate-700 text-slate-200 rounded-xl px-4 text-xs placeholder:text-slate-600 focus:outline-none transition-colors font-sans"
          />
          <button
            onClick={fetchWithdrawals}
            className="w-10 h-10 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center shrink-0"
            title="Refresh Queue"
          >
            <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setWithdrawFilter(status);
                setWithdrawPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black border transition-all cursor-pointer shrink-0 uppercase tracking-wider border-0 ${
                withdrawFilter === status
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 shadow-lg shadow-indigo-500/5'
                  : 'bg-[#0a0f1d] text-slate-500 border border-slate-900 hover:text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Withdrawals Grid/List */}
      {filteredWithdrawals.length === 0 ? (
        <div className="bg-[#0c1225]/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 shadow-xl">
          <Clock size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No withdrawals found</p>
          <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">Withdrawal requests matching the criteria will list here.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-[#0c1225]/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[9px] font-black text-slate-450 uppercase tracking-widest select-none">
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Request ID & Date</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Method & Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {filteredWithdrawals.map((rec) => {
                  const isProcessing = withdrawProcessingId === rec.id;
                  const isUpi = rec.paymentMethod === 'UPI';
                  const isExpanded = !!expandedRows[rec.id];
                  return (
                    <React.Fragment key={rec.id}>
                      <tr 
                        className={`hover:bg-slate-900/15 transition-all duration-200 cursor-pointer ${isExpanded ? 'bg-slate-950/20' : ''}`}
                        onClick={() => toggleRow(rec.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-200">{rec.userName || 'Unknown User'}</div>
                            <span className="text-[8px] text-slate-500 font-bold select-none">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{rec.userPhone || 'No Phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-slate-400 text-[11px]">{rec.withdrawalId}</div>
                          <div className="text-[10px] text-slate-550 mt-1">Created: {new Date(rec.createdAt).toLocaleString()}</div>
                          {rec.paidAt && <div className="text-[10px] text-emerald-500/80 font-bold mt-0.5">Paid: {new Date(rec.paidAt).toLocaleString()}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-rose-500 font-mono">₹{parseFloat(rec.amount).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-white bg-slate-800/80 border border-slate-700/30 px-1.5 py-0.5 rounded tracking-wide uppercase">{rec.paymentMethod}</span>
                            {isUpi ? (
                              <div className="text-[10px] text-slate-400 font-mono mt-1 select-all">{rec.upiId}</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 space-y-0.5 select-all">
                                <p className="truncate">Holder: {rec.accountHolderName}</p>
                                <p className="font-mono">No: {rec.accountNumber}</p>
                                <p className="font-mono text-[9px] text-slate-500">IFSC: {rec.ifscCode}</p>
                              </div>
                            )}
                            {rec.utrNumber && (
                              <div className="text-[9px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block select-all">
                                UTR: {rec.utrNumber}
                              </div>
                            )}
                            {rec.adminNote && (
                              <div className="text-[9px] text-slate-500 bg-[#070b13]/40 border border-slate-800 p-2 rounded-lg mt-1 max-w-[220px] leading-relaxed">
                                <span className="font-bold text-slate-400">Note:</span> {rec.adminNote}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider select-none ${
                            rec.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                            rec.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {(isSuperAdmin || isAdmin) && (rec.status === 'PENDING' || rec.status === 'PROCESSING') && (
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setRejectId(rec.id);
                                  setShowRejectModal(true);
                                }}
                                disabled={isProcessing}
                                className="px-2 py-1 bg-[#0b0c15] hover:bg-rose-950/20 border border-rose-900/30 text-rose-550 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                              >
                                Reject
                              </button>
                              {rec.status === 'PENDING' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleApprove(rec.id);
                                  }}
                                  disabled={isProcessing}
                                  className="px-2 py-1 bg-[#0b0c15] hover:bg-blue-950/20 border border-blue-900/30 text-blue-400 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                                >
                                  Approve
                                </button>
                              )}
                              {rec.status === 'PROCESSING' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setPayId(rec.id);
                                    setSelectedWithdrawal(rec);
                                    setShowPayModal(true);
                                  }}
                                  disabled={isProcessing}
                                  className="px-2 py-1 bg-[#0b0c15] hover:bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={6} className="px-6 py-4 border-t border-slate-800/25">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400 leading-relaxed font-sans text-xs">
                              <div>
                                <h4 className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">User Details</h4>
                                <p><span className="font-bold text-slate-500">ID:</span> {rec.userId}</p>
                                <p><span className="font-bold text-slate-500">Name:</span> {rec.userName}</p>
                                <p><span className="font-bold text-slate-500">Phone:</span> {rec.userPhone || 'No Phone'}</p>
                              </div>
                              <div>
                                <h4 className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">Method Details</h4>
                                <p><span className="font-bold text-slate-500">Method:</span> {rec.paymentMethod}</p>
                                {isUpi ? (
                                  <p><span className="font-bold text-slate-500">UPI ID:</span> <span className="select-all font-mono text-[11px] text-indigo-400">{rec.upiId}</span></p>
                                ) : (
                                  <>
                                    <p><span className="font-bold text-slate-500">Bank:</span> {rec.bankName}</p>
                                    <p><span className="font-bold text-slate-500">Holder:</span> {rec.accountHolderName}</p>
                                    <p><span className="font-bold text-slate-500">Account:</span> <span className="select-all font-mono text-[11px] text-white">{rec.accountNumber}</span></p>
                                    <p><span className="font-bold text-slate-500">IFSC:</span> <span className="select-all font-mono text-[11px] text-indigo-400">{rec.ifscCode}</span></p>
                                  </>
                                )}
                              </div>
                              <div>
                                <h4 className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-2">System Metrics</h4>
                                <p><span className="font-bold text-slate-500">TX ID:</span> {rec.withdrawalId}</p>
                                <p><span className="font-bold text-slate-500">Requested:</span> {new Date(rec.createdAt).toLocaleString()}</p>
                                {rec.paidAt && <p><span className="font-bold text-slate-500">Processed:</span> {new Date(rec.paidAt).toLocaleString()}</p>}
                                {rec.utrNumber && <p><span className="font-bold text-slate-500">UTR:</span> <span className="select-all font-mono text-emerald-400">{rec.utrNumber}</span></p>}
                                {rec.adminNote && <p className="italic text-slate-550 mt-1"><span className="font-bold text-slate-400 not-italic">Admin Comment:</span> "{rec.adminNote}"</p>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredWithdrawals.map((rec) => {
              const isProcessing = withdrawProcessingId === rec.id;
              const isUpi = rec.paymentMethod === 'UPI';
              const isExpanded = !!expandedRows[rec.id];
              return (
                <div 
                  key={rec.id} 
                  className={`bg-[#0c1225]/40 border border-slate-800 rounded-2xl p-4 space-y-3 ${isExpanded ? 'border-slate-700/60 bg-slate-950/10' : ''}`}
                  onClick={() => toggleRow(rec.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-200 text-xs">{rec.userName || 'Unknown User'}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{rec.userPhone || 'No Phone'}</p>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      rec.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                      rec.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {rec.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-t border-slate-800/30 pt-2.5">
                    <span className="text-[10px] font-mono text-slate-400">{rec.withdrawalId}</span>
                    <span className="text-sm font-black text-rose-500 font-mono">₹{parseFloat(rec.amount).toFixed(2)}</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800/30 pt-3 space-y-2.5 text-xs text-slate-400 font-sans leading-relaxed">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Method details ({rec.paymentMethod})</p>
                        {isUpi ? (
                          <p className="font-mono text-[11px] text-indigo-400 select-all mt-1">{rec.upiId}</p>
                        ) : (
                          <div className="mt-1 space-y-0.5 select-all">
                            <p>Holder: {rec.accountHolderName}</p>
                            <p className="font-mono">Account: {rec.accountNumber}</p>
                            <p className="font-mono text-[9px] text-slate-500">IFSC: {rec.ifscCode}</p>
                          </div>
                        )}
                      </div>
                      
                      {rec.utrNumber && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Transaction Reference</p>
                          <p className="font-mono text-emerald-400 select-all mt-0.5">UTR: {rec.utrNumber}</p>
                        </div>
                      )}

                      {rec.adminNote && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Admin Note</p>
                          <p className="italic text-slate-550 mt-0.5">"{rec.adminNote}"</p>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500">
                        <p>Requested: {new Date(rec.createdAt).toLocaleString()}</p>
                        {rec.paidAt && <p>Processed: {new Date(rec.paidAt).toLocaleString()}</p>}
                      </div>
                    </div>
                  )}

                  {(isSuperAdmin || isAdmin) && (rec.status === 'PENDING' || rec.status === 'PROCESSING') && (
                    <div className="flex gap-2 border-t border-slate-800/30 pt-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setRejectId(rec.id);
                          setShowRejectModal(true);
                        }}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 bg-[#0b0c15] hover:bg-rose-950/20 border border-rose-900/30 text-rose-550 text-[10px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                      >
                        Reject
                      </button>
                      {rec.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(rec.id)}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 bg-[#0b0c15] hover:bg-blue-950/20 border border-blue-900/30 text-blue-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                        >
                          Approve
                        </button>
                      )}
                      {rec.status === 'PROCESSING' && (
                        <button
                          onClick={() => {
                            setPayId(rec.id);
                            setSelectedWithdrawal(rec);
                            setShowPayModal(true);
                          }}
                          disabled={isProcessing}
                          className="flex-1 py-1.5 bg-[#0b0c15] hover:bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[10px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {withdrawTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={withdrawPage === 1}
                onClick={() => setWithdrawPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-300 cursor-pointer border-0"
              >
                Prev
              </button>
              <span className="text-xs font-bold text-slate-400">Page {withdrawPage} of {withdrawTotalPages}</span>
              <button
                disabled={withdrawPage === withdrawTotalPages}
                onClick={() => setWithdrawPage(p => Math.min(withdrawTotalPages, p + 1))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-300 cursor-pointer border-0"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* ── SUPER ADMIN: REJECT WITHDRAWAL MODAL ── */}
      {showRejectModal && (isSuperAdmin || isAdmin) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out] p-4">
          <div className="w-full max-w-md bg-[#0b1426]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Reject Withdrawal Request</h3>
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectId(null);
                  setRejectNote('');
                  setPredefinedReason('Suspicious betting pattern detected');
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Predefined Reason</label>
                  <select
                    value={predefinedReason}
                    onChange={(e) => setPredefinedReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 text-slate-100"
                  >
                    {['Suspicious betting pattern detected', 'Insufficient turnover balance', 'Bank server experiencing downtime', 'Multiple registration mismatch'].map((r) => (
                      <option key={r} value={r} className="bg-[#0b1426] text-slate-100">{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Custom Explanation note (Max 150 chars)</label>
                  <textarea
                    required
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    maxLength={150}
                    placeholder="Provide additional details for rejection (will be shown to user)..."
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 h-20 resize-none font-sans"
                  />
                  <div className="text-right text-[9px] text-slate-500 font-mono mt-1">
                    {rejectNote.length}/150
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectId(null);
                      setRejectNote('');
                      setPredefinedReason('Suspicious betting pattern detected');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                  >
                    Confirm Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN: MARK PAID WITHDRAWAL MODAL ── */}
      {showPayModal && (isSuperAdmin || isAdmin) && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out] p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1426] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1021]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <QrCode size={18} className="text-emerald-500"/> Record Payout Transaction
              </h3>
              <button 
                onClick={() => {
                  setShowPayModal(false);
                  setPayId(null);
                  setSelectedWithdrawal(null);
                  setPayUtr('');
                  setPayNote('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg border-0 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: QR Code Area */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center h-full">
                  <div className="w-full mb-6">
                    <h4 className="text-white text-sm font-bold mb-1 text-center">SCAN QR TO AUTO-FILL PAYOUT</h4>
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-[#0b1021] p-3 rounded-lg border border-slate-800 gap-2">
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] text-slate-400 uppercase">User / Amount</p>
                        <p className="text-xs font-bold text-white">{selectedWithdrawal.userId} ({selectedWithdrawal.userName})</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-black text-emerald-400">₹{selectedWithdrawal.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-slate-800 mb-4 inline-block">
                    <QRCodeSVG 
                      value={upiQrData} 
                      size={220} 
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium text-center mt-1">Scan this QR code using any UPI app</p>

                  {/* Quick Payout App Deep Links */}
                  {(() => {
                    const baseLink = upiQrData;
                    const phonePeLink = baseLink.replace('upi://', 'phonepe://');
                    const gpayLink = baseLink.replace('upi://', 'tez://upi/');
                    const paytmLink = baseLink.replace('upi://', 'paytmmp://');
                    return (
                      <div className="w-full max-w-[280px] mt-4 space-y-3">
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Quick App Pay</span>
                          <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">Mobile Only</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href={phonePeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-purple-650/10 hover:bg-purple-650/20 border border-purple-600/30 hover:border-purple-600/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-purple-400 group-hover:scale-105 transition-transform">PhonePe</span>
                          </a>
                          <a
                            href={gpayLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-blue-650/10 hover:bg-blue-650/20 border border-blue-600/30 hover:border-blue-600/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-blue-400 group-hover:scale-105 transition-transform">GPay</span>
                          </a>
                          <a
                            href={paytmLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-sky-400 group-hover:scale-105 transition-transform">Paytm</span>
                          </a>
                        </div>
                        <a
                          href={baseLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-[10px] uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-950/20 text-center cursor-pointer no-underline"
                        >
                          🚀 Open Default UPI App
                        </a>
                      </div>
                    );
                  })()}
                  
                  <div 
                    onClick={() => {
                      copyToClipboard(`RR-TXN-${selectedWithdrawal.id}`);
                      showToast('System Reference ID copied to clipboard!', 'success');
                    }}
                    className="bg-slate-950/60 hover:bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 cursor-pointer flex items-center justify-between gap-2 mt-4 select-none w-full max-w-[260px] transition-colors"
                  >
                    <span>📋 System Reference ID: <span className="text-emerald-400 font-bold font-mono">RR-TXN-{selectedWithdrawal.id}</span></span>
                    <Copy size={12} className="text-slate-500" />
                  </div>
                </div>

                {/* Right Side: Clipboard & Action Form */}
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h4 className="text-white text-xs font-bold mb-3 uppercase tracking-wider text-slate-400">Clipboard Dashboard</h4>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Target UPI ID</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={selectedWithdrawal.upiId || ''} className="bg-[#0b1021] border border-slate-800 text-emerald-400 text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none font-mono" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(selectedWithdrawal.upiId); setCopiedState('upi'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'upi' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Amount (INR)</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={selectedWithdrawal.amount || ''} className="bg-[#0b1021] border border-slate-800 text-white text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none font-mono" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(selectedWithdrawal.amount.toString()); setCopiedState('amount'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'amount' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Reference / Note</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={`Payout-${selectedWithdrawal.id}`} className="bg-[#0b1021] border border-slate-800 text-slate-400 text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none font-mono" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(`Payout-${selectedWithdrawal.id}`); setCopiedState('ref'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'ref' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-auto">
                    <form onSubmit={handlePaySubmit} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">12-Digit UTR Verification*</label>
                        <input
                          type="text"
                          required
                          value={payUtr}
                          onChange={(e) => setPayUtr(e.target.value)}
                          placeholder="Enter 12-digit UTR/TXN Ref ID..."
                          className="w-full bg-[#0b1021] border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:font-normal placeholder:text-slate-655 font-mono"
                        />
                      </div>
        
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Admin Comment (Optional)</label>
                        <textarea
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Add payment processing comment..."
                          className="w-full bg-[#0b1021] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 h-16 resize-none placeholder:text-slate-600"
                        />
                      </div>
        
                      <div className="flex gap-3 pt-3 border-t border-slate-800/50 mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectModal(true);
                            setRejectId(selectedWithdrawal.id);
                            setShowPayModal(false);
                          }}
                          className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                        >
                          Reject
                        </button>
                        <button
                          type="submit"
                          className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-900 text-xs font-black rounded-xl transition-colors cursor-pointer border-0 shadow-lg shadow-emerald-500/20"
                        >
                          Confirm & Settle Payout
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
