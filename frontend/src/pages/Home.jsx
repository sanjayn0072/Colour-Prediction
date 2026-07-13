import { useState, useEffect, useRef } from 'react'
import { useUser } from '../context/UserContext'
import { 
  Bell, ChevronRight, Star, Zap, Crown, Flame, X, 
  ShoppingCart, Check, MapPin, Phone, User as UserIcon, AlertTriangle, HelpCircle,
  Wallet, Users, History
} from 'lucide-react'

// Import tech product images
import earbudsImg from '../assets/earbuds.png'
import earbudsAltImg from '../assets/earbuds_alt.png'
import smartwatchImg from '../assets/smartwatch.png'
import smartwatchAltImg from '../assets/smartwatch_alt.png'
import keyboardImg from '../assets/keyboard.png'
import keyboardAltImg from '../assets/keyboard_alt.png'
import mouseImg from '../assets/mouse.png'
import mouseAltImg from '../assets/mouse_alt.png'

/* ─── Mock Data ───────────────────────────────────────────── */
const BANNERS = [
  { id: 5, title: 'Signup & Get ₹150', subtitle: 'Earn instant ₹150 bonus. Recharge up to ₹500 for matching reward tiers!', gradient: 'from-amber-500 via-orange-600 to-yellow-500', action: 'deposit' },
  { id: 1, title: 'Lucky Spin Challenge', subtitle: 'Spin the lucky wheel and win cash prizes', gradient: 'from-indigo-600 via-purple-600 to-pink-500', action: 'spinWheel' },
  { id: 2, title: 'Refer & Earn', subtitle: 'Earn ₹100 for every friend you invite', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', action: 'refer' },
  { id: 3, title: 'Mega Prediction Tournament', subtitle: 'Play Colour and Dice games to win mega rewards', gradient: 'from-orange-500 via-red-500 to-rose-500', action: 'game' },
  { id: 4, title: 'VIP Rewards', subtitle: 'Unlock exclusive perks & bonuses', gradient: 'from-violet-600 via-fuchsia-500 to-pink-500', action: 'profile' },
]

const CATEGORIES = [
  { id: 1, label: 'Colour', icon: Flame, color: 'text-rose-500 bg-rose-50 border-rose-100', page: 'game' },
  { id: 2, label: 'Dice Pro', icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-100', page: 'diceGame' },
  { id: 3, label: 'Lucky Wheel', icon: Star, color: 'text-indigo-500 bg-indigo-50 border-indigo-100', page: 'spinWheel' },
  { id: 4, label: 'Game Lobby', icon: Crown, color: 'text-emerald-650 bg-emerald-50 border-emerald-100', page: 'gameLobby' },
  { id: 5, label: 'Wallet & Pay', icon: Wallet, color: 'text-purple-500 bg-purple-50 border-purple-100', page: 'wallet' },
  { id: 6, label: 'Invite & Earn', icon: Users, color: 'text-pink-500 bg-pink-50 border-pink-100', page: 'refer' },
  { id: 7, label: 'My Records', icon: History, color: 'text-slate-500 bg-slate-50 border-slate-100', page: 'transactionRecords' },
  { id: 8, label: 'Support Chat', icon: HelpCircle, color: 'text-sky-500 bg-sky-50 border-sky-100', page: 'support' },
]

const PRODUCTS = [
  { 
    id: 1, 
    title: 'AuraPods Pro', 
    price: 1499, 
    original: 2499, 
    badge: '40% OFF', 
    image: earbudsImg, 
    images: [earbudsImg, earbudsAltImg],
    rating: 4.8, 
    reviews: 124, 
    desc: 'Immersive sound with high-fidelity drivers, active noise cancellation up to 40dB, and 40 hours of combined battery life with the wireless charging case. IPX5 water resistant.',
    specs: ['Active Noise Cancelling (40dB)', '40 Hours Playback', 'IPX5 Waterproof', 'Bluetooth 5.3'] 
  },
  { 
    id: 2, 
    title: 'Chronos Watch S', 
    price: 2999, 
    original: 4999, 
    badge: '40% OFF', 
    image: smartwatchImg, 
    images: [smartwatchImg, smartwatchAltImg],
    rating: 4.7, 
    reviews: 89, 
    desc: 'Track your fitness goals, receive calls, and manage your health metrics on a stunning 1.43-inch AMOLED display. Features up to 14 days of battery life per charge.',
    specs: ['1.43" AMOLED Display', 'Blood Oxygen & Heart Rate', 'Bluetooth Calling', '14-Day Battery Life'] 
  },
  { 
    id: 3, 
    title: 'Apex Mechanical Keyboard', 
    price: 3499, 
    original: 5999, 
    badge: '41% OFF', 
    image: keyboardImg, 
    images: [keyboardImg, keyboardAltImg],
    rating: 4.9, 
    reviews: 45, 
    desc: 'Hot-swappable mechanical switches, double-shot PBT keycaps, and triple-mode connectivity (Bluetooth, 2.4G wireless, or USB-C wired). Ergonomic design with custom RGB.',
    specs: ['Hot-swappable Switches', 'Double-shot PBT Keycaps', 'Triple Mode (BT/2.4G/Wired)', '4000mAh Battery'] 
  },
  { 
    id: 4, 
    title: 'Viper Wireless Mouse', 
    price: 1899, 
    original: 2999, 
    badge: '36% OFF', 
    image: mouseImg, 
    images: [mouseImg, mouseAltImg],
    rating: 4.8, 
    reviews: 67, 
    desc: 'Lightweight 65g shell optimized for performance. Incorporates a high-precision 26K DPI optical sensor and zero-latency wireless connectivity. Up to 80 hours of battery life.',
    specs: ['26K DPI Optical Sensor', '65g Ultra-lightweight', '80-Hour Battery Life', 'Zero-latency Wireless'] 
  },
  { 
    id: 5, 
    title: 'AuraPods Lite', 
    price: 999, 
    original: 1999, 
    badge: '50% OFF', 
    image: earbudsAltImg, 
    images: [earbudsAltImg, earbudsImg],
    rating: 4.5, 
    reviews: 210, 
    desc: 'Comfortable fit, dynamic bass boost driver, clear calls with ENC mic, and 28 hours total battery life with fast charge.',
    specs: ['Environmental Noise Cancel', '28 Hours Total Playback', 'Comfort-fit Earhooks', 'Fast Charging'] 
  },
  { 
    id: 6, 
    title: 'Chronos Watch Active', 
    price: 1999, 
    original: 3499, 
    badge: '42% OFF', 
    image: smartwatchAltImg, 
    images: [smartwatchAltImg, smartwatchImg],
    rating: 4.6, 
    reviews: 142, 
    desc: 'Ultra-thin profile, 120+ sport modes, blood pressure monitor, sleep tracking, and up to 7 days battery with water protection.',
    specs: ['1.28" HD Screen', '120+ Sport Modes', 'Heart & BP Monitoring', '7-Day Active Battery'] 
  },
  { 
    id: 7, 
    title: 'Apex Lite Keyboard', 
    price: 1599, 
    original: 2499, 
    badge: '36% OFF', 
    image: keyboardAltImg, 
    images: [keyboardAltImg, keyboardImg],
    rating: 4.4, 
    reviews: 38, 
    desc: 'Quiet membrane switches, multi-zone RGB lighting control, dedicated media buttons, and spill-resistant keycaps.',
    specs: ['Quiet Keycaps', 'Multi-zone RGB', 'Spill-resistant Design', 'Media Controls'] 
  },
  { 
    id: 8, 
    title: 'Viper Office Mouse', 
    price: 699, 
    original: 1299, 
    badge: '46% OFF', 
    image: mouseAltImg, 
    images: [mouseAltImg, mouseImg],
    rating: 4.3, 
    reviews: 94, 
    desc: 'Ergonomic shape designed for all-day comfort. Quiet clicks, adjustable DPI sensitivity, and long-lasting single-AA battery life.',
    specs: ['Silent Click Technology', 'Adjustable 1600 DPI', 'Ergonomic Shape', '12-Month Battery'] 
  },
  { 
    id: 9, 
    title: 'AuraPods Air X', 
    price: 2199, 
    original: 3999, 
    badge: '45% OFF', 
    image: earbudsImg, 
    images: [earbudsImg, earbudsAltImg],
    rating: 4.9, 
    reviews: 153, 
    desc: 'Premium spatial audio with dynamic head tracking, dual-mic hybrid ANC, low latency mode for gaming, and premium matte finish case.',
    specs: ['Spatial Audio', 'Hybrid ANC (45dB)', 'Ultra Low Latency (40ms)', 'Qi Wireless Charging'] 
  },
  { 
    id: 10, 
    title: 'Chronos Watch Elite', 
    price: 4999, 
    original: 8999, 
    badge: '44% OFF', 
    image: smartwatchImg, 
    images: [smartwatchImg, smartwatchAltImg],
    rating: 4.9, 
    reviews: 32, 
    desc: 'Premium aerospace titanium bezel, built-in dual frequency GPS, altitude barometer, offline map rendering, and sapphire crystal glass.',
    specs: ['Titanium Bezel', 'Sapphire Glass', 'Dual Frequency GPS', 'Barometer & Compass'] 
  },
  { 
    id: 11, 
    title: 'Apex RGB Compact 60%', 
    price: 2799, 
    original: 4599, 
    badge: '39% OFF', 
    image: keyboardImg, 
    images: [keyboardImg, keyboardAltImg],
    rating: 4.7, 
    reviews: 51, 
    desc: 'Space-saving 60% layout, linear red silent switches, premium aluminum framing, customizable per-key RGB lighting profiles.',
    specs: ['60% Compact Size', 'Red Linear Switches', 'Aluminum Frame', 'Customizable RGB'] 
  },
  { 
    id: 12, 
    title: 'Viper Precision Gaming Mouse', 
    price: 2499, 
    original: 3999, 
    badge: '37% OFF', 
    image: mouseImg, 
    images: [mouseImg, mouseAltImg],
    rating: 4.8, 
    reviews: 74, 
    desc: 'Equipped with a high-end 30K DPI optical focus sensor, optical mouse switches rated for 90 million clicks, and customized drag feet.',
    specs: ['30K DPI Optical Focus', '90M Clicks Life', 'PTFE Mouse Feet', '8 Programmable Keys'] 
  },
  { 
    id: 13, 
    title: 'AuraPods Sport Hook', 
    price: 1799, 
    original: 2999, 
    badge: '40% OFF', 
    image: earbudsAltImg, 
    images: [earbudsAltImg, earbudsImg],
    rating: 4.6, 
    reviews: 82, 
    desc: 'Over-ear flexible earhooks, IPX7 sweatproof resistance, bass-heavy acoustic tuning, and quick click control buttons.',
    specs: ['IPX7 Sweatproof', 'Flexible Earhooks', 'Deep Bass Tuning', 'On-ear Controls'] 
  },
  { 
    id: 14, 
    title: 'Chronos Sport Band Pro', 
    price: 1299, 
    original: 2499, 
    badge: '48% OFF', 
    image: smartwatchAltImg, 
    images: [smartwatchAltImg, smartwatchImg],
    rating: 4.5, 
    reviews: 115, 
    desc: 'Lightweight smart fitness band, curved AMOLED screen, female cycle tracking, breathing helper, and automatic sleep analyzer.',
    specs: ['Curved AMOLED Display', 'Auto Sleep Analysis', 'Cycle & Stress Monitor', '20-Day standby Battery'] 
  },
  { 
    id: 15, 
    title: 'Apex Silent Pro Keyboard', 
    price: 3999, 
    original: 6999, 
    badge: '42% OFF', 
    image: keyboardAltImg, 
    images: [keyboardAltImg, keyboardImg],
    rating: 4.8, 
    reviews: 28, 
    desc: 'Pre-lubed silent tactile switches, double-layer sound dampening foam, premium layout with volume media scroll wheel.',
    specs: ['Pre-lubed Silent Tactile', 'Dual Layer Foam Dampening', 'Volume Scroll Wheel', 'Vibrant Backlight'] 
  },
  { 
    id: 16, 
    title: 'Viper Wireless Dock Combo', 
    price: 3199, 
    original: 4999, 
    badge: '36% OFF', 
    image: mouseImg, 
    images: [mouseImg, mouseAltImg],
    rating: 4.7, 
    reviews: 43, 
    desc: 'Zero-latency gaming mouse paired with a custom RGB charging magnetic dock. Dock features additional pass-through USB port.',
    specs: ['Magnetic Charging Dock', 'Zero Latency wireless', 'RGB Underglow Status', 'DPI Quick Toggle'] 
  },
  { 
    id: 17, 
    title: 'AuraPods Studio Buds', 
    price: 2599, 
    original: 4499, 
    badge: '42% OFF', 
    image: earbudsImg, 
    images: [earbudsImg, earbudsAltImg],
    rating: 4.8, 
    reviews: 62, 
    desc: 'Studio acoustic tuning, customized equalizer presets via app, dynamic transparency audio mode, and voice control integrations.',
    specs: ['Studio Tuning', 'App Equalizer Controls', 'Transparency Mode', 'Voice Assistant Integration'] 
  },
  { 
    id: 18, 
    title: 'Chronos Titanium Pro S', 
    price: 5499, 
    original: 9999, 
    badge: '45% OFF', 
    image: smartwatchImg, 
    images: [smartwatchImg, smartwatchAltImg],
    rating: 4.9, 
    reviews: 19, 
    desc: 'Aerospace grade titanium strap and frame, scratch resistant sapphire dial, wireless fast charging stand included.',
    specs: ['Titanium Metal Strap', 'Fast Wireless Charge', 'Sapphire Glass Dial', 'ECG Monitoring'] 
  },
  { 
    id: 19, 
    title: 'Apex Keyboard Deskpad Combo', 
    price: 4299, 
    original: 7499, 
    badge: '42% OFF', 
    image: keyboardImg, 
    images: [keyboardImg, keyboardAltImg],
    rating: 4.9, 
    reviews: 21, 
    desc: 'Hot-swappable keyboard bundled with a premium 900x400mm anti-fray stitched gaming deskpad. Spill-proof and easy to clean.',
    specs: ['Anti-fray Gaming Deskpad', 'Pre-lubed Red Switches', 'Coiled Cable Included', 'PBT Keycaps'] 
  },
  { 
    id: 20, 
    title: 'Viper Ergonomic Office Mouse', 
    price: 1199, 
    original: 1999, 
    badge: '40% OFF', 
    image: mouseAltImg, 
    images: [mouseAltImg, mouseImg],
    rating: 4.6, 
    reviews: 54, 
    desc: 'Vertical 57-degree hand grip design reduces wrist fatigue. Multi-device Bluetooth connection and quick flow scroll wheel.',
    specs: ['57-Degree Vertical Angle', 'Multi-device Bluetooth', 'Quiet Click Swiping', '6-Button Customizing'] 
  }
]

/* ─── Home Page ───────────────────────────────────────────── */
export default function Home({ onNavigate, unreadNotificationsCount }) {
  const { user, balance, setRealBalance, fetchUserHistory, setOrders, banners: contextBanners, products: contextProducts } = useUser()
  const activeBanners = contextBanners || BANNERS
  const activeProducts = contextProducts || PRODUCTS
  const [bannerIdx, setBannerIdx] = useState(0)
  const scrollRef = useRef(null)
  
  // Modals & Triggers
  const [toast, setToast] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)
  const [showReferral, setShowReferral] = useState(false)

  // Gallery State
  const [activeImgIdx, setActiveImgIdx] = useState(0)

  // Address & Checkout flow states (Extended details)
  const [deliveryName, setDeliveryName] = useState(() => localStorage.getItem('cp_delivery_name') || '')
  const [deliveryMobile, setDeliveryMobile] = useState(() => localStorage.getItem('cp_delivery_mobile') || '')
  const [deliveryPin, setDeliveryPin] = useState(() => localStorage.getItem('cp_delivery_pin') || '')
  const [deliveryLandmark, setDeliveryLandmark] = useState(() => localStorage.getItem('cp_delivery_landmark') || '')
  const [deliveryCity, setDeliveryCity] = useState(() => localStorage.getItem('cp_delivery_city') || '')
  const [deliveryState, setDeliveryState] = useState(() => localStorage.getItem('cp_delivery_state') || '')
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('cp_delivery_address') || '')
  const [deliveryType, setDeliveryType] = useState(() => localStorage.getItem('cp_delivery_type') || 'Home')
  
  const [checkoutStep, setCheckoutStep] = useState('detail') // 'detail' | 'address' | 'success'
  const [showOrderSuccessAlert, setShowOrderSuccessAlert] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [isOrdering, setIsOrdering] = useState(false)

  /* Auto-scroll banner */
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % activeBanners.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [activeBanners])

  useEffect(() => {
    if (scrollRef.current) {
      const card = scrollRef.current.children[bannerIdx]
      if (card) {
        const container = scrollRef.current
        const cardOffset = card.offsetLeft
        const containerWidth = container.clientWidth
        const cardWidth = card.clientWidth
        container.scrollTo({
          left: cardOffset - (containerWidth / 2) + (cardWidth / 2),
          behavior: 'smooth'
        })
      }
    }
  }, [bannerIdx])

  /* Toast auto-dismiss */
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const handleBannerClaim = (action) => {
    if (action === 'deposit') onNavigate?.('wallet')
    else if (action === 'refer') onNavigate?.('profile', { subPage: 'refer' })
    else if (action === 'game') onNavigate?.('game')
    else if (action === 'profile') onNavigate?.('profile', { subPage: 'vip' })
    else if (action === 'spinWheel') onNavigate?.('spinWheel')
  }

  const handleOpenProduct = (product) => {
    setSelectedProduct(product)
    setActiveImgIdx(0)
    setCheckoutStep('detail')
  }

  const handleBuyProduct = async (product) => {
    if (balance < product.price) {
      setToast('❌ Insufficient balance to purchase this product.')
      return
    }

    setIsOrdering(true)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`

    try {
      const response = await fetch(`${API_BASE}/api/products/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        throw new Error(data.error || 'Failed to place order');
      }

      setRealBalance(data.walletBalance)
      setOrderId(data.orderId)
      setDeliveryDate(data.order.deliveryDate)

      // Add to global orders array
      setOrders((prev) => [data.order, ...prev])
      setCheckoutStep('success')
      setShowOrderSuccessAlert(true)
      setToast(`🎉 Order placed for ${product.title}!`)
      await fetchUserHistory() // Sync stats
    } catch (err) {
      console.error(err)
      setToast(`❌ ${err.message || 'An error occurred.'}`)
    } finally {
      setIsOrdering(false)
    }
  }

  const handleCopyReferral = () => {
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 2000)
  }

  const visibleProducts = showAllProducts ? activeProducts : activeProducts.slice(0, 4)

  const isFormValid = () => {
    return (
      deliveryName.trim().length > 1 &&
      deliveryMobile.length === 10 &&
      deliveryPin.length === 6 &&
      deliveryCity.trim().length > 1 &&
      deliveryState.trim().length > 1 &&
      deliveryAddress.trim().length > 5
    )
  }

  return (
    <div className="flex flex-col relative bg-slate-50/50 min-h-screen">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] bg-emerald-600 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[slideDown_0.3s_ease-out]">
          <Check size={16} />
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* ── Referral Modal ── */}
      {showReferral && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setShowReferral(false)}>
          <div className="max-w-md w-full bg-white rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Refer & Earn ₹100</h2>
              <button onClick={() => setShowReferral(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"><X size={16} className="text-slate-500" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Share your referral code with friends. When they sign up and make their first deposit, you both earn ₹100!</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div><p className="text-[11px] text-slate-500 font-medium">Your Referral Code</p><p className="text-lg font-bold font-mono text-primary mt-0.5">CPLAY2025</p></div>
              <button onClick={handleCopyReferral} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">{referralCopied ? '✓ Copied!' : 'Copy'}</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <button className="py-3 bg-green-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-green-600">WhatsApp</button>
              <button className="py-3 bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-blue-600">Telegram</button>
              <button className="py-3 bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-800">Share</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Detail & Checkout Modal ── */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setSelectedProduct(null)}>
          <div className="max-w-md w-full bg-white rounded-t-[2rem] overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header/Banner & Image Gallery */}
            {checkoutStep !== 'success' && (
              <div className="relative bg-slate-50 flex flex-col items-center justify-center border-b border-slate-100 shrink-0 p-4 pt-10">
                <div className="h-40 flex items-center justify-center">
                  <img 
                    src={selectedProduct.images[activeImgIdx]} 
                    alt={selectedProduct.title} 
                    className="h-36 w-36 object-contain drop-shadow-md transition-all duration-300" 
                  />
                </div>
                
                {/* Thumbnails Gallery */}
                <div className="flex gap-2.5 justify-center mt-2 shrink-0">
                  {selectedProduct.images.map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveImgIdx(i)}
                      className={`w-11 h-11 rounded-lg border-2 p-0.5 bg-white overflow-hidden shadow-sm transition-all cursor-pointer ${
                        activeImgIdx === i ? 'border-primary scale-105 shadow-md shadow-primary/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>

                {selectedProduct.badge && (
                  <span className="absolute top-4 right-4 bg-red-500 text-[10px] font-bold text-white px-2.5 py-1 rounded-lg shadow-sm animate-pulse">
                    {selectedProduct.badge}
                  </span>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/95 border border-slate-200/80 flex items-center justify-center cursor-pointer shadow-sm hover:bg-slate-50 transition-colors"
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
                            <Star key={i} size={12} fill="currentColor" stroke="none" />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 ml-1">{selectedProduct.rating}</span>
                        <span className="text-[10px] text-slate-400">({selectedProduct.reviews} reviews)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-primary">₹{selectedProduct.price.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 line-through">₹{selectedProduct.original.toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedProduct.desc}</p>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Key Specifications</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.specs.map((spec, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg">
                          <Check size={12} className="text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-semibold text-slate-600 leading-tight">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => setCheckoutStep('address')} 
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer flex items-center justify-center gap-2"
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
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Back
                    </button>
                  </div>

                  {/* Detailed E-Commerce Address Form */}
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
                      <div className="relative">
                        <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={deliveryName}
                          onChange={(e) => {
                            setDeliveryName(e.target.value)
                            localStorage.setItem('cp_delivery_name', e.target.value)
                          }}
                          placeholder="John Doe" 
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Mobile & PIN Code */}
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
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                              setDeliveryMobile(val)
                              localStorage.setItem('cp_delivery_mobile', val)
                            }}
                            placeholder="10-digit number" 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                              setDeliveryPin(val)
                              localStorage.setItem('cp_delivery_pin', val)
                            }}
                            placeholder="6-digit PIN" 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* City & State */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">City</label>
                        <input 
                          type="text" 
                          value={deliveryCity}
                          onChange={(e) => {
                            setDeliveryCity(e.target.value)
                            localStorage.setItem('cp_delivery_city', e.target.value)
                          }}
                          placeholder="e.g. Mumbai" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">State</label>
                        <input 
                          type="text" 
                          value={deliveryState}
                          onChange={(e) => {
                            setDeliveryState(e.target.value)
                            localStorage.setItem('cp_delivery_state', e.target.value)
                          }}
                          placeholder="e.g. Maharashtra" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Landmark */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Landmark (Optional)</label>
                      <input 
                        type="text" 
                        value={deliveryLandmark}
                        onChange={(e) => {
                          setDeliveryLandmark(e.target.value)
                          localStorage.setItem('cp_delivery_landmark', e.target.value)
                        }}
                        placeholder="e.g. Near Star Mall" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>

                    {/* Flat / Area / Street */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Flat / House No. / Building / Street Address</label>
                      <textarea 
                        value={deliveryAddress}
                        onChange={(e) => {
                          setDeliveryAddress(e.target.value)
                          localStorage.setItem('cp_delivery_address', e.target.value)
                        }}
                        rows="2"
                        placeholder="102, Building A, Main Road" 
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      />
                    </div>

                    {/* Address Type (Home/Office/Other) */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Address Type</label>
                      <div className="flex gap-2">
                        {['Home', 'Office', 'Other'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setDeliveryType(type)
                              localStorage.setItem('cp_delivery_type', type)
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              deliveryType === type
                                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
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
                      <span className="text-primary">₹{selectedProduct.price.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-[11px] text-slate-500">
                      <span>Your Wallet Balance</span>
                      <span className={`font-bold ${balance >= selectedProduct.price ? 'text-slate-700' : 'text-red-500'}`}>₹{balance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Pay button */}
                  {balance >= selectedProduct.price ? (
                    <button 
                      onClick={() => handleBuyProduct(selectedProduct)}
                      disabled={isOrdering || !isFormValid()}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-100 transition-all cursor-pointer flex items-center justify-center gap-2"
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
                      <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3 text-[11px] leading-relaxed flex items-start gap-1.5">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Insufficient wallet balance. Please deposit money to buy this product.</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProduct(null)
                          onNavigate?.('wallet')
                        }}
                        className="w-full py-3.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer flex items-center justify-center gap-2"
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
                    <h2 className="text-base font-bold text-slate-800">Order Placed Successfully!</h2>
                    <p className="text-xs text-slate-500 mt-1">Thank you for your purchase. Your item is being packed.</p>
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2.5 text-left">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Order ID</span>
                      <span className="font-mono font-bold text-slate-700">{orderId}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Item</span>
                      <span className="font-semibold text-slate-700">{selectedProduct.title}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Amount Paid</span>
                      <span className="font-bold text-slate-800">₹{selectedProduct.price.toLocaleString()} (Wallet)</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-200/80 pt-2.5">
                      <span className="text-slate-400">Expected Delivery</span>
                      <span className="font-semibold text-emerald-600">{deliveryDate}</span>
                    </div>
                  </div>

                  <div className="w-full pt-2">
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <button onClick={() => onNavigate?.('profile')} className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-indigo-200 shadow-md shadow-indigo-200/50 cursor-pointer hover:scale-105 transition-transform bg-slate-100 flex items-center justify-center">
          <img 
            src={user?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix'} 
            className="w-full h-full object-cover" 
            alt="Profile" 
          />
        </button>
        <h1 className="text-base font-bold tracking-wide"><span className="text-primary">Colour</span><span className="text-foreground ml-1">Play</span></h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onNavigate?.('support')} 
            title="Help & Support"
            className="p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-0 outline-none bg-transparent"
          >
            <HelpCircle size={20} className="text-muted-foreground" />
          </button>
          <button 
            onClick={() => onNavigate?.('notifications')} 
            className="relative p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer border-0 outline-none bg-transparent"
          >
            <Bell size={20} className="text-muted-foreground" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* ── Banner Carousel ── */}
      <section className="px-4 pt-4">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {activeBanners.map((banner, idx) => (
            <div key={banner.id} className={`snap-center shrink-0 w-[85%] rounded-2xl p-5 bg-gradient-to-br ${banner.gradient} relative overflow-hidden transition-all duration-500 shadow-lg ${idx === bannerIdx ? 'scale-100 opacity-100' : 'scale-95 opacity-60'}`}>
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/15" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/15" />
              <p className="text-xs font-medium text-white/80 uppercase tracking-widest mb-1">Limited Offer</p>
              <h2 className="text-lg font-bold text-white leading-tight">{banner.title}</h2>
              <p className="text-sm text-white/85 mt-1">{banner.subtitle}</p>
              <button onClick={() => handleBannerClaim(banner.action)} className="mt-3 px-4 py-1.5 bg-white/25 backdrop-blur rounded-full text-xs font-semibold text-white hover:bg-white/35 transition-colors cursor-pointer flex items-center gap-1">
                Claim Now <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {activeBanners.map((_, idx) => (
            <button key={idx} onClick={() => setBannerIdx(idx)} className={`rounded-full transition-all duration-300 cursor-pointer ${idx === bannerIdx ? 'w-6 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-slate-300'}`} />
          ))}
        </div>
      </section>

      {/* ── Circle Categories ── */}
      <section className="px-4 pt-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Categories</h3>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button 
                key={cat.id} 
                onClick={() => {
                  if (cat.disabled) {
                    setToast('Coming Soon!')
                  } else if (cat.page === 'gameLobby') {
                    onNavigate?.('game', { openLobby: true })
                  } else if (cat.page === 'refer') {
                    onNavigate?.('profile', { subPage: 'refer' })
                  } else if (cat.page === 'vip') {
                    onNavigate?.('profile', { subPage: 'vip' })
                  } else {
                    onNavigate?.(cat.page)
                  }
                }} 
                className="flex flex-col items-center gap-1.5 shrink-0 group relative cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-full ${cat.color} flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-110 ring-1 ring-slate-200 relative overflow-hidden`}>
                  <Icon size={22} />
                </div>
                <span className="text-[11px] font-medium transition-colors text-muted-foreground group-hover:text-foreground">
                  {cat.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Product Grid ── */}
      <section className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tech Products</h3>
          <button onClick={() => setShowAllProducts(!showAllProducts)} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline cursor-pointer">
            {showAllProducts ? 'Show Less' : 'View All'} <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {visibleProducts.map((product) => (
            <div key={product.id} onClick={() => handleOpenProduct(product)} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-primary/30 transition-all duration-200 group shadow-sm hover:shadow-md cursor-pointer flex flex-col">
              <div className="h-32 bg-slate-50 flex items-center justify-center relative p-4 border-b border-slate-100">
                <img src={product.image} alt={product.title} className="h-24 w-24 object-contain group-hover:scale-105 transition-transform duration-300" />
                {product.badge && <span className="absolute top-2 right-2 bg-destructive text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-sm">{product.badge}</span>}
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-card-foreground truncate group-hover:text-foreground transition-colors">{product.title}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-amber-500 font-bold">★ {product.rating}</span>
                    <span className="text-[9px] text-muted-foreground">({product.reviews})</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-primary">₹{product.price.toLocaleString()}</span>
                  {product.original && <span className="text-[10px] text-muted-foreground line-through">₹{product.original.toLocaleString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Order Success Custom Alert Popup */}
      {showOrderSuccessAlert && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white border border-slate-150 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 animate-[scaleIn_0.2s_ease-out]">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Check size={32} strokeWidth={3} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-800">Order Placed!</h3>
              <p className="text-xs text-slate-500">Your order has been placed successfully and is being processed.</p>
            </div>
            <button
              onClick={() => setShowOrderSuccessAlert(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer border-0 outline-none active:scale-95"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
