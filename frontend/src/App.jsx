import { useState, useEffect } from 'react'
import { Home as HomeIcon, Gamepad2, Wallet, User as UserIcon } from 'lucide-react'
import { UserProvider, useUser } from './context/UserContext'
import { GameProvider } from './context/GameContext'
import Home from './pages/Home'
import ColourPrediction from './pages/ColourPrediction'
import SpinWheel from './pages/SpinWheel'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import WalletPage from './pages/Wallet'
import DepositGateway from './pages/DepositGateway'
import DiceGame from './pages/DiceGame'
import TransactionRecordsPage from './pages/TransactionRecords'
import Support from './pages/Support'
import AdminDashboard from './pages/AdminDashboard'
import './index.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'game', label: 'Game', icon: Gamepad2 },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'profile', label: 'Profile', icon: UserIcon },
]

function AppContent() {
  const { user, login, logout } = useUser()
  const [authPage, setAuthPage] = useState('login')
  const [activePage, setActivePage] = useState('home')
  const [routeData, setRouteData] = useState(null)
  const [profileResetTrigger, setProfileResetTrigger] = useState(0)

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
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
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
        return <Home onNavigate={handleNavigate} />
      case 'game':
        return <ColourPrediction onNavigate={handleNavigate} routeData={routeData} />
      case 'spinWheel':
        return <SpinWheel onNavigate={handleNavigate} />
      case 'notifications':
        return <Notifications onBack={() => handleNavigate('home')} />
      case 'wallet':
        return <WalletPage onNavigate={handleNavigate} initialTab={routeData?.tab} />
      case 'transactionRecords':
        return <TransactionRecordsPage onBack={() => handleNavigate('wallet')} />
      case 'depositGateway':
        return <DepositGateway depositData={routeData} onBack={() => handleNavigate('wallet')} onNavigate={handleNavigate} />
      case 'diceGame':
        return <DiceGame onNavigate={handleNavigate} />
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
        return <AdminDashboard onNavigate={handleNavigate} onBack={() => handleNavigate('profile')} />
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
    <UserProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </UserProvider>
  )
}
