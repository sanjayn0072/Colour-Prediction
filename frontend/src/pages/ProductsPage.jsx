import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { ArrowLeft, Search, Star, ShoppingCart } from 'lucide-react';

export default function ProductsPage({ onBack }) {
  const { products } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  // Categories list derived from products
  const categories = ['All', ...new Set((products || []).map(p => p.category || 'Tech'))];

  // Filter products cleanly and efficiently
  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (product.category || 'Tech') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#070b13]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-extrabold tracking-tight">Product Marketplace</h1>
          <p className="text-[10px] text-slate-400 font-medium">Claim premium products using your wallet balance</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-500 text-slate-100"
            />
          </div>

          {/* Categories Horizontal scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
            <ShoppingCart size={40} className="stroke-[1.5] text-slate-600" />
            <p className="text-xs font-semibold">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-200 group flex flex-col"
              >
                <div className="h-32 bg-slate-950 flex items-center justify-center relative p-4 border-b border-slate-800">
                  <img 
                    src={product.image_url ? `${API_BASE_URL}${product.image_url}` : (product.image ? product.image : '/uploads/placeholder.png')} 
                    onError={(e) => { e.target.src = '/uploads/placeholder.png'; }}
                    alt={product.title} 
                    className="h-24 w-24 object-contain group-hover:scale-105 transition-transform duration-300" 
                  />
                  {product.badge && (
                    <span className="absolute top-2 right-2 bg-rose-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-sm">
                      {product.badge}
                    </span>
                  )}
                </div>
                
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                      {product.title}
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-amber-500 font-bold">★ {product.rating || '4.8'}</span>
                      <span className="text-[9px] text-slate-500">({product.reviews || '120'})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-indigo-400">₹{(product.price || 0).toLocaleString()}</span>
                      {product.original && (
                        <span className="text-[9px] text-slate-500 line-through">₹{product.original.toLocaleString()}</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => onBack()} // Navigate to home to open product buy modal
                      className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Buy Product"
                    >
                      <ShoppingCart size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
