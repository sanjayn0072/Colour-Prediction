import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { 
  ArrowLeft, Search, Star, ShoppingCart, ArrowUp, ChevronDown, 
  Heart, X, MapPin, User as UserIcon, Phone, AlertTriangle, Check, Info as InfoIcon, ChevronRight
} from 'lucide-react';

export default function ProductsPage({ onBack, onNavigate }) {
  const { products, balance, setBalance, setOrders, fetchUserHistory } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [limit, setLimit] = useState(6);
  const [hasClickedShowMore, setHasClickedShowMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Favorites toggle tracking (local client simulated)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_product_favorites');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal checkout states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('detail'); // 'detail' | 'address' | 'success'
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [toast, setToast] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Address form states (loaded from localStorage or empty)
  const [deliveryName, setDeliveryName] = useState(() => localStorage.getItem('cp_delivery_name') || '');
  const [deliveryMobile, setDeliveryMobile] = useState(() => localStorage.getItem('cp_delivery_mobile') || '');
  const [deliveryPin, setDeliveryPin] = useState(() => localStorage.getItem('cp_delivery_pin') || '');
  const [deliveryCity, setDeliveryCity] = useState(() => localStorage.getItem('cp_delivery_city') || '');
  const [deliveryState, setDeliveryState] = useState(() => localStorage.getItem('cp_delivery_state') || '');
  const [deliveryLandmark, setDeliveryLandmark] = useState(() => localStorage.getItem('cp_delivery_landmark') || '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('cp_delivery_address') || '');
  const [deliveryType, setDeliveryType] = useState(() => localStorage.getItem('cp_delivery_type') || 'Home');

  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  useEffect(() => {
    localStorage.setItem('cp_product_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (productId, e) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Categories list derived from products
  const categories = ['All', ...new Set((products || []).map(p => p.category || 'Tech'))];

  // Filter products cleanly and efficiently
  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (product.category || 'Tech') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const displayedProducts = filteredProducts.slice(0, limit);

  // Handle infinite scroll & scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      if (hasClickedShowMore) {
        const threshold = 150;
        const reachedBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
        if (reachedBottom) {
          setLimit(prev => Math.min(prev + 6, filteredProducts.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasClickedShowMore, filteredProducts.length]);

  // Reset limit when query or category changes
  useEffect(() => {
    setLimit(6);
    setHasClickedShowMore(false);
  }, [searchQuery, selectedCategory]);

  const getProductImage = (product) => {
    if (product.image_url) {
      return `${API_BASE}${product.image_url}`;
    }
    return product.image || '/uploads/placeholder.png';
  };

  const getProductImagesArray = (product) => {
    if (product.images && Array.isArray(product.images)) {
      return product.images;
    }
    const mainImg = getProductImage(product);
    return [mainImg, mainImg]; // fallback gallery
  };

  const getDeliveryDateString = (productId) => {
    const seed = (productId % 5) + 3; // 3 to 7 days
    const date = new Date();
    date.setDate(date.getDate() + seed);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = date.getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `${day}${suffix} ${months[date.getMonth()]}`;
  };

  const openCheckout = (product) => {
    setSelectedProduct(product);
    setCheckoutStep('detail');
    setActiveImgIdx(0);
  };

  const isFormValid = () => {
    return (
      deliveryName.trim().length > 1 &&
      /^\d{10}$/.test(deliveryMobile.trim()) &&
      /^\d{6}$/.test(deliveryPin.trim()) &&
      deliveryCity.trim().length > 1 &&
      deliveryState.trim().length > 1 &&
      deliveryAddress.trim().length > 5
    );
  };

  const handleBuyProduct = async (product) => {
    if (isOrdering) return;
    setIsOrdering(true);
    setToast(null);

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE}/api/catalog/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          address: {
            name: deliveryName,
            mobile: deliveryMobile,
            pin: deliveryPin,
            landmark: deliveryLandmark,
            city: deliveryCity,
            state: deliveryState,
            address: deliveryAddress,
            type: deliveryType
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      setBalance(data.walletBalance);
      setOrderId(data.orderId);

      // Add to global orders array
      setOrders(prev => [data.order, ...prev]);
      setCheckoutStep('success');
      setToast(`🎉 Order placed for ${product.title}!`);
      await fetchUserHistory(); // Sync stats
    } catch (err) {
      console.error(err);
      setToast(`❌ ${err.message || 'An error occurred.'}`);
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-10">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] max-w-sm w-[90%] ${toast.startsWith('❌') ? 'bg-rose-600' : 'bg-emerald-600'} text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[slideDown_0.3s_ease-out]`}>
          {toast.startsWith('❌') ? <AlertTriangle size={16} /> : <Check size={16} />}
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer border-0 bg-transparent text-white outline-none"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 shadow-sm">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-800">Product Marketplace</h1>
          <p className="text-[10px] text-slate-500 font-medium">Claim premium products using your wallet balance</p>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors placeholder:text-slate-400 text-slate-800 shadow-sm"
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
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-0' 
                    : 'bg-white text-slate-500 hover:text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <ShoppingCart size={40} className="stroke-[1.5] text-slate-400" />
            <p className="text-xs font-semibold">No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 2-Column Professional E-Commerce Grid */}
            <div className="grid grid-cols-2 gap-3">
              {displayedProducts.map((product) => {
                const isFav = favorites[product.id] || false;
                const originalPrice = product.original || Math.round(product.price * 1.2);
                const discountPercent = Math.round(((originalPrice - product.price) / originalPrice) * 100);
                const rating = product.rating || (3.5 + (product.id % 2) * 0.4).toFixed(1);
                const reviewsCount = product.reviews || ((product.id * 17) % 150) + 12;

                return (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative group cursor-pointer"
                    onClick={() => openCheckout(product)}
                  >
                    {/* Image Container with Badges */}
                    <div className="h-44 bg-slate-50/50 flex items-center justify-center relative p-3 border-b border-slate-100">
                      <img 
                        src={getProductImage(product)} 
                        onError={(e) => { e.target.src = '/uploads/placeholder.png'; }}
                        alt={product.title} 
                        className="max-h-36 w-full object-contain group-hover:scale-105 transition-transform duration-300" 
                      />
                      
                      {/* AD Tag (Simulating real e-commerce ads) */}
                      <span className="absolute top-2.5 left-2.5 bg-slate-200/80 text-[8px] font-bold text-slate-600 px-1 py-0.5 rounded tracking-wide">
                        AD
                      </span>

                      {/* Favorite Heart Button */}
                      <button 
                        onClick={(e) => toggleFavorite(product.id, e)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/95 shadow-sm text-slate-400 hover:text-rose-500 active:scale-95 transition-all border-0 cursor-pointer flex items-center justify-center"
                      >
                        <Heart size={14} className={`stroke-[2.5] ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                      </button>

                      {/* Rating Overlay Badge (Bottom Left) */}
                      <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-[2px] border border-slate-100 rounded px-1.5 py-0.5 flex items-center gap-1 shadow-sm text-[9px] font-bold text-slate-700">
                        <span>{rating}</span>
                        <Star size={8} className="fill-amber-500 text-amber-500 stroke-none" />
                        <span className="text-slate-300 font-normal">|</span>
                        <span className="text-slate-500 font-normal text-[8px]">
                          {reviewsCount >= 1000 ? `${(reviewsCount / 1000).toFixed(1)}k` : reviewsCount}
                        </span>
                      </div>
                    </div>
                    
                    {/* Product Details Section */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2 bg-white">
                      <div className="space-y-0.5">
                        {/* Title / Brand */}
                        <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                          {product.title}
                        </h4>
                        {/* Subtitle / Category */}
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {product.category || 'Electronics'}
                        </p>
                      </div>
                      
                      {/* Price Matrix */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Discount percent */}
                          <span className="text-emerald-600 text-xs font-extrabold flex items-center">
                            ↓{discountPercent}%
                          </span>
                          {/* Original price (crossed out) */}
                          <span className="text-slate-400 text-[10px] line-through">
                            ₹{originalPrice.toLocaleString()}
                          </span>
                          {/* Final price */}
                          <span className="text-xs font-extrabold text-slate-900 ml-auto">
                            ₹{product.price.toLocaleString()}
                          </span>
                        </div>

                        {/* Special offer tag */}
                        <div className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-100/40 rounded px-1.5 py-0.5 inline-block">
                          WOW! ₹{Math.round(product.price * 0.72).toLocaleString()} with Wallet + more
                        </div>
                      </div>

                      {/* Delivery and Purchase Button */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <div>
                          Delivery by <span className="font-bold text-slate-700">{getDeliveryDateString(product.id)}</span>
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openCheckout(product);
                          }}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer shadow-sm border-0"
                          title="Buy Product"
                        >
                          <ShoppingCart size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More Button */}
            {!hasClickedShowMore && filteredProducts.length > limit && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    setLimit(prev => prev + 6);
                    setHasClickedShowMore(true);
                  }}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer border-0 outline-none active:scale-95"
                >
                  Show More <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Detail & Checkout Modal Overlay */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={() => setSelectedProduct(null)}>
          <div className="max-w-md w-full bg-white rounded-t-[2rem] overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col shadow-2xl animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Image Gallery Header */}
            {checkoutStep !== 'success' && (
              <div className="relative bg-slate-50 flex flex-col items-center justify-center border-b border-slate-100 shrink-0 p-4 pt-10">
                <div className="h-40 flex items-center justify-center">
                  <img 
                    src={getProductImagesArray(selectedProduct)[activeImgIdx] || getProductImage(selectedProduct)} 
                    alt={selectedProduct.title} 
                    className="h-36 w-36 object-contain drop-shadow-md transition-all duration-300" 
                  />
                </div>
                
                {/* Thumbnails Gallery */}
                <div className="flex gap-2.5 justify-center mt-2 shrink-0">
                  {getProductImagesArray(selectedProduct).slice(0, 3).map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveImgIdx(i)}
                      className={`w-11 h-11 rounded-lg border-2 p-0.5 bg-white overflow-hidden shadow-sm transition-all cursor-pointer ${
                        activeImgIdx === i ? 'border-indigo-600 scale-105 shadow-md shadow-indigo-600/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>

                {selectedProduct.badge && (
                  <span className="absolute top-4 right-4 bg-red-500 text-[10px] font-bold text-white px-2.5 py-1 rounded-lg shadow-sm">
                    {selectedProduct.badge}
                  </span>
                )}
                
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/95 border border-slate-200/80 flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 transition-colors border-0"
                >
                  <X size={16} className="text-slate-600" />
                </button>
              </div>
            )}

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-6 flex-1 scrollbar-hide">
              
              {/* STEP 1: PRODUCT DETAILS */}
              {checkoutStep === 'detail' && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">{selectedProduct.title}</h2>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={12} fill="currentColor" stroke="none" className="text-amber-500" />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 ml-1">{selectedProduct.rating || '4.2'}</span>
                        <span className="text-[10px] text-slate-400">({selectedProduct.reviews || '120'} reviews)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-indigo-600">₹{selectedProduct.price.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 line-through">₹{(selectedProduct.original || Math.round(selectedProduct.price * 1.2)).toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedProduct.description || 'Premium item crafted with exceptional design, modern ergonomics, and long-lasting durability. Exchange with your active wallet tokens.'}
                  </p>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Specifications</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-600 leading-tight">Original Brand</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-600 leading-tight">Fast Shipping</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-600 leading-tight">1-Year Warranty</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-600 leading-tight">Secure Packing</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => setCheckoutStep('address')} 
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer border-0"
                    >
                      Buy Now & Select Address <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: ADDRESS & CONFIRMATION */}
              {checkoutStep === 'address' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Address</h3>
                    <button 
                      onClick={() => setCheckoutStep('detail')} 
                      className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer border-0 bg-transparent outline-none"
                    >
                      Back
                    </button>
                  </div>

                  {/* Address Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
                      <div className="relative">
                        <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={deliveryName}
                          onChange={(e) => {
                            setDeliveryName(e.target.value);
                            localStorage.setItem('cp_delivery_name', e.target.value);
                          }}
                          placeholder="John Doe" 
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mobile Number</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            inputMode="numeric"
                            value={deliveryMobile}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                              setDeliveryMobile(val);
                              localStorage.setItem('cp_delivery_mobile', val);
                            }}
                            placeholder="10-digit number" 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">PIN Code</label>
                        <div className="relative">
                          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            inputMode="numeric"
                            value={deliveryPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                              setDeliveryPin(val);
                              localStorage.setItem('cp_delivery_pin', val);
                            }}
                            placeholder="6-digit PIN" 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">City</label>
                        <input 
                          type="text" 
                          value={deliveryCity}
                          onChange={(e) => {
                            setDeliveryCity(e.target.value);
                            localStorage.setItem('cp_delivery_city', e.target.value);
                          }}
                          placeholder="e.g. Mumbai" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">State</label>
                        <input 
                          type="text" 
                          value={deliveryState}
                          onChange={(e) => {
                            setDeliveryState(e.target.value);
                            localStorage.setItem('cp_delivery_state', e.target.value);
                          }}
                          placeholder="e.g. Maharashtra" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Landmark (Optional)</label>
                      <input 
                        type="text" 
                        value={deliveryLandmark}
                        onChange={(e) => {
                          setDeliveryLandmark(e.target.value);
                          localStorage.setItem('cp_delivery_landmark', e.target.value);
                        }}
                        placeholder="e.g. Near Star Mall" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Street Address</label>
                      <textarea 
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value);
                          localStorage.setItem('cp_delivery_address', e.target.value);
                        }}
                        rows="2"
                        placeholder="Flat/House No., Building Name, Street details" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Address Type</label>
                      <div className="flex gap-2">
                        {['Home', 'Office', 'Other'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setDeliveryType(type);
                              localStorage.setItem('cp_delivery_type', type);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              deliveryType === type
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Item Subtotal</span>
                      <span className="font-semibold text-slate-800">₹{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Shipping Fees</span>
                      <span className="font-semibold text-emerald-600">FREE</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-xs font-bold text-slate-800">
                      <span>Total Amount</span>
                      <span className="text-indigo-600">₹{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-[11px] text-slate-500">
                      <span>Your Wallet Balance</span>
                      <span className={`font-bold ${balance >= selectedProduct.price ? 'text-slate-700' : 'text-rose-500'}`}>₹{balance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Pay button */}
                  {balance >= selectedProduct.price ? (
                    <button 
                      onClick={() => handleBuyProduct(selectedProduct)}
                      disabled={isOrdering || !isFormValid()}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-2 border-0"
                    >
                      {isOrdering ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing Order...
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={14} />
                          Confirm Order & Pay ₹{selectedProduct.price.toLocaleString()}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-3 text-[11px] leading-relaxed flex items-start gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                        <span>Insufficient wallet balance. Please deposit money to purchase this product.</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProduct(null);
                          onNavigate?.('wallet');
                        }}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200/20 transition-all cursor-pointer border-0"
                      >
                        Go to Wallet / Deposit
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: SUCCESS CONFIRMATION */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-100">
                    <Check size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Your order is placed successfully!</h2>
                    <p className="text-xs text-slate-500 mt-1">Thank you for your purchase. Your item is being packed.</p>
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 text-left">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Order ID</span>
                      <span className="font-mono font-bold text-slate-700">{orderId}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Item</span>
                      <span className="font-bold text-slate-700 truncate max-w-[180px] text-right">{selectedProduct.title}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Price paid</span>
                      <span className="font-bold text-indigo-600">₹{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Estimated Delivery</span>
                      <span className="font-bold text-slate-700">Within 3-5 Business Days</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-0"
                  >
                    Continue Shopping
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/35 hover:scale-110 active:scale-95 transition-all z-40 cursor-pointer border-0 outline-none flex items-center justify-center animate-bounce"
          title="Scroll to Top"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
