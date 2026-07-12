import React from 'react';
import { Tag, Trash2, Plus, Calendar } from 'lucide-react';

export default function PromotionsTab({
  couponsList,
  newCouponCode,
  setNewCouponCode,
  newCouponDiscountType,
  setNewCouponDiscountType,
  newCouponValue,
  setNewCouponValue,
  newCouponMinDeposit,
  setNewCouponMinDeposit,
  newCouponMaxUses,
  setNewCouponMaxUses,
  newCouponExpiresAt,
  setNewCouponExpiresAt,
  creatingCoupon,
  handleCreateCoupon,
  handleDeleteCoupon
}) {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Create Coupon Section */}
      <div className="bg-[#0f1629]/80 backdrop-blur-md border border-indigo-500/10 rounded-2xl p-6 lg:p-8 shadow-2xl shadow-indigo-900/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Plus size={20} className="text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">CREATE GIFT VOUCHER COUPON</h2>
        </div>

        <form onSubmit={handleCreateCoupon} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coupon Code*</label>
              <input
                type="text"
                required
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. EXTRA50"
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Discount Type*</label>
              <select
                value={newCouponDiscountType}
                onChange={(e) => setNewCouponDiscountType(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              >
                <option value="flat">Flat Cash (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Value*</label>
              <input
                type="number"
                required
                min="1"
                value={newCouponValue}
                onChange={(e) => setNewCouponValue(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min. Deposit (₹)</label>
              <input
                type="number"
                min="0"
                value={newCouponMinDeposit}
                onChange={(e) => setNewCouponMinDeposit(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Uses</label>
              <input
                type="number"
                min="1"
                value={newCouponMaxUses}
                onChange={(e) => setNewCouponMaxUses(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                Expiry Date & Time <Calendar size={12} className="text-slate-500" />
              </label>
              <input
                type="datetime-local"
                value={newCouponExpiresAt}
                onChange={(e) => setNewCouponExpiresAt(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all [color-scheme:dark]"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={creatingCoupon}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {creatingCoupon ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Vouchers Section */}
      <div className="bg-[#0f1629]/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 lg:p-8 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Tag size={20} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">ACTIVE DEPOSIT VOUCHERS</h2>
        </div>

        {couponsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#0a0f1c]/50 rounded-2xl border border-slate-800/50 border-dashed">
            <Tag size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-500 text-sm font-medium">No active coupons available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {couponsList.map(coupon => (
              <div key={coupon.id} className="group relative bg-[#0a0f1c] border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{coupon.code}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {coupon.discountType === 'flat' ? `₹${coupon.value} Off` : `${coupon.value}% Off`}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="block text-slate-500 mb-1">Min Deposit</span>
                    <span className="text-slate-300 font-medium font-mono">{coupon.minDeposit > 0 ? `₹${coupon.minDeposit}` : 'None'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-1">Uses</span>
                    <span className="text-slate-300 font-medium font-mono">{coupon.currentUses} / {coupon.maxUses > 0 ? coupon.maxUses : '∞'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-slate-500 mb-1">Expires</span>
                    <span className="text-slate-300 font-medium">
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
