/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { getVipLevel, VIP_TIERS } from '../utils/vipTiers'
import earbudsImg from '../assets/earbuds.webp'
import earbudsAltImg from '../assets/earbuds_alt.webp'
import smartwatchImg from '../assets/smartwatch.webp'
import smartwatchAltImg from '../assets/smartwatch_alt.webp'
import keyboardImg from '../assets/keyboard.webp'
import keyboardAltImg from '../assets/keyboard_alt.webp'
import mouseImg from '../assets/mouse.webp'
import mouseAltImg from '../assets/mouse_alt.webp'

const UserContext = createContext(null)

const INITIAL_BANNERS = [
  { id: 5, title: 'Signup & Get ₹150', subtitle: 'Earn instant ₹150 bonus. Recharge up to ₹500 for matching reward tiers!', gradient: 'from-amber-500 via-orange-600 to-yellow-500', action: 'deposit' },
  { id: 1, title: 'Lucky Spin Challenge', subtitle: 'Spin the lucky wheel and win cash prizes', gradient: 'from-indigo-600 via-purple-600 to-pink-500', action: 'spinWheel' },
  { id: 2, title: 'Refer & Earn', subtitle: 'Earn ₹100 for every friend you invite', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', action: 'refer' },
  { id: 3, title: 'Mega Prediction Tournament', subtitle: 'Play Colour and Dice games to win mega rewards', gradient: 'from-orange-500 via-red-500 to-rose-500', action: 'game' },
  { id: 4, title: 'VIP Rewards', subtitle: 'Unlock exclusive perks & bonuses', gradient: 'from-violet-600 via-fuchsia-500 to-pink-500', action: 'profile' },
]

const INITIAL_PRODUCTS = [
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
    desc: 'Designed for sports and active training. Features ergonomic earhooks, sweatproof construction, dynamic sound tuning, and up to 36 hours play.',
    specs: ['Ergonomic Earhooks', 'Sweatproof IPX7', '36 Hours Battery Life', 'High-performance Driver'] 
  },
  { 
    id: 14, 
    title: 'Chronos Watch Active Lite', 
    price: 1499, 
    original: 2499, 
    badge: '40% OFF', 
    image: smartwatchAltImg, 
    images: [smartwatchAltImg, smartwatchImg],
    rating: 4.5, 
    reviews: 118, 
    desc: 'Sleek design with standard health trackers, sedentary reminders, call alerts, notification sync, and a responsive touch panel.',
    specs: ['Sleek Light Body', 'Call & Notification Sync', '7 Health Parameters Tracked', '5-Day Standby Power'] 
  },
  { 
    id: 15, 
    title: 'Apex Mechanical Desk Bundle', 
    price: 4599, 
    original: 7999, 
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

const INITIAL_VOUCHERS = []

const INITIAL_DEPOSITS = []

const INITIAL_WITHDRAWALS = []

const INITIAL_BETS = []

const imageMap = {
  'earbuds': earbudsImg,
  'earbudsAlt': earbudsAltImg,
  'smartwatch': smartwatchImg,
  'smartwatchAlt': smartwatchAltImg,
  'keyboard': keyboardImg,
  'keyboardAlt': keyboardAltImg,
  'mouse': mouseImg,
  'mouseAlt': mouseAltImg,
  '/src/assets/earbuds.png': earbudsImg,
  '/src/assets/earbuds.webp': earbudsImg,
  '/src/assets/earbuds_alt.png': earbudsAltImg,
  '/src/assets/earbuds_alt.webp': earbudsAltImg,
  '/src/assets/smartwatch.png': smartwatchImg,
  '/src/assets/smartwatch.webp': smartwatchImg,
  '/src/assets/smartwatch_alt.png': smartwatchAltImg,
  '/src/assets/smartwatch_alt.webp': smartwatchAltImg,
  '/src/assets/keyboard.png': keyboardImg,
  '/src/assets/keyboard.webp': keyboardImg,
  '/src/assets/keyboard_alt.png': keyboardAltImg,
  '/src/assets/keyboard_alt.webp': keyboardAltImg,
  '/src/assets/mouse.png': mouseImg,
  '/src/assets/mouse.webp': mouseImg,
  '/src/assets/mouse_alt.png': mouseAltImg,
  '/src/assets/mouse_alt.webp': mouseAltImg,
  '/src/assets/aurapods.png': earbudsImg,
  '/src/assets/aurapods.webp': earbudsImg,
  '/src/assets/chronos.png': smartwatchImg,
  '/src/assets/chronos.webp': smartwatchImg,
  '/src/assets/apex.png': keyboardImg,
  '/src/assets/apex.webp': keyboardImg,
  '/src/assets/viper.png': mouseImg,
  '/src/assets/viper.webp': mouseImg,
};

export const resolveImg = (imgStr) => {
  if (!imgStr) return earbudsImg;
  if (imageMap[imgStr]) return imageMap[imgStr];
  if (imgStr.startsWith('/uploads/')) {
    const base = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    return `${base}${imgStr}`;
  }
  return imgStr;
};

const mapProduct = (p) => {
  return {
    ...p,
    id: p._id || p.id,
    price: Math.round(parseFloat(p.price) || 0),
    original: p.original ? Math.round(parseFloat(p.original)) : p.original,
    image: resolveImg(p.image),
    images: p.images ? p.images.map(resolveImg) : [resolveImg(p.image)]
  };
};

const mapBanner = (b) => ({
  ...b,
  id: b._id || b.id
});

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [vouchers, setVouchers] = useState(INITIAL_VOUCHERS)
  
  const [banners, setBanners] = useState(INITIAL_BANNERS)
  const [products, setProducts] = useState(INITIAL_PRODUCTS)

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [bannersRes, productsRes] = await Promise.all([
          fetch(`${API_BASE}/api/banners`),
          fetch(`${API_BASE}/api/products`)
        ]);
        if (bannersRes.ok) {
          const bannersData = await bannersRes.json();
          if (bannersData && bannersData.length > 0) {
            setBanners(bannersData.map(mapBanner));
          }
        }
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          if (productsData && productsData.length > 0) {
            setProducts(productsData.map(mapProduct));
          }
        }
      } catch (err) {
        console.error('Failed to load catalog from backend:', err);
      }
    };
    fetchCatalog();
  }, []);

  const addBanner = async (b) => {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/banners`, {
        method: 'POST',
        headers,
        body: JSON.stringify(b)
      })
      if (res.ok) {
        const newBanner = await res.json()
        setBanners(prev => [...prev, mapBanner(newBanner)])
      }
    } catch (err) {
      console.error('Failed to add banner:', err)
    }
  }

  const updateBanner = async (id, updatedFields) => {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/banners/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedFields)
      })
      if (res.ok) {
        const updatedBanner = await res.json()
        setBanners(prev => prev.map(b => b.id === id ? mapBanner(updatedBanner) : b))
      }
    } catch (err) {
      console.error('Failed to update banner:', err)
    }
  }

  const deleteBanner = async (id) => {
    const token = localStorage.getItem('token')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/banners/${id}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        setBanners(prev => prev.filter(b => b.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete banner:', err)
    }
  }

  const addProduct = async (p) => {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const imagesList = ['/src/assets/earbuds.webp', '/src/assets/smartwatch.webp', '/src/assets/keyboard.webp', '/src/assets/mouse.webp']
      const randomImg = imagesList[Math.floor(Math.random() * imagesList.length)]
      const productPayload = {
        ...p,
        image: randomImg,
        images: [randomImg],
        rating: 5.0,
        reviews: 0,
        specs: p.specs || ['Premium tech quality', 'Manufacturer Warranty']
      }
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productPayload)
      })
      if (res.ok) {
        const newProduct = await res.json()
        setProducts(prev => [mapProduct(newProduct), ...prev])
      }
    } catch (err) {
      console.error('Failed to add product:', err)
    }
  }

  const updateProduct = async (id, updatedFields) => {
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedFields)
      })
      if (res.ok) {
        const updatedProduct = await res.json()
        setProducts(prev => prev.map(p => p.id === id ? mapProduct(updatedProduct) : p))
      }
    } catch (err) {
      console.error('Failed to update product:', err)
    }
  }

  const deleteProduct = async (id) => {
    const token = localStorage.getItem('token')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers
      })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }
  
  const [realBalance, setRealBalance] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [lockedBalance, setLockedBalance] = useState(0)
  const [bonusBalance, setBonusBalance] = useState(0)
  const [betsList, setBetsList] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])

  const safeDate = (val) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const safeTimestamp = (val) => {
    if (!val) return Date.now();
    const d = new Date(val);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  };

  const fetchUserHistory = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const headers = {
      'Authorization': `Bearer ${token}`
    }
    try {
      const [profileRes, txRes, betsRes, withdrawRes, depositRes, couponRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/profile`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/api/wallet/transactions`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/api/games/my-bets`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/api/withdraw/history`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/api/payment/history`, { headers, credentials: 'include' }),
        fetch(`${API_BASE}/api/wallet/my-coupons`, { headers, credentials: 'include' }).catch(err => {
          console.warn('[Coupons Fetch Network Error]:', err);
          return { ok: false, json: async () => [] };
        })
      ])

      // Intercept 429 rate limit responses gracefully
      if (profileRes.status === 429 || txRes.status === 429 || betsRes.status === 429 || withdrawRes.status === 429 || depositRes.status === 429 || couponRes.status === 429) {
        console.warn('[Rate Limit Warning]: Too many requests. Silently suppressing fetch to prevent rendering loops.');
        return;
      }

      // If the token is expired or invalid, silently log out and stop — do NOT flood console with 401s
      if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.removeItem('token')
        setUser(null)
        setRealBalance(0)
        setAvailableBalance(0)
        setLockedBalance(0)
        setBonusBalance(0)
        setSavedBanks([])
        setSavedUpis([])
        return
      }
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.user) {
          setUser(prev => ({
            ...prev,
            ...profileData.user,
            uid: profileData.user.id || profileData.user.uid || (prev ? prev.uid : String(Math.floor(100000 + Math.random() * 900000))),
            role: profileData.user.role || 'user'
          }))
          if (profileData.user.walletBalance !== undefined) {
            setRealBalance(profileData.user.walletBalance)
          }
          if (profileData.user.availableBalance !== undefined) {
            setAvailableBalance(profileData.user.availableBalance)
          }
          if (profileData.user.lockedBalance !== undefined) {
            setLockedBalance(profileData.user.lockedBalance)
          }
          if (profileData.user.bonusBalance !== undefined) {
            setBonusBalance(profileData.user.bonusBalance)
          }
          if (profileData.user.requiredWager !== undefined) {
            setRequiredWager(profileData.user.requiredWager)
          }
          if (profileData.user.requiredBonusWager !== undefined) {
            setRequiredBonusWager(profileData.user.requiredBonusWager)
          }
          if (profileData.user.claimedVipRewards !== undefined) {
            setClaimedVipRewards(profileData.user.claimedVipRewards)
          }

          // Map database payment details to React state
          if (profileData.user.bankDetails) {
            setSavedBanks([{
              accountNumber: profileData.user.bankDetails.accountNumber,
              ifsc: profileData.user.bankDetails.ifscCode,
              holderName: profileData.user.bankDetails.holderName,
              bankName: profileData.user.bankDetails.bankName
            }])
          } else {
            setSavedBanks([])
          }

          if (profileData.user.upiDetails) {
            setSavedUpis([{
              upiId: profileData.user.upiDetails.upiId,
              holderName: profileData.user.name
            }])
          } else {
            setSavedUpis([])
          }
        }
      }
      
      let adjustments = []
      let refunds = []
      if (txRes.ok) {
        const txData = await txRes.json()
        setWalletTransactions(txData || [])
        adjustments = (txData || []).filter(t => t.referenceTable === 'wallets' || (t.description && t.description.startsWith('Admin adjustment:')))
        refunds = (txData || []).filter(t => t.type === 'Refund' || t.type === 'Order_Rejection')
      }

      if (depositRes.ok) {
        const depositData = await depositRes.json()
        
        // Map deposits
        const deposits = depositData.map(d => ({
          id: d.transactionId || `DEP-${d.id}`,
          dbId: d.id,
          amount: parseFloat(d.amount),
          bonus: 0,
          status: d.status,
          appealStatus: d.appealStatus || null,
          appealAdminNote: d.appealAdminNote || null,
          date: safeDate(d.createdAt),
          method: 'UPI',
          voucher: d.coupon_code || null,
          timestamp: safeTimestamp(d.createdAt)
        }))

        // Append positive manual adjustments as deposits
        adjustments.forEach(t => {
          const amt = parseFloat(t.amount)
          if (amt >= 0) {
            const adminNotes = t.description ? t.description.replace('Admin adjustment: ', '') : 'Game Rebate Reward';
            deposits.push({
              id: `ADJ-${t.id}`,
              dbId: t.id,
              amount: amt,
              bonus: 0,
              status: 'Completed',
              appealStatus: null,
              appealAdminNote: null,
              date: safeDate(t.createdAt),
              method: 'Adjustment',
              voucher: null,
              isAdjustment: true,
              adminNotes: adminNotes,
              timestamp: safeTimestamp(t.createdAt)
            })
          }
        })

        // Append refunds as deposits with Refund method
        refunds.forEach(t => {
          const amt = parseFloat(t.amount)
          deposits.push({
            id: `RFD-${t.id}`,
            dbId: t.id,
            amount: amt,
            bonus: 0,
            status: 'Completed',
            appealStatus: null,
            appealAdminNote: null,
            date: safeDate(t.createdAt),
            method: 'Refund',
            voucher: null,
            isAdjustment: true,
            adminNotes: t.description || 'Order Refund',
            timestamp: safeTimestamp(t.createdAt)
          })
        })

        deposits.sort((a, b) => b.timestamp - a.timestamp)
        setDepositRecords(deposits)
      }

      if (withdrawRes.ok) {
        const wData = await withdrawRes.json()
        const withdrawals = wData.map(w => {
          let fee = 0;
          const amt = parseFloat(w.amount);
          if (amt === 100) fee = 9;
          else if (amt > 100 && amt <= 1000) fee = 9 + (amt - 100) * 0.03;
          else if (amt > 1000) fee = amt * 0.03;
          fee = parseFloat(fee.toFixed(2));
          const netAmount = parseFloat((amt - fee).toFixed(2));

          return {
            id: w.withdrawalId || `WDR-${w.id}`,
            dbId: w.id,
            amount: amt,
            fee,
            netAmount,
            status: w.status, // PENDING, APPROVED, REJECTED, PAID
            date: safeDate(w.createdAt),
            method: w.paymentMethod, // UPI or BANK
            upiId: w.upiId,
            accountHolderName: w.accountHolderName,
            accountNumber: w.accountNumber,
            ifscCode: w.ifscCode,
            utrNumber: w.utrNumber,
            adminNote: w.adminNote,
            paidAt: w.paidAt,
            timestamp: safeTimestamp(w.createdAt)
          }
        })
        // Append negative manual adjustments as withdrawals
        adjustments.forEach(t => {
          const amt = parseFloat(t.amount)
          if (amt < 0) {
            const adminNotes = t.description ? t.description.replace('Admin adjustment: ', '') : 'Wallet Adjustment';
            const absoluteAmt = Math.abs(amt)
            withdrawals.push({
              id: `ADJ-${t.id}`,
              dbId: t.id,
              amount: absoluteAmt,
              fee: 0,
              netAmount: absoluteAmt,
              status: 'PAID', // mark as completed / PAID
              date: safeDate(t.createdAt),
              method: 'Adjustment',
              upiId: '',
              accountHolderName: '',
              accountNumber: '',
              ifscCode: '',
              utrNumber: '',
              adminNote: adminNotes,
              paidAt: t.createdAt,
              isAdjustment: true,
              timestamp: safeTimestamp(t.createdAt)
            })
          }
        })

        withdrawals.sort((a, b) => b.timestamp - a.timestamp)
        setWithdrawRecords(withdrawals)
      }

      if (betsRes.ok) {
        const betsData = await betsRes.json()
        setBetsList(betsData)

        // Map backend bets to frontend betRecords (wagers and payouts)
        const mappedBetRecords = []
        
        betsData.forEach(b => {
          const isColour = b.gameType === 'colour'
          const gameName = isColour
            ? `Colour Prediction ${b.session || '1m'}`
            : `Dice Pro`
          
          const formattedDate = safeDate(b.createdAt)

          // Wager record (negative amount)
          mappedBetRecords.push({
            id: b.id ? `BET-${b.id}` : (b._id ? `BET-${b._id}` : `BET-${Math.floor(10000 + Math.random() * 90000)}`),
            title: `Bet placed on ${gameName}`,
            amount: -b.betAmount,
            status: b.status === 'pending' ? 'Pending' : 'Completed',
            date: formattedDate,
            game: gameName,
            timestamp: safeTimestamp(b.createdAt)
          })

          // If won, payout record (positive amount)
          if (b.status === 'won' && b.payout > 0) {
            mappedBetRecords.push({
              id: b.id ? `PAY-${b.id}` : (b._id ? `PAY-${b._id}` : `PAY-${Math.floor(10000 + Math.random() * 90000)}`),
              title: `Winnings from ${gameName}`,
              amount: b.payout,
              status: 'Completed',
              date: formattedDate,
              game: gameName,
              timestamp: safeTimestamp(b.updatedAt || b.createdAt)
            })
          }
        })

        setBetRecords(prev => {
          const simulatedClaims = prev.filter(r => r.game === 'VIP Reward' || r.game === 'Referral Reward')
          return [...mappedBetRecords, ...simulatedClaims].sort((a, b) => b.timestamp - a.timestamp)
        })
      }

      if (couponRes.ok) {
        const couponData = await couponRes.json();
        const mappedVouchers = couponData.map(uc => {
          const expiryDate = new Date(uc.expiresAt);
          const diffMs = expiryDate.getTime() - Date.now();
          const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
          const hrs = Math.floor(diffSecs / 3600);
          const mins = Math.floor((diffSecs % 3600) / 60);
          const secs = diffSecs % 60;
          const countdown = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          
          return {
            id: uc.code,
            title: uc.type === 'FIRST_DEPOSIT' ? 'Welcome Offer' : 
                   uc.type === 'GAMEPLAY_FREEBIE' ? 'Gameplay Freebie' : 
                   uc.type === 'FEE_WAIVER' ? 'Withdraw Fee Waiver' : 
                   uc.type === 'REACTIVATION' ? 'Reactivation Reward' : 
                   uc.type === 'LOYALTY' ? 'Loyalty Reward' : 'Retention Reward',
            type: uc.type,
            percent: 0,
            rewardAmount: parseFloat(uc.rewardAmount),
            minDeposit: parseFloat(uc.minDepositRequired),
            maxReward: parseFloat(uc.rewardAmount),
            rules: uc.type === 'GAMEPLAY_FREEBIE' ? [
              `Directly Claimable!`,
              `Reward: ₹${uc.rewardAmount} Free Bet Cash`,
              `No deposit required!`
            ] : uc.type === 'FEE_WAIVER' ? [
              `Waives withdrawal fee!`,
              `Triggers on next withdrawal`
            ] : uc.code === 'WELCOME150' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹150.00 Real Cash`
            ] : uc.code === 'HIGHROLLER500' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹300.00 Real Cash + ₹200.00 Bonus`
            ] : uc.code === 'CASHBACK200' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹140.00 Real Cash + ₹60.00 Bonus`
            ] : uc.code === 'SURVIVAL100' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹25.00 Real Cash + ₹25.00 Bonus`
            ] : uc.code === 'COMEBACK200' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹120.00 Real Cash + ₹80.00 Bonus`
            ] : uc.code === 'ACTIVEPLAY50' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹45.00 Real Cash + ₹5.00 Bonus`
            ] : uc.code === 'LOYALTY250' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹162.50 Real Cash + ₹87.50 Bonus`
            ] : uc.code === 'WEEKEND50' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹37.50 Real Cash + ₹12.50 Bonus`
            ] : uc.code === 'RELOAD999' ? [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹549.45 Real Cash + ₹449.55 Bonus`
            ] : [
              `Min Deposit: ₹${uc.minDepositRequired}`,
              `Get Extra ₹${uc.rewardAmount} Bonus`
            ],
            expiry: `Expire At ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`,
            countdownText: countdown
          };
        });
        setVouchers(mappedVouchers);
      }
    } catch (err) {
      // Only log unexpected errors — not auth failures
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        console.error('Failed to load user history:', err)
      }
    }
  }

  const fetchWinLossStats = async () => {
    if (!user) return null
    const token = localStorage.getItem('token')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const response = await fetch(`${API_BASE}/api/games/win-loss-stats`, {
        headers
      })
      if (!response.ok) throw new Error('Failed to fetch win loss stats')
      return await response.json()
    } catch (err) {
      console.error('Error fetching win/loss stats:', err)
      return null
    }
  }

  const login = (userData) => {
    const uid = userData.id || userData.uid || String(Math.floor(100000 + Math.random() * 900000))
    setUser({ ...userData, uid, role: userData.role || 'user' })
    if (userData.walletBalance !== undefined) {
      setRealBalance(userData.walletBalance)
    }
    if (userData.availableBalance !== undefined) {
      setAvailableBalance(userData.availableBalance)
    }
    if (userData.lockedBalance !== undefined) {
      setLockedBalance(userData.lockedBalance)
    }
    if (userData.bonusBalance !== undefined) {
      setBonusBalance(userData.bonusBalance)
    }
    if (userData.requiredWager !== undefined) {
      setRequiredWager(userData.requiredWager)
    }
    if (userData.requiredBonusWager !== undefined) {
      setRequiredBonusWager(userData.requiredBonusWager)
    }
    if (userData.claimedVipRewards !== undefined) {
      setClaimedVipRewards(userData.claimedVipRewards)
    }
    setTimeout(() => {
      fetchUserHistory()
    }, 50)
  }

  const logout = () => {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' }).catch(err => {
      console.error('Logout request failed:', err)
    })
    setUser(null)
    localStorage.removeItem('token')
    setRealBalance(0)
    setAvailableBalance(0)
    setLockedBalance(0)
    setBonusBalance(0)
    setSavedBanks([])
    setSavedUpis([])
    localStorage.removeItem('cp_saved_banks')
    localStorage.removeItem('cp_saved_upis')
  }

  useEffect(() => {
    fetchUserHistory()
  }, [])

  // Compute total balance
  const balance = parseFloat((realBalance + bonusBalance).toFixed(2))

  const setBalance = (val) => {
    if (typeof val === 'function') {
      setRealBalance(prev => {
        const next = val(prev + bonusBalance)
        return Math.max(0, parseFloat((next - bonusBalance).toFixed(2)))
      })
    } else {
      setRealBalance(Math.max(0, parseFloat((val - bonusBalance).toFixed(2))))
    }
  }
  
  // Unclaimed commissions/referral rewards
  const [unclaimedReferral, setUnclaimedReferral] = useState(0)
  const [directReferralReward, setDirectReferralReward] = useState(0)
  const [betCommissionReward, setBetCommissionReward] = useState(0)



  const [orders, setOrders] = useState([
    {
      id: 'CP-8921-34',
      product: {
        id: 4,
        title: 'Viper Wireless Mouse',
        price: 1899,
        image: mouseImg,
      },
      status: 'Delivered',
      orderDate: 'June 12, 2026',
      deliveryDate: 'June 14, 2026',
      address: {
        name: 'Demo User',
        mobile: '9876543210',
        pin: '400001',
        address: '102, Building A, Main Road',
        landmark: 'Opposite Central Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        type: 'Home'
      },
      tracking: [
        { title: 'Order Confirmed', desc: 'Your order has been confirmed.', time: 'June 12, 10:15 AM', completed: true },
        { title: 'Shipped', desc: 'Item shipped via BlueDart (AWB: BD-89210-A).', time: 'June 13, 02:45 PM', completed: true },
        { title: 'Out for Delivery', desc: 'Courier agent has left for delivery.', time: 'June 14, 09:30 AM', completed: true },
        { title: 'Delivered', desc: 'Order delivered to customer.', time: 'June 14, 02:15 PM', completed: true },
      ]
    }
  ])

  const [requiredWager, setRequiredWager] = useState(0)
  const [requiredBonusWager, setRequiredBonusWager] = useState(0)
  const [depositRecords, setDepositRecords] = useState(INITIAL_DEPOSITS)
  const [withdrawRecords, setWithdrawRecords] = useState(INITIAL_WITHDRAWALS)
  const [savedBanks, setSavedBanks] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_saved_banks')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [savedUpis, setSavedUpis] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_saved_upis')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cp_saved_banks', JSON.stringify(savedBanks))
  }, [savedBanks])

  useEffect(() => {
    localStorage.setItem('cp_saved_upis', JSON.stringify(savedUpis))
  }, [savedUpis])

  const [betRecords, setBetRecords] = useState(INITIAL_BETS)
  const [claimedVipRewards, setClaimedVipRewards] = useState([])



  const [wagerMultipliers, setWagerMultipliers] = useState(() => {
    const saved = localStorage.getItem('cp_wager_multipliers')
    const defaults = {
      refer: 5,
      vip: 12,
      commission: 10,
      depositBonus: 10,
      spinBonus: 10,
      deposit: 1
    }
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.refer === 10 && parsed.vip === 14 && parsed.commission === 18) {
        localStorage.setItem('cp_wager_multipliers', JSON.stringify(defaults))
        return defaults
      }
      return parsed
    }
    return defaults
  })

  const saveWagerMultipliers = (newMults) => {
    setWagerMultipliers(newMults)
    localStorage.setItem('cp_wager_multipliers', JSON.stringify(newMults))
  }

  const deductBalance = (amount) => {
    let realUsed = 0
    let bonusUsed = 0
    
    // Calculate values synchronously based on current balances
    const tempRealUsed = Math.min(realBalance, amount)
    const tempBonusUsed = parseFloat(Math.max(0, amount - tempRealUsed).toFixed(2))
    
    setRealBalance(r => {
      setBonusBalance(b => {
        if (r >= amount) {
          realUsed = amount
          return b
        } else {
          realUsed = r
          bonusUsed = parseFloat((amount - r).toFixed(2))
          const nextBonus = parseFloat((b - bonusUsed).toFixed(2))
          return Math.max(0, nextBonus)
        }
      })
      
      return Math.max(0, parseFloat((r - realUsed).toFixed(2)))
    })

    setRequiredWager(w => {
      if (w <= 0) return 0
      return Math.max(0, parseFloat((w - tempRealUsed).toFixed(2)))
    })

    setRequiredBonusWager(bw => {
      if (bw <= 0) return 0
      const nextBonusWager = Math.max(0, parseFloat((bw - tempBonusUsed).toFixed(2)))
      if (nextBonusWager === 0) {
        setTimeout(() => {
          setBonusBalance(currBonus => {
            if (currBonus > 0) {
              setRealBalance(currReal => parseFloat((currReal + currBonus).toFixed(2)))
            }
            return 0
          })
        }, 0)
      }
      return nextBonusWager
    })
    
    return { realUsed: tempRealUsed, bonusUsed: tempBonusUsed }
  }

  const addWinnings = (winAmount, realUsed = 0, bonusUsed = 0) => {
    const totalUsed = realUsed + bonusUsed
    
    setRequiredWager(w => {
      if (w === 0 || totalUsed === 0) {
        setRealBalance(r => parseFloat((r + winAmount).toFixed(2)))
      } else {
        const realRatio = realUsed / totalUsed
        const realWin = parseFloat((winAmount * realRatio).toFixed(2))
        const bonusWin = parseFloat((winAmount - realWin).toFixed(2))
        
        setRealBalance(r => parseFloat((r + realWin).toFixed(2)))
        setBonusBalance(b => parseFloat((b + bonusWin).toFixed(2)))
      }
      return w
    })
  }

  const addBonus = (amount, multiplierType) => {
    setBonusBalance(b => parseFloat((b + amount).toFixed(2)))
    setRequiredWager(w => {
      const mult = wagerMultipliers[multiplierType] ?? 10
      return parseFloat((w + amount * mult).toFixed(2))
    })
  }

  const addDeposit = (amount, bonusAmount) => {
    setRealBalance(r => parseFloat((r + amount).toFixed(2)))
    if (bonusAmount > 0) {
      setBonusBalance(b => parseFloat((b + bonusAmount).toFixed(2)))
      setRequiredWager(w => {
        const mult = wagerMultipliers.depositBonus ?? 10
        return parseFloat((w + bonusAmount * mult).toFixed(2))
      })
    }
  }

  const withdrawReal = (amount) => {
    setRealBalance(r => Math.max(0, parseFloat((r - amount).toFixed(2))))
  }

  const addCash = (amount) => {
    setRealBalance(r => parseFloat((r + amount).toFixed(2)))
  }

  const addVoucher = (code) => {
    let percent = 5;
    let minDeposit = 100;
    let maxReward = 100;
    let title = `Voucher ${code}`;

    if (code === 'LUCKY10') {
      percent = 10;
      minDeposit = 200;
      maxReward = 100;
      title = '10% Lucky Spin Extra Bonus (LUCKY10)';
    } else if (code === 'LUCKY15') {
      percent = 15;
      minDeposit = 300;
      maxReward = 150;
      title = '15% Lucky Spin Extra Bonus (LUCKY15)';
    } else { // LUCKY5 or default fallback
      percent = 5;
      minDeposit = 100;
      maxReward = 100;
      title = '5% Lucky Spin Extra Bonus (LUCKY5)';
    }

    const newVoucher = {
      id: `${code}-${Date.now()}`,
      title,
      percent,
      minDeposit,
      maxReward,
      rules: [
        `Minimum Deposit: ₹${minDeposit}`,
        `Get Extra ${percent}% on payment`,
        `Maximum Rewards ₹${maxReward}`
      ],
      expiry: 'Expires in 24 hours',
      countdownText: '24:00:00'
    }
    setVouchers(prev => [newVoucher, ...prev])
  }

  const setRole = (role) => {
    setUser((prev) => (prev ? { ...prev, role } : null))
  }

  const claimFreeVoucher = async (code) => {
    if (!user) return { success: false, error: 'Unauthorized' }
    const token = localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    try {
      const res = await fetch(`${API_BASE}/api/payment/coupons/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ couponCode: code })
      })
      const data = await res.json()
      if (res.ok) {
        fetchUserHistory()
        return { success: true, message: data.message }
      } else {
        return { success: false, error: data.error }
      }
    } catch (err) {
      console.error('Failed to claim voucher:', err)
      return { success: false, error: 'Failed to connect to server.' }
    }
  }

  return (
    <UserContext.Provider value={{ 
      user, setUser, login, logout, setRole, 
      balance, setBalance, realBalance, setRealBalance, 
      availableBalance, setAvailableBalance, lockedBalance, setLockedBalance,
      bonusBalance, setBonusBalance,
      deductBalance, addWinnings, addBonus, addDeposit, withdrawReal, addCash,
      vouchers, setVouchers, addVoucher, claimFreeVoucher,
      orders, setOrders,
      unclaimedReferral, setUnclaimedReferral,
      directReferralReward, setDirectReferralReward,
      betCommissionReward, setBetCommissionReward,
      requiredWager, setRequiredWager,
      requiredBonusWager, setRequiredBonusWager,
      depositRecords, setDepositRecords,
      withdrawRecords, setWithdrawRecords,
      savedBanks, setSavedBanks,
      savedUpis, setSavedUpis,
      betRecords, setBetRecords,
      betsList, setBetsList,
      fetchUserHistory,
      walletTransactions,
      fetchWinLossStats,
      claimedVipRewards, setClaimedVipRewards,
      wagerMultipliers, saveWagerMultipliers,
      banners, setBanners, addBanner, updateBanner, deleteBanner,
      products, setProducts, addProduct, updateProduct, deleteProduct
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within UserProvider')
  return context
}
