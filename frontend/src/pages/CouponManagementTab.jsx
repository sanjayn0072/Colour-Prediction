import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, CreditCard, X } from 'lucide-react';

export default function CouponManagementTab({
  adminToken,
  API_BASE,
  showToast,
  isSuperAdmin,
  isAdmin
}) {
  const [couponsList, setCouponsList] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscountType, setNewCouponDiscountType] = useState('flat');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponMinDeposit, setNewCouponMinDeposit] = useState('');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('');
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState('');
  const [newCouponMonthlyLimit, setNewCouponMonthlyLimit] = useState('1000');
  const [newCouponValidityDays, setNewCouponValidityDays] = useState('');
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Local Confirm Delete Modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchCoupons = async () => {
    const token = adminToken || localStorage.getItem('token');
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/coupons`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCouponsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCouponSubmit = async (e) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue.trim()) return;
    const token = adminToken || localStorage.getItem('token');
    setCreatingCoupon(true);
    const isEditing = editingCouponId !== null;
    try {
      const url = isEditing 
        ? `${API_BASE}/api/admin/coupons/${editingCouponId}`
        : `${API_BASE}/api/admin/coupons`;
      const response = await fetch(
        url,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            coupon_code: newCouponCode,
            discount_type: newCouponDiscountType,
            discount_value: parseFloat(newCouponValue),
            min_deposit_amount: parseFloat(newCouponMinDeposit) || 0.0,
            usage_limit: parseInt(newCouponMaxUses) || 1,
            monthly_limit: parseInt(newCouponMonthlyLimit) || 1000,
            validity_days: parseInt(newCouponValidityDays) || null,
            expire_date: newCouponExpiresAt ? new Date(newCouponExpiresAt).toISOString() : null,
            // Legacy fallbacks for safety
            code: newCouponCode,
            discountType: newCouponDiscountType,
            value: parseFloat(newCouponValue),
            minDeposit: parseFloat(newCouponMinDeposit) || 0.0,
            maxUses: parseInt(newCouponMaxUses) || 1,
            expiresAt: newCouponExpiresAt ? new Date(newCouponExpiresAt).toISOString() : null
          })
        }
      );
      if (response.ok) {
        showToast(isEditing ? 'Coupon updated successfully!' : 'Coupon created successfully!', 'success');
        setNewCouponCode('');
        setNewCouponValue('');
        setNewCouponMinDeposit('');
        setNewCouponMaxUses('');
        setNewCouponExpiresAt('');
        setNewCouponMonthlyLimit('1000');
        setNewCouponValidityDays('');
        setEditingCouponId(null);
        await fetchCoupons();
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to submit coupon', 'error');
      }
    } catch (err) {
      showToast('Error submitting coupon', 'error');
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleEditCouponClick = (c) => {
    setEditingCouponId(c.id);
    setNewCouponCode(c.code);
    setNewCouponDiscountType(c.discountType || 'flat');
    setNewCouponValue(String(c.value));
    setNewCouponMinDeposit(String(c.minDeposit));
    setNewCouponMaxUses(String(c.maxUses));
    setNewCouponMonthlyLimit(String(c.monthlyLimit || '1000'));
    setNewCouponValidityDays(c.validityDays ? String(c.validityDays) : '');
    
    if (c.expiresAt) {
      const d = new Date(c.expiresAt);
      const offset = d.getTimezoneOffset();
      const localTime = new Date(d.getTime() - offset * 60000);
      setNewCouponExpiresAt(localTime.toISOString().slice(0, 16));
    } else {
      setNewCouponExpiresAt('');
    }
  };

  const executeDeleteCoupon = async (couponId) => {
    const token = adminToken || localStorage.getItem('token');
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/coupons/${couponId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        }
      );
      if (response.ok) {
        showToast('Coupon deleted successfully!', 'success');
        await fetchCoupons();
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to delete coupon', 'error');
      }
    } catch (err) {
      showToast('Error deleting coupon', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Coupon Card */}
      <div className="bg-[#0c1225]/40 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Plus size={14} className="text-emerald-400" />
          {editingCouponId !== null ? 'Edit Promo Coupon' : 'Create Gift Voucher Coupon'}
        </h3>

        <form onSubmit={handleCreateCouponSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Coupon Code*</label>
              <input
                type="text"
                required
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME150"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 uppercase font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Reward Value (₹)*</label>
              <input
                type="number"
                step="0.01"
                required
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Discount Type</label>
              <select
                value={newCouponDiscountType}
                onChange={(e) => setNewCouponDiscountType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              >
                <option value="flat" className="bg-[#0b1426] text-white">Flat (Real Cash)</option>
                <option value="percentage" className="bg-[#0b1426] text-white">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Min Deposit required</label>
              <input
                type="number"
                value={newCouponMinDeposit}
                onChange={(e) => setNewCouponMinDeposit(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Max claims per user</label>
              <input
                type="number"
                value={newCouponMaxUses}
                onChange={(e) => setNewCouponMaxUses(e.target.value)}
                placeholder="1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Expires At Date</label>
              <input
                type="datetime-local"
                value={newCouponExpiresAt}
                onChange={(e) => setNewCouponExpiresAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Validity (Days)</label>
              <input
                type="number"
                placeholder="Null"
                value={newCouponValidityDays}
                onChange={(e) => setNewCouponValidityDays(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Total Monthly Budget</label>
              <input
                type="number"
                value={newCouponMonthlyLimit}
                onChange={(e) => setNewCouponMonthlyLimit(e.target.value)}
                placeholder="1000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-3">
            {editingCouponId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingCouponId(null);
                  setNewCouponCode('');
                  setNewCouponValue('');
                  setNewCouponMinDeposit('');
                  setNewCouponMaxUses('');
                  setNewCouponExpiresAt('');
                  setNewCouponMonthlyLimit('1000');
                  setNewCouponValidityDays('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 cursor-pointer border-0"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={creatingCoupon}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer border-0 shadow-lg shadow-indigo-650/10"
            >
              {creatingCoupon ? 'Submitting...' : editingCouponId !== null ? 'Save Changes' : 'Publish Coupon'}
            </button>
          </div>
        </form>
      </div>

      {/* Coupons List */}
      <div className="bg-[#0c1225]/40 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Tag size={14} className="text-indigo-400" />
          Active Coupons Catalog ({couponsList.length})
        </h3>

        {couponsList.length === 0 ? (
          <div className="text-center py-8 text-slate-550 italic text-xs">
            No coupons published yet. Use the vault fields above to publish.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {couponsList.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors shadow-inner"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-400 tracking-wider select-all uppercase">
                      {c.code}
                    </span>
                    <span className="text-[8px] font-black text-white bg-slate-800/80 border border-slate-750 px-1.5 py-0.5 rounded tracking-wide uppercase">
                      {c.discountType === 'percentage' ? 'Percent' : 'Flat'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-300">
                    Reward Value: <span className="font-mono text-indigo-350">₹{parseFloat(c.value).toFixed(2)}</span>
                    {c.discountType === 'percentage' && <span className="text-slate-500 font-normal"> ({c.value}%)</span>}
                  </div>

                  <div className="text-[10px] text-slate-500 space-y-0.5 font-medium">
                    <p>Min Deposit Required: <span className="font-mono">₹{c.minDeposit}</span></p>
                    <p>User Limit: <span className="font-mono">{c.maxUses} claims</span></p>
                    {c.monthlyLimit && <p>Budget: <span className="font-mono">{c.monthlyLimit} total</span></p>}
                    {c.validityDays && <p>Validity: <span className="font-mono">{c.validityDays} days</span></p>}
                    {c.expiresAt && (
                      <p className="text-rose-500/80 font-semibold">
                        Expires: {new Date(c.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleEditCouponClick(c)}
                    className="p-1.5 bg-indigo-950/35 hover:bg-indigo-900/50 text-indigo-400 rounded-lg transition-colors cursor-pointer border-0"
                    title="Edit Coupon"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(c.id)}
                    className="p-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer border-0"
                    title="Delete Coupon"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Local Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-[#0b1426] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Confirm Delete</h3>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this promo coupon? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeDeleteCoupon(deleteConfirmId)}
                  className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer border-0"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
