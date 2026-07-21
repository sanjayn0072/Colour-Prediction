import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import { Home as HomeIcon, Gamepad2, Wallet, User as UserIcon } from 'lucide-react'
import { UserProvider, useUser } from './context/UserContext'
import { GameProvider, useGame } from './context/GameContext'
import Home from './pages/Home'
import GameLobby from './pages/GameLobby'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import WalletPage from './pages/Wallet'
import DepositGateway from './pages/DepositGateway'
import TransactionRecordsPage from './pages/TransactionRecords'
import Support from './pages/Support'
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const LegacyAdminDashboard = React.lazy(() => import('./pages/LegacyAdminDashboard'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ColourPrediction = React.lazy(() => import('./pages/ColourPrediction'));
const DiceGame = React.lazy(() => import('./pages/DiceGame'));
const SpinWheel = React.lazy(() => import('./pages/SpinWheel'));

const AdminLayoutSkeleton = () => (
  <div className="min-h-screen bg-[#070b13] p-6 space-y-4 animate-pulse font-sans">
    <div className="h-10 bg-slate-900 border border-slate-800/80 rounded-xl w-44" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="h-24 bg-slate-900 border border-slate-800/80 rounded-xl" />
      <div className="h-24 bg-slate-900 border border-slate-800/80 rounded-xl" />
      <div className="h-24 bg-slate-900 border border-slate-800/80 rounded-xl" />
      <div className="h-24 bg-slate-900 border border-slate-800/80 rounded-xl" />
    </div>
    <div className="h-96 bg-slate-900 border border-slate-800/80 rounded-2xl" />
  </div>
);
import './index.css'

// Global Error Boundary to prevent white-screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f19',
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(19, 26, 38, 0.6)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '16px',
            padding: '3rem 2.5rem',
            maxWidth: '420px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f1f5f9' }}>Something went wrong</h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              The application encountered an unexpected error. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '0.625rem 1.5rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.025em',
                transition: 'transform 0.2s'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: UserIcon },
]

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, login, logout, loading, maintenanceActive } = useUser()
  const { socket } = useGame()
  const [profileResetTrigger, setProfileResetTrigger] = useState(0)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

  const fetchUnreadNotificationsCount = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok && Array.isArray(data)) {
        const count = data.filter(n => !n.isRead && !n.is_read).length
        setUnreadNotificationsCount(count)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUnreadNotificationsCount()
    } else {
      setUnreadNotificationsCount(0)
    }
  }, [user])

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification) => {
      setUnreadNotificationsCount(prev => prev + 1)
      const event = new CustomEvent('new_notification_received', { detail: notification })
      window.dispatchEvent(event)
    }

    socket.on('new_notification', handleNewNotification)
    return () => {
      socket.off('new_notification', handleNewNotification)
    }
  }, [socket])

  const handleNavigate = (page, data = null) => {
    if (page === 'profile') {
      setProfileResetTrigger(prev => prev + 1)
      navigate('/account', { state: data })
    } else if (page === 'home') {
      navigate('/')
    } else if (page === 'transactionRecords') {
      navigate('/wallet/records')
    } else if (page === 'depositGateway') {
      navigate('/wallet/gateway', { state: data })
    } else {
      navigate(`/${page}`, { state: data })
    }
  }

  // URL path/hash listener for administrative layout path redirection
  useEffect(() => {
    if (loading) return
    const checkAdminRedirection = () => {
      const path = location.pathname
      const hash = window.location.hash
      const isAdminPath = path.includes('/admin') || hash.includes('admin')
      
      if (isAdminPath) {
        if (!user) {
          navigate('/login')
        } else if (user.role !== 'admin' && user.role !== 'super_admin') {
          navigate('/')
        }
      }
    }
    checkAdminRedirection()
  }, [user, loading, location.pathname])

  // Sync pathname with login redirect when not authenticated
  useEffect(() => {
    if (loading) return
    const path = location.pathname
    const searchParams = new URLSearchParams(location.search)
    const hasInvite = searchParams.has('invitecode') || searchParams.has('inviteCode') || searchParams.has('ref')
    if (!user) {
      if (path !== '/login' && path !== '/register' && path !== '/forgot' && !hasInvite) {
        navigate('/login', { replace: true })
      }
    }
  }, [location.pathname, user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 font-sans">
        <div className="flex flex-col items-center">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 mt-3 font-semibold text-center">Restoring session...</p>
        </div>
      </div>
    )
  }

  if (maintenanceActive) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-800 font-sans p-6 text-center">
        <div className="flex flex-col items-center max-w-sm bg-white p-8 border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-6 text-indigo-650 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Platform Under Maintenance</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            We are performing scheduled systems optimization to improve your gaming experience. The platform will be back online shortly.
          </p>
          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider">
            Coming Back Soon
          </div>
        </div>
      </div>
    )
  }

  /* ── Auth Handlers ──────────── */
  const handleLogin = (userData) => {
    login(userData)
    navigate('/')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Hide nav bar on certain pages
  const path = location.pathname
  const hideNav = path.startsWith('/admin') ||
                  path.startsWith('/wallet/gateway') ||
                  path.startsWith('/wallet/records') ||
                  path.startsWith('/login') ||
                  path.startsWith('/register') ||
                  path.startsWith('/forgot')
  
  const isAdminLayout = path.startsWith('/admin')

  const getActiveNavItem = () => {
    if (path === '/' || path === '/home') return 'home'
    if (path.startsWith('/game')) return 'game'
    if (path.startsWith('/wallet')) return 'wallet'
    if (path.startsWith('/account') || path.startsWith('/support')) return 'profile'
    return ''
  }
  const activeNavItem = getActiveNavItem()

  return (
    <div className={
      isAdminLayout 
        ? "w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative"
        : "w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 relative md:border-x md:border-border flex flex-col"
    }>
      {/* Page Content */}
      <main className={`flex-1 overflow-y-auto ${!hideNav ? 'pb-20' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} onNavigate={(p) => navigate(p === 'forgot' ? '/forgot' : p === 'register' ? '/register' : '/login')} /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register onNavigate={(p) => navigate(p === 'forgot' ? '/forgot' : p === 'register' ? '/register' : '/login')} /> : <Navigate to="/" replace />} />
          <Route path="/forgot" element={!user ? <ForgotPassword onNavigate={(p) => navigate(p === 'forgot' ? '/forgot' : p === 'register' ? '/register' : '/login')} /> : <Navigate to="/" replace />} />

          {/* Protected User Routes */}
          <Route path="/" element={user ? <Home onNavigate={handleNavigate} unreadNotificationsCount={unreadNotificationsCount} /> : <Navigate to="/login" replace />} />
          <Route path="/game" element={user ? <GameLobby onNavigate={handleNavigate} /> : <Navigate to="/login" replace />} />
          <Route path="/game/colour" element={
            user ? (
              <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Game...</div>}>
                <ColourPrediction />
              </React.Suspense>
            ) : <Navigate to="/login" replace />
          } />
          <Route path="/game/dice" element={
            user ? (
              <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Game...</div>}>
                <DiceGame />
              </React.Suspense>
            ) : <Navigate to="/login" replace />
          } />
          <Route path="/game/spin" element={
            user ? (
              <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Game...</div>}>
                <SpinWheel />
              </React.Suspense>
            ) : <Navigate to="/login" replace />
          } />
          <Route path="/wallet" element={user ? <WalletPage onNavigate={handleNavigate} /> : <Navigate to="/login" replace />} />
          <Route path="/wallet/records" element={user ? <TransactionRecordsPage onBack={() => navigate('/wallet')} /> : <Navigate to="/login" replace />} />
          <Route path="/wallet/gateway" element={user ? <DepositGateway onBack={() => navigate('/wallet')} onNavigate={handleNavigate} /> : <Navigate to="/login" replace />} />
          <Route path="/account" element={
            user ? (
              <Profile 
                key={`profile-${profileResetTrigger}`}
                user={user} 
                onLogout={handleLogout} 
                onNavigate={handleNavigate} 
              />
            ) : <Navigate to="/login" replace />
          } />
          <Route path="/notifications" element={user ? <Notifications onBack={() => navigate('/')} onRefreshUnread={fetchUnreadNotificationsCount} /> : <Navigate to="/login" replace />} />
          <Route path="/support" element={user ? <Support onNavigate={handleNavigate} /> : <Navigate to="/login" replace />} />
          <Route path="/products" element={
            user ? (
              <React.Suspense fallback={<div className="min-h-screen bg-[#070b13] flex items-center justify-center text-slate-400 font-sans">Loading Marketplace...</div>}>
                <ProductsPage onBack={() => navigate('/')} />
              </React.Suspense>
            ) : <Navigate to="/login" replace />
          } />

          {/* Protected Admin Routes */}
          <Route path="/admin/*" element={
            (user && (user.role === 'admin' || user.role === 'super_admin')) ? (
              <React.Suspense fallback={<AdminLayoutSkeleton />}>
                <AdminDashboard onNavigate={handleNavigate} onBack={() => navigate('/account')} />
              </React.Suspense>
            ) : <Navigate to="/" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom Navigation Bar */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-md bg-white/85 backdrop-blur-xl border-t border-border z-50">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activeNavItem === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-primary scale-105'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-0 w-6 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </UserProvider>
    </ErrorBoundary>
  )
}
