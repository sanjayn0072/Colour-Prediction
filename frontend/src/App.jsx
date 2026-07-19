import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom'
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
  const { user, login, logout } = useUser()
  const { socket } = useGame()
  const [authPage, setAuthPage] = useState('login')
  const [activePage, setActivePage] = useState('home')
  const [routeData, setRouteData] = useState(null)
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
    if (page === 'profile' && activePage === 'profile') {
      setProfileResetTrigger(prev => prev + 1)
    }
    setRouteData(data)
    setActivePage(page)
  }

  // URL path/hash listener for administrative layout path redirection
  useEffect(() => {
    const checkAdminRedirection = () => {
      const path = window.location.pathname
      const hash = window.location.hash
      const isAdminPath = path.includes('/admin') || hash.includes('admin')
      
      if (isAdminPath) {
        if (!user) {
          setAuthPage('login')
        } else if (user.role !== 'admin' && user.role !== 'super_admin') {
          // Standard user trying to access admin layout: redirect to Home
          handleNavigate('home')
          // Clean the browser history so they don't see "/admin" or "#admin"
          window.history.replaceState(null, '', '/')
        } else {
          // Authorized user: route to admin dashboard
          handleNavigate('admin')
        }
      }
    }

    checkAdminRedirection()
    window.addEventListener('hashchange', checkAdminRedirection)
    window.addEventListener('popstate', checkAdminRedirection)
    return () => {
      window.removeEventListener('hashchange', checkAdminRedirection)
      window.removeEventListener('popstate', checkAdminRedirection)
    }
  }, [user])

  // Sync pathname with activePage state
  useEffect(() => {
    const path = location.pathname
    if (path === '/products') {
      setActivePage('products')
    } else if (path === '/admin') {
      setActivePage('admin')
    } else if (path === '/' && activePage === 'products') {
      setActivePage('home')
    }
  }, [location])

  // Detect register path or invitecode query param to load Register view automatically
  useEffect(() => {
    const path = location.pathname
    const searchParams = new URLSearchParams(location.search)
    if ((path === '/register' || path === '/signup' || searchParams.has('invitecode')) && !user) {
      setAuthPage('register')
    }
  }, [location, user])

  /* ── Auth Handlers ──────────── */
  const handleLogin = (userData) => {
    login(userData)
    handleNavigate('home')
  }

  const handleLogout = () => {
    logout()
    setAuthPage('login')
  }

  const handleAuthNavigate = (page) => {
    setAuthPage(page)
  }

  /* ── Not Authenticated ──────── */
  if (!user) {
    if (authPage === 'register') {
      return <Register onNavigate={handleAuthNavigate} />
    }
    if (authPage === 'forgot') {
      return <ForgotPassword onNavigate={handleAuthNavigate} />
    }
    return <Login onLogin={handleLogin} onNavigate={handleAuthNavigate} />
  }

  /* ── Authenticated App ─────── */
  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <Home onNavigate={handleNavigate} unreadNotificationsCount={unreadNotificationsCount} />
      case 'products':
        return (
          <React.Suspense fallback={<div className="min-h-screen bg-[#070b13] flex items-center justify-center text-slate-400 font-sans">Loading Marketplace...</div>}>
            <ProductsPage onBack={() => { navigate('/'); setActivePage('home'); }} />
          </React.Suspense>
        )
      case 'game':
        return <GameLobby onNavigate={handleNavigate} routeData={routeData} />
      case 'spinWheel':
        setTimeout(() => handleNavigate('game', { gameId: 'spin-wheel' }), 0)
        return null
      case 'diceGame':
        setTimeout(() => handleNavigate('game', { gameId: 'dice-game' }), 0)
        return null
      case 'notifications':
        return <Notifications onBack={() => handleNavigate('home')} onRefreshUnread={fetchUnreadNotificationsCount} />
      case 'wallet':
        return <WalletPage onNavigate={handleNavigate} initialTab={routeData?.tab} />
      case 'transactionRecords':
        return <TransactionRecordsPage onBack={() => handleNavigate('wallet')} />
      case 'depositGateway':
        return <DepositGateway depositData={routeData} onBack={() => handleNavigate('wallet')} onNavigate={handleNavigate} />

      case 'support':
        return <Support onNavigate={handleNavigate} />
      case 'profile':
        return (
          <Profile 
            key={`profile-${profileResetTrigger}`}
            user={user} 
            onLogout={handleLogout} 
            initialSubPage={routeData?.subPage} 
            onNavigate={handleNavigate} 
          />
        )
      case 'admin':
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
          setTimeout(() => handleNavigate('home'), 0)
          return null
        }
        return (
          <React.Suspense fallback={<AdminLayoutSkeleton />}>
            <AdminDashboard onNavigate={handleNavigate} onBack={() => handleNavigate('profile')} />
          </React.Suspense>
        )
      default:
        return <Home onNavigate={handleNavigate} />
    }
  }

  // Hide nav bar on certain pages
  const hideNav = ['depositGateway', 'transactionRecords', 'admin'].includes(activePage)
  const isAdminLayout = activePage === 'admin'

  return (
    <div className={
      isAdminLayout 
        ? "w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative"
        : "w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 relative md:border-x md:border-border flex flex-col"
    }>
      {/* Page Content */}
      <main className={`flex-1 overflow-y-auto ${!hideNav ? 'pb-20' : ''}`}>
        {renderPage()}
      </main>

      {/* Bottom Navigation Bar */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-md bg-white/85 backdrop-blur-xl border-t border-border z-50">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = activePage === item.id 
                || (activePage === 'depositGateway' && item.id === 'wallet')
                || (['diceGame', 'spinWheel'].includes(activePage) && item.id === 'game')
                || (activePage === 'support' && item.id === 'profile')
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
