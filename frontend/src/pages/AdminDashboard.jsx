import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useGame } from '../context/GameContext'
import { 
  ArrowLeft, Shield, Activity, Database, Settings, Plus, Trash2, Edit2, Save, 
  AlertTriangle, TrendingUp, Users, Wallet, Clock, Lock, Check, RefreshCw, X, AlertCircle,
  ShoppingBag, Tag, Gamepad2, Gift, UserCheck, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function AdminDashboard({ onBack }) {
  const { 
    user, 
    banners, addBanner, updateBanner, deleteBanner,
    products, addProduct, updateProduct, deleteProduct 
  } = useUser()

  const {
    diceTimeLeft, diceRoundId, dicePhase,
    colourTimeLeft, colourRoundId, colourPhase
  } = useGame()

  const [activeTab, setActiveTab] = useState('overview') 
  const [logFilter, setLogFilter] = useState('ALL') 
  const [logSearch, setLogSearch] = useState('')
  const [logs, setLogs] = useState([])

  // Database stats metrics
  const [activePlayers, setActivePlayers] = useState(0)
  const [totalBets, setTotalBets] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)

  // Manual Withdrawal System admin states
  const [withdrawals, setWithdrawals] = useState([])
  const [withdrawSearch, setWithdrawSearch] = useState('')
  const [withdrawFilter, setWithdrawFilter] = useState('ALL')
  const [withdrawPage, setWithdrawPage] = useState(1)
  const [withdrawTotalPages, setWithdrawTotalPages] = useState(1)
  const [withdrawTotalCount, setWithdrawTotalCount] = useState(0)
  const [withdrawProcessingId, setWithdrawProcessingId] = useState(null)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const [showPayModal, setShowPayModal] = useState(false)
  const [payId, setPayId] = useState(null)
  const [payUtr, setPayUtr] = useState('')
  const [payNote, setPayNote] = useState('')

  // Edit / Add States for Super Admin
  const [editingBannerId, setEditingBannerId] = useState(null)
  const [bannerEditTitle, setBannerEditTitle] = useState('')
  const [bannerEditSubtitle, setBannerEditSubtitle] = useState('')

  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [newProductTitle, setNewProductTitle] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')
  const [newProductOriginal, setNewProductOriginal] = useState('')
  const [newProductBadge, setNewProductBadge] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')

  // Super Admin: Users & Audits states
  const [usersList, setUsersList] = useState([])
  const [usersSearch, setUsersSearch] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersTotalCount, setUsersTotalCount] = useState(0)
  const [selectedUserForAudit, setSelectedUserForAudit] = useState(null)
  const [selectedUserHistory, setSelectedUserHistory] = useState({ bets: [], transactions: [] })
  const [loadingUserHistory, setLoadingUserHistory] = useState(false)
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceModalUser, setBalanceModalUser] = useState(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceType, setBalanceType] = useState('real') 
  const [balanceDescription, setBalanceDescription] = useState('')
  const [adjustingBalance, setAdjustingBalance] = useState(false)

  // Super Admin: Orders states
  const [ordersList, setOrdersList] = useState([])
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('ALL')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersTotalCount, setOrdersTotalCount] = useState(0)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)

  // Super Admin: Support / Complaints states
  const [complaintsList, setComplaintsList] = useState([])
  const [complaintsStatusFilter, setComplaintsStatusFilter] = useState('ALL')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [complaintStatusUpdate, setComplaintStatusUpdate] = useState('open')
  const [assignedAdminUpdate, setAssignedAdminUpdate] = useState('')
  const [updatingComplaintId, setUpdatingComplaintId] = useState(null)

  // Super Admin: Coupons/Vouchers states
  const [couponsList, setCouponsList] = useState([])
  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponDiscountType, setNewCouponDiscountType] = useState('flat')
  const [newCouponValue, setNewCouponValue] = useState('')
  const [newCouponMinDeposit, setNewCouponMinDeposit] = useState('')
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('')
  const [newCouponExpiresAt, setNewCouponExpiresAt] = useState('')
  const [creatingCoupon, setCreatingCoupon] = useState(false)

  // Super Admin: Spin config & Game status states
  const [spinConfigsList, setSpinConfigsList] = useState([])
  const [updatingSpinConfigId, setUpdatingSpinConfigId] = useState(null)
  const [spinConfigWeight, setSpinConfigWeight] = useState('')
  const [spinConfigValue, setSpinConfigValue] = useState('')
  const [spinConfigIsActive, setSpinConfigIsActive] = useState(true)
  const [gamesList, setGamesList] = useState([])

  // Advanced Command Center features states
  const [riskAlerts, setRiskAlerts] = useState([])
  const [financialData, setFinancialData] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [loadingRiskAlerts, setLoadingRiskAlerts] = useState(false)
  
  // Command Palette states
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandPaletteSearch, setCommandPaletteSearch] = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin'

  const tabs = isSuperAdmin ? [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users & Audits', icon: Users },
    { id: 'withdrawals', label: 'Withdrawals', icon: Clock },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'support', label: 'Support Tickets', icon: AlertTriangle },
    { id: 'promotions', label: 'Coupons & Promos', icon: Tag },
    { id: 'game-controls', label: 'Game Controls', icon: Gamepad2 },
    { id: 'logs', label: 'Logs', icon: Database },
    { id: 'config', label: 'Store Config', icon: Settings }
  ] : [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'withdrawals', label: 'Withdrawals', icon: Clock },
    { id: 'logs', label: 'Logs', icon: Database },
    { id: 'config', label: 'Store Config', icon: Settings }
  ]

  // Fetch admin stats and logs from backend endpoints
  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    
    try {
      const metricsRes = await fetch(`${API_BASE}/api/admin/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setActivePlayers(metricsData.activePlayers || 0)
        setTotalBets(metricsData.totalBets || 0)
        setPendingWithdrawals(metricsData.pendingWithdrawals || 0)
      }

      const logsRes = await fetch(`${API_BASE}/api/admin/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData || [])
      }

      // Fetch risk alerts
      const riskRes = await fetch(`${API_BASE}/api/admin/risk-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (riskRes.ok) {
        const riskData = await riskRes.json()
        setRiskAlerts(riskData || [])
      }

      // Fetch financial analytics
      const financesRes = await fetch(`${API_BASE}/api/admin/analytics/finances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (financesRes.ok) {
        const financesData = await financesRes.json()
        setFinancialData(financesData)
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err)
    }
  }

  const handleResolveAlert = async (alertId) => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/admin/risk-alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        alert('Risk alert marked as resolved!')
        fetchDashboardData()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to resolve alert')
      }
    } catch (err) {
      alert('Error resolving risk alert')
    }
  }

  const fetchWithdrawals = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/withdrawals?status=${withdrawFilter}&search=${withdrawSearch}&page=${withdrawPage}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setWithdrawals(data.records || [])
        setWithdrawTotalPages(data.pagination?.pages || 1)
        setWithdrawTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load admin withdrawals:', err)
    }
  }

  const fetchUsers = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/users?search=${usersSearch}&page=${usersPage}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setUsersList(data.records || [])
        setUsersTotalPages(data.pagination?.pages || 1)
        setUsersTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load admin users:', err)
    }
  }

  const fetchUserHistory = async (userId) => {
    setLoadingUserHistory(true)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/users/${userId}/history`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setSelectedUserHistory(data)
      }
    } catch (err) {
      console.error('Failed to load user history:', err)
    } finally {
      setLoadingUserHistory(false)
    }
  }

  const handleUserStatusToggle = async (userId, currentStatus) => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    const newStatus = currentStatus === 'active' ? 'locked' : 'active'
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      )
      if (response.ok) {
        alert(`User status updated to ${newStatus}`)
        fetchUsers()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to update status')
      }
    } catch (err) {
      alert('Error updating user status')
    }
  }

  const handleAdjustBalanceSubmit = async (e) => {
    e.preventDefault()
    if (!balanceModalUser || !balanceAmount.trim()) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    setAdjustingBalance(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/users/${balanceModalUser.id}/balance`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: parseFloat(balanceAmount),
            balanceType,
            description: balanceDescription
          })
        }
      )
      if (response.ok) {
        alert('Balance adjusted successfully!')
        setShowBalanceModal(false)
        setBalanceModalUser(null)
        setBalanceAmount('')
        setBalanceDescription('')
        fetchUsers()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to adjust balance')
      }
    } catch (err) {
      alert('Error adjusting user balance')
    } finally {
      setAdjustingBalance(false)
    }
  }

  const fetchOrders = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/orders?status=${ordersStatusFilter}&page=${ordersPage}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setOrdersList(data.records || [])
        setOrdersTotalPages(data.pagination?.pages || 1)
        setOrdersTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    setUpdatingOrderId(orderId)
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/orders/${orderId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      )
      if (response.ok) {
        alert('Order status updated successfully')
        fetchOrders()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to update order status')
      }
    } catch (err) {
      alert('Error updating order status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const fetchComplaints = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/complaints?status=${complaintsStatusFilter}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setComplaintsList(data || [])
      }
    } catch (err) {
      console.error('Failed to load complaints:', err)
    }
  }

  const handleUpdateComplaintSubmit = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    setUpdatingComplaintId(selectedComplaint.id)
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/complaints/${selectedComplaint.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status: complaintStatusUpdate,
            assignedAdmin: assignedAdminUpdate ? parseInt(assignedAdminUpdate) : null,
            resolutionNotes: resolutionNotes
          })
        }
      )
      if (response.ok) {
        alert('Support ticket updated successfully!')
        setSelectedComplaint(null)
        setResolutionNotes('')
        setComplaintStatusUpdate('open')
        setAssignedAdminUpdate('')
        fetchComplaints()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to update ticket')
      }
    } catch (err) {
      alert('Error updating ticket')
    } finally {
      setUpdatingComplaintId(null)
    }
  }

  const fetchCoupons = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/coupons`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setCouponsList(data || [])
      }
    } catch (err) {
      console.error('Failed to load coupons:', err)
    }
  }

  const handleCreateCouponSubmit = async (e) => {
    e.preventDefault()
    if (!newCouponCode.trim() || !newCouponValue.trim()) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    setCreatingCoupon(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/coupons`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            code: newCouponCode,
            discountType: newCouponDiscountType,
            value: parseFloat(newCouponValue),
            minDeposit: parseFloat(newCouponMinDeposit) || 0.0,
            maxUses: parseInt(newCouponMaxUses) || 1,
            expiresAt: newCouponExpiresAt ? new Date(newCouponExpiresAt).toISOString() : null
          })
        }
      )
      if (response.ok) {
        alert('Coupon created successfully!')
        setNewCouponCode('')
        setNewCouponValue('')
        setNewCouponMinDeposit('')
        setNewCouponMaxUses('')
        setNewCouponExpiresAt('')
        fetchCoupons()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to create coupon')
      }
    } catch (err) {
      alert('Error creating coupon')
    } finally {
      setCreatingCoupon(false)
    }
  }

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/coupons/${couponId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        alert('Coupon deleted successfully!')
        fetchCoupons()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to delete coupon')
      }
    } catch (err) {
      alert('Error deleting coupon')
    }
  }

  const fetchSpinConfigs = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/spin-configs`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setSpinConfigsList(data || [])
      }
    } catch (err) {
      console.error('Failed to load spin configs:', err)
    }
  }

  const fetchGames = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/games`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setGamesList(data || [])
      }
    } catch (err) {
      console.error('Failed to load games:', err)
    }
  }

  const handleUpdateSpinConfigSubmit = async (e) => {
    e.preventDefault()
    if (!updatingSpinConfigId) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/spin-configs/${updatingSpinConfigId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            weight: parseInt(spinConfigWeight),
            value: parseFloat(spinConfigValue),
            isActive: spinConfigIsActive
          })
        }
      )
      if (response.ok) {
        alert('Spin configuration updated successfully!')
        setUpdatingSpinConfigId(null)
        setSpinConfigWeight('')
        setSpinConfigValue('')
        fetchSpinConfigs()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to update config')
      }
    } catch (err) {
      alert('Error updating config')
    }
  }

  const handleToggleGameStatus = async (gameId, currentStatus) => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    const newStatus = !currentStatus
    try {
      const response = await fetch(
        `${API_BASE}/api/admin/games/${gameId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: newStatus })
        }
      )
      if (response.ok) {
        alert(`Game status updated successfully!`)
        fetchGames()
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to update status')
      }
    } catch (err) {
      alert('Error updating game status')
    }
  }

  // Listen for keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowCommandPalette(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      fetchWithdrawals()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'orders') {
      fetchOrders()
    } else if (activeTab === 'support') {
      fetchComplaints()
    } else if (activeTab === 'promotions') {
      fetchCoupons()
    } else if (activeTab === 'game-controls') {
      fetchSpinConfigs()
      fetchGames()
    }
  }, [activeTab, withdrawFilter, withdrawSearch, withdrawPage, usersSearch, usersPage, ordersStatusFilter, ordersPage, complaintsStatusFilter])

  const handleApprove = async (id) => {
    setWithdrawProcessingId(id)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve request')
      alert('Request approved successfully!')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      alert(err.message)
    } finally {
      setWithdrawProcessingId(null)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectId) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${rejectId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNote: rejectNote })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject request')
      alert('Request rejected and user balance re-credited.')
      setShowRejectModal(false)
      setRejectId(null)
      setRejectNote('')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    if (!payId || !payUtr.trim()) return
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${payId}/mark-paid`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ utrNumber: payUtr, adminNote: payNote })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to mark as paid')
      alert('Request marked as PAID and locked funds permanently released.')
      setShowPayModal(false)
      setPayId(null)
      setPayUtr('')
      setPayNote('')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStartEditBanner = (banner) => {
    if (!isSuperAdmin) return
    setEditingBannerId(banner.id)
    setBannerEditTitle(banner.title)
    setBannerEditSubtitle(banner.subtitle)
  }

  const handleSaveBanner = (id) => {
    if (!isSuperAdmin) return
    updateBanner(id, { title: bannerEditTitle, subtitle: bannerEditSubtitle })
    setEditingBannerId(null)
  }

  const handleAddProductSubmit = (e) => {
    e.preventDefault()
    if (!isSuperAdmin) return
    if (!newProductTitle || !newProductPrice) return

    addProduct({
      title: newProductTitle,
      price: parseInt(newProductPrice) || 0,
      original: parseInt(newProductOriginal) || parseInt(newProductPrice) * 1.5,
      badge: newProductBadge || 'New Arrival',
      desc: newProductDesc || 'Premium high-performance product added via Administrator Control Center.'
    })

    // Reset Form
    setNewProductTitle('')
    setNewProductPrice('')
    setNewProductOriginal('')
    setNewProductBadge('')
    setNewProductDesc('')
    setShowAddProductModal(false)
  }

  const filteredLogs = logs.filter(log => {
    const matchesFilter = logFilter === 'ALL' || log.type === logFilter
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.type.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.time.includes(logSearch)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      {/* ── Left Sidebar (Desktop only) ── */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/80 flex-col p-6 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider text-white uppercase">ColourPlay</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>

          {/* Admin User Badge */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Admin User'}</p>
              <p className="text-[9px] text-slate-550 truncate font-semibold">{isSuperAdmin ? 'Super Admin' : 'Standard Admin'}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer border-0 ${
                    isActive
                      ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-xs font-bold text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-800/60"
          >
            <ArrowLeft size={13} />
            Back to Player App
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors border-0"
            >
              <ArrowLeft size={16} className="text-slate-300" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Shield size={15} className="text-red-500" />
                Admin Panel
              </h1>
              <p className="text-[9px] text-slate-500 font-medium">System Controls</p>
            </div>
          </div>

          {/* Role Pill */}
          {isSuperAdmin ? (
            <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          ) : (
            <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </header>

        {/* Mobile Tabs Bar (Hidden on Desktop) */}
        <div className="lg:hidden px-4 pt-4 shrink-0">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-900/60 border border-slate-800/60 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content (Both Mobile & Desktop wrapper) */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
        
        {/* ── TABS: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Real-time Risk Alerts Warning HUD Console */}
            {riskAlerts && riskAlerts.filter(a => !a.isResolved).length > 0 && (
              <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 space-y-3 shadow-lg shadow-red-500/5 animate-pulse">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-wider text-red-400 uppercase flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                    ⚠️ CRITICAL SECURITY WARNING: HIGH-RISK USER ACTIVITIES DETECTED
                  </h3>
                  <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase">
                    {riskAlerts.filter(a => !a.isResolved).length} Alerts Pending
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {riskAlerts.filter(a => !a.isResolved).map(alert => (
                    <div key={alert.id} className="bg-slate-955 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                            alert.riskScore >= 85 ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'
                          }`}>
                            Risk Score: {alert.riskScore}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold">{alert.userName} ({alert.userPhone})</span>
                          <span className="text-[9px] font-mono text-slate-500">UID: {alert.userUid}</span>
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">{alert.details}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[9.5px] px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                        >
                          Resolve Alert
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleUserStatusToggle(alert.userId, 'active')} // locks account if active
                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-[9.5px] px-2.5 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                          >
                            Lock Player
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bento Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Players */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/5 group">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Players</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                      <Users size={14} className="text-indigo-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-white tracking-tight">{activePlayers.toLocaleString()}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded-md self-start">
                  <TrendingUp size={10} /> Live updating
                </div>
              </div>

              {/* Card 2: Total Volume */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Volume</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                      <Wallet size={14} className="text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-white tracking-tight">₹{totalBets.toLocaleString()}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[9px] text-indigo-400 font-bold bg-indigo-500/5 px-2 py-1 rounded-md self-start">
                  +1.2% this hour
                </div>
              </div>

              {/* Card 3: Withdraw Queue */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5 group">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Withdraw Queue</span>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                      <Clock size={14} className="text-amber-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-white tracking-tight">{pendingWithdrawals} Pending</p>
                </div>
                <button 
                  onClick={() => setPendingWithdrawals(0)}
                  disabled={isAdmin}
                  className={`mt-4 flex items-center justify-center gap-1 text-[9.5px] font-bold px-2 py-1.5 rounded-lg w-full transition-all border-0 ${
                    isAdmin 
                      ? 'bg-slate-800/40 text-slate-550 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/10 cursor-pointer hover:scale-[1.02]'
                  }`}
                >
                  {isAdmin ? '🔒 Locked' : 'Approve Queue'}
                </button>
              </div>

              {/* Card 4: Engine Status */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/5 group">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Engine Status</span>
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                      <Activity size={14} className="text-red-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Online
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[9px] text-slate-400 font-bold bg-slate-850 px-2 py-1 rounded-md self-start">
                  API Node 01
                </div>
              </div>
            </div>

            {/* Financial Performance Overview */}
            {financialData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Analytics Summary */}
                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 lg:col-span-1 flex flex-col justify-between space-y-6">
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-4 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-400" />
                      Financial Health Summary
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Gross Betting Volume</p>
                        <p className="text-xl font-extrabold text-white">₹{financialData.summary.grossVolume.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Platform Profit Margin</p>
                        <p className="text-xl font-extrabold text-emerald-400">₹{financialData.summary.platformProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total User Wallet Liabilities</p>
                        <p className="text-xs font-extrabold text-slate-350 mt-1 leading-relaxed">
                          Real Wallets: ₹{financialData.summary.walletBalances.toLocaleString()}<br/>
                          Bonus Wallets: ₹{financialData.summary.bonusBalances.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-500 font-bold uppercase">
                    <span>Deposits: ₹{financialData.summary.totalDeposits.toLocaleString()}</span>
                    <span>Withdraws: ₹{financialData.summary.totalWithdrawals.toLocaleString()}</span>
                  </div>
                </div>

                {/* Recharts Analytics Graph */}
                <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 lg:col-span-2">
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-400 mb-4">
                    Daily Wagers & Profits Trend (7 Days)
                  </h3>
                  <div className="h-64">
                    {financialData.trend && financialData.trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={financialData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} 
                            labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                            itemStyle={{ fontSize: '11px' }}
                          />
                          <Area name="Gross Volume" type="monotone" dataKey="grossVolume" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" />
                          <Area name="Platform Profit" type="monotone" dataKey="platformProfit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-550">
                        No wagering activity recorded in the last 7 days.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Game State Engines */}
            <div className="bg-slate-955/50 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Clock size={14} className="text-indigo-400" />
                Live Game Loop Monitor & Manual Result Overrides
              </h3>
              
              <div className="space-y-3">
                {/* Dice Game */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Dice Game Pro</p>
                      <p className="text-[10px] text-slate-550 mt-0.5">Round ID: {diceRoundId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        dicePhase === 'lock' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {dicePhase === 'lock' ? 'Locked' : 'Betting'}
                      </span>
                      <span className="text-sm font-mono font-bold text-indigo-400">{diceTimeLeft}s</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Force outcome (e.g. 55.50)"
                        id="diceOverrideInput"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 flex-1 max-w-[200px]"
                      />
                      <button 
                        onClick={async () => {
                          const input = document.getElementById('diceOverrideInput');
                          const val = parseFloat(input?.value);
                          if (isNaN(val) || val < 0 || val > 100) {
                            alert('Enter a valid number between 0 and 100');
                            return;
                          }
                          const token = localStorage.getItem('token');
                          const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
                          const response = await fetch(`${API_BASE}/api/admin/games/${diceRoundId}/override`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ outcome: val.toFixed(2) })
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert(`Dice Pro Round ${diceRoundId} outcome overridden to ${val.toFixed(2)}`);
                            if(input) input.value = '';
                          } else {
                            alert(data.error || 'Failed to override outcome');
                          }
                        }}
                        className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[9.5px] px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                      >
                        Force Outcome
                      </button>
                    </div>
                  )}
                </div>

                {/* Colour Game */}
                <div className="bg-slate-900 border border-slate-850 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Colour Prediction</p>
                      <p className="text-[10px] text-slate-550 mt-0.5">Round ID: {colourRoundId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        colourPhase === 'lock' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {colourPhase === 'lock' ? 'Locked' : 'Betting'}
                      </span>
                      <span className="text-sm font-mono font-bold text-indigo-400">{colourTimeLeft}s</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                      <select 
                        id="colourNumberInput"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Select Win Number</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select 
                        id="colourColorInput"
                        className="bg-slate-955 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Select Win Color</option>
                        <option value="RED">RED</option>
                        <option value="GREEN">GREEN</option>
                        <option value="VIOLET">VIOLET</option>
                      </select>
                      <button 
                        onClick={async () => {
                          const numInput = document.getElementById('colourNumberInput');
                          const colInput = document.getElementById('colourColorInput');
                          const winNum = numInput?.value;
                          const winCol = colInput?.value;
                          if (!winNum || !winCol) {
                            alert('Please select both a winning number and color');
                            return;
                          }
                          const outcomeStr = `${winNum} ${winCol.toUpperCase()}`;
                          const token = localStorage.getItem('token');
                          const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
                          const response = await fetch(`${API_BASE}/api/admin/games/${colourRoundId}/override`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ outcome: outcomeStr })
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert(`Colour prediction Round ${colourRoundId} outcome overridden to ${outcomeStr}`);
                            if(numInput) numInput.value = '';
                            if(colInput) colInput.value = '';
                          } else {
                            alert(data.error || 'Failed to override outcome');
                          }
                        }}
                        className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[9.5px] px-3 py-1.5 rounded-lg border-0 cursor-pointer transition-all"
                      >
                        Force Outcome
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TABS: USERS & AUDITS ── */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-2">
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => {
                  setUsersSearch(e.target.value)
                  setUsersPage(1)
                }}
                placeholder="Search by Name, Phone, Email, UID..."
                className="flex-1 bg-slate-955/70 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
              />
              <button
                onClick={fetchUsers}
                className="px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-xl transition-colors border-0 flex items-center justify-center cursor-pointer"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="text-[10px] text-slate-500 font-bold px-1 flex justify-between">
              <span>FOUND: {usersTotalCount} USERS</span>
              <span>PAGE {usersPage} OF {usersTotalPages}</span>
            </div>

            {/* Users responsive container */}
            {usersList.length === 0 ? (
              <div className="bg-slate-955/20 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <Users size={28} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-bold">No users found</p>
              </div>
            ) : (
              <>
                {/* Desktop view table */}
                <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">User Details</th>
                        <th className="px-6 py-4">UID & Status</th>
                        <th className="px-6 py-4 text-right">Balances</th>
                        <th className="px-6 py-4 text-right">Performance</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{u.name || 'No Name'}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{u.phone}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.email || 'No Email'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-slate-400">{u.uid}</div>
                            <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider mt-1.5 ${
                              u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div>Real: <span className="font-bold text-white">₹{parseFloat(u.walletBalance || 0).toFixed(2)}</span></div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Bonus: ₹{parseFloat(u.bonusBalance || 0).toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500">Wager: ₹{parseFloat(u.requiredWager || 0).toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div>Dep: <span className="font-bold text-white">₹{parseFloat(u.totalDeposits || 0).toFixed(2)}</span></div>
                            <div className="text-[10px] text-slate-400 mt-0.5">With: ₹{parseFloat(u.totalWithdrawals || 0).toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500">Played: {u.gamesPlayed || 0}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  setSelectedUserForAudit(u)
                                  fetchUserHistory(u.id)
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1"
                              >
                                <FileText size={11} /> Audits
                              </button>
                              <button
                                onClick={() => {
                                  setBalanceModalUser(u)
                                  setBalanceAmount('')
                                  setBalanceDescription('')
                                  setBalanceType('real')
                                  setShowBalanceModal(true)
                                }}
                                className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1"
                              >
                                <Wallet size={11} /> Adjust
                              </button>
                              <button
                                onClick={() => handleUserStatusToggle(u.id, u.status)}
                                className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer border border-0 flex items-center gap-1 ${
                                  u.status === 'active'
                                    ? 'bg-red-950/30 hover:bg-red-900/40 text-red-400'
                                    : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400'
                                }`}
                              >
                                <Lock size={11} /> {u.status === 'active' ? 'Lock' : 'Unlock'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view list */}
                <div className="lg:hidden space-y-3">
                  {usersList.map((u) => (
                    <div key={u.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 hover:border-slate-750 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white">{u.name || 'No Name'}</span>
                            <span className="text-[9px] font-mono text-slate-500 bg-slate-955 px-1.5 py-0.5 rounded">{u.uid}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                              u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {u.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">{u.phone} | {u.email || 'No Email'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-400">Real: <span className="text-white">₹{parseFloat(u.walletBalance || 0).toFixed(2)}</span></p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-bold">Bonus: ₹{parseFloat(u.bonusBalance || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-550 font-bold">Wager: ₹{parseFloat(u.requiredWager || 0).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950/20 p-2 rounded-xl text-[9px] text-slate-400 border border-slate-900">
                        <div>
                          <span className="text-slate-500 block">Deposits:</span>
                          <span className="font-bold text-white">₹{parseFloat(u.totalDeposits || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Withdrawals:</span>
                          <span className="font-bold text-white">₹{parseFloat(u.totalWithdrawals || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Games Played:</span>
                          <span className="font-bold text-white">{u.gamesPlayed || 0}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end border-t border-slate-900/60 pt-2.5">
                        <button
                          onClick={() => {
                            setSelectedUserForAudit(u)
                            fetchUserHistory(u.id)
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1"
                        >
                          <FileText size={11} /> Audits
                        </button>
                        <button
                          onClick={() => {
                            setBalanceModalUser(u)
                            setBalanceAmount('')
                            setBalanceDescription('')
                            setBalanceType('real')
                            setShowBalanceModal(true)
                          }}
                          className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1"
                        >
                          <Wallet size={11} /> Adjust
                        </button>
                        <button
                          onClick={() => handleUserStatusToggle(u.id, u.status)}
                          className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer border border-0 flex items-center gap-1 ${
                            u.status === 'active'
                              ? 'bg-red-950/30 hover:bg-red-900/40 text-red-400'
                              : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400'
                          }`}
                        >
                          <Lock size={11} /> {u.status === 'active' ? 'Lock' : 'Unlock'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {usersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-400">Page {usersPage} of {usersTotalPages}</span>
                <button
                  disabled={usersPage === usersTotalPages}
                  onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TABS: SYSTEM LOGS ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter Search */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs (e.g. success, round, uid)..."
                className="w-full bg-slate-955/70 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
              />
              
              {/* Level Pill filters */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                {['ALL', 'INFO', 'SUCCESS', 'WARNING'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-colors cursor-pointer shrink-0 border-slate-800 ${
                      logFilter === lvl
                        ? 'bg-slate-100 text-slate-950 border-slate-100'
                        : 'bg-slate-955 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Window */}
            <div className="bg-slate-955/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[360px]">
              <div className="bg-slate-955/80 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Log Stream</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              </div>

              <div className="p-3 overflow-y-auto space-y-2 font-mono text-[10px] leading-relaxed flex-1 scrollbar-hide">
                {filteredLogs.length === 0 ? (
                  <p className="text-slate-600 text-center py-8 font-sans">No logs matching filters.</p>
                ) : (
                  filteredLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className={`font-bold shrink-0 ${
                        log.type === 'SUCCESS' ? 'text-emerald-400' :
                        log.type === 'WARNING' ? 'text-amber-500' : 'text-blue-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TABS: CONFIGURATION ── */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            
            {/* Strict Read-Only Mode Banner */}
            {isAdmin && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 shadow-lg shadow-amber-500/5">
                <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-400">Strict Read-Only Access</h4>
                  <p className="text-[10px] text-amber-300/80 leading-relaxed mt-1">
                    🔒 Read-only access enabled. You do not have permissions to modify system configuration. All operational action buttons (such as Save, Delete, or Add Product) have been completely removed from your layout to prevent accidental or unauthorized state modifications.
                  </p>
                </div>
              </div>
            )}

            {/* BANNERS SECTION */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-400" />
                  Dashboard Banners
                </h3>
              </div>

              <div className="space-y-3">
                {banners.map((banner) => {
                  const isEditing = editingBannerId === banner.id
                  return (
                    <div key={banner.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Banner Title</label>
                          <input
                            type="text"
                            value={bannerEditTitle}
                            onChange={(e) => setBannerEditTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Subtitle Description</label>
                          <textarea
                            value={bannerEditSubtitle}
                            onChange={(e) => setBannerEditSubtitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none h-16 resize-none"
                          />
                          <div className="flex justify-end gap-1.5 mt-1">
                            <button
                              onClick={() => setEditingBannerId(null)}
                              className="px-2.5 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 transition-colors cursor-pointer border-0"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveBanner(banner.id)}
                              className="px-2.5 py-1.5 bg-emerald-500 text-[10px] text-slate-955 font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer flex items-center gap-1 border-0"
                            >
                              <Save size={12} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-white truncate">{banner.title}</p>
                              <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1 py-0.2 rounded uppercase">
                                {banner.action}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{banner.subtitle}</p>
                          </div>
                          
                          {/* Super Admin operations */}
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEditBanner(banner)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer border-0"
                                title="Edit Banner"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this banner?')) deleteBanner(banner.id)
                                }}
                                className="p-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer border-0"
                                title="Delete Banner"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TECH PRODUCTS SECTION */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={14} className="text-pink-400" />
                  Tech Products Directory
                </h3>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-650 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 border-0"
                  >
                    <Plus size={12} /> Add Product
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl p-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-8 h-8 object-contain" />
                        ) : (
                          <Database size={16} className="text-slate-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white truncate">{product.title}</p>
                          {product.badge && (
                            <span className="text-[8px] font-bold bg-pink-500/10 text-pink-400 px-1 rounded-sm shrink-0">
                              {product.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          ₹{product.price.toLocaleString()} <span className="text-[9px] text-slate-500 line-through">₹{product.original?.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Delete operation for Super Admin */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this product?')) deleteProduct(product.id)
                        }}
                        className="p-1.5 bg-red-955/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer shrink-0 border-0"
                        title="Delete Product"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── TABS: WITHDRAWALS ── */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-2">
              <input
                type="text"
                value={withdrawSearch}
                onChange={(e) => {
                  setWithdrawSearch(e.target.value)
                  setWithdrawPage(1)
                }}
                placeholder="Search Withdrawal ID, Name, Phone..."
                className="flex-1 bg-slate-955/70 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
              />
              <button
                onClick={fetchWithdrawals}
                className="px-3.5 bg-slate-850 hover:bg-slate-800 text-slate-350 rounded-xl transition-colors cursor-pointer border-0 flex items-center justify-center"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Status Pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setWithdrawFilter(status)
                    setWithdrawPage(1)
                  }}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-colors cursor-pointer shrink-0 border-slate-800 ${
                    withdrawFilter === status
                      ? 'bg-slate-100 text-slate-950 border-slate-100'
                      : 'bg-slate-955 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Total Results Count */}
            <div className="text-[10px] text-slate-500 font-bold px-1 flex justify-between">
              <span>FOUND: {withdrawTotalCount} REQUESTS</span>
            </div>

            {/* Withdrawals Grid/List */}
            {withdrawals.length === 0 ? (
              <div className="bg-slate-955/20 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <Clock size={28} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-bold">No withdrawals found</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Withdrawal requests matching the criteria will list here.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Request ID & Date</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Method & Details</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {withdrawals.map((rec) => {
                        const isProcessing = withdrawProcessingId === rec.id
                        const isUpi = rec.paymentMethod === 'UPI'
                        const upiLink = isUpi
                          ? `upi://pay?pa=${rec.upiId}&pn=${encodeURIComponent(rec.userName || 'ColourPlay User')}&am=${rec.amount}&cu=INR`
                          : ''
                        return (
                          <tr key={rec.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white">{rec.userName || 'Unknown User'}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{rec.userPhone || 'No Phone'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-mono text-slate-400">{rec.withdrawalId}</div>
                              <div className="text-[10px] text-slate-500 mt-1">Created: {new Date(rec.createdAt).toLocaleString()}</div>
                              {rec.paidAt && <div className="text-[10px] text-emerald-500">Paid: {new Date(rec.paidAt).toLocaleString()}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-rose-400 font-bold">₹{parseFloat(rec.amount).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{rec.paymentMethod}</span>
                                {isUpi ? (
                                  <div className="text-[10px] text-slate-400 font-mono mt-1">{rec.upiId}</div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 space-y-0.5">
                                    <p className="truncate">Holder: {rec.accountHolderName}</p>
                                    <p className="font-mono">No: {rec.accountNumber}</p>
                                    <p className="font-mono text-[9px]">IFSC: {rec.ifscCode}</p>
                                  </div>
                                )}
                                {rec.utrNumber && (
                                  <div className="text-[9px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    UTR: {rec.utrNumber}
                                  </div>
                                )}
                                {rec.adminNote && (
                                  <div className="text-[9px] text-slate-500 bg-slate-950/40 p-1.5 rounded mt-1 max-w-[200px] leading-relaxed">
                                    <span className="font-semibold text-slate-400">Note:</span> {rec.adminNote}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                rec.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                                rec.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isSuperAdmin && (rec.status === 'PENDING' || rec.status === 'APPROVED') && (
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => {
                                      setRejectId(rec.id)
                                      setShowRejectModal(true)
                                    }}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-55"
                                  >
                                    Reject
                                  </button>
                                  {rec.status === 'PENDING' && (
                                    <button
                                      onClick={() => handleApprove(rec.id)}
                                      disabled={isProcessing}
                                      className="px-2.5 py-1.5 bg-blue-955/30 hover:bg-blue-900/40 border border-blue-900/30 text-blue-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-55"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {isUpi && (
                                    <a
                                      href={upiLink}
                                      className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-955 font-black text-[10px] rounded-lg shadow-sm hover:from-emerald-600 hover:to-teal-650 transition-colors flex items-center gap-1 cursor-pointer no-underline select-none"
                                    >
                                      Pay UPI
                                    </a>
                                  )}
                                  <button
                                    onClick={() => {
                                      setPayId(rec.id)
                                      setShowPayModal(true)
                                    }}
                                    disabled={isProcessing}
                                    className="px-2.5 py-1.5 bg-emerald-500 text-slate-955 text-[10px] font-extrabold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-55 border-0"
                                  >
                                    Mark Paid
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="lg:hidden space-y-3.5">
                  {withdrawals.map((rec) => {
                    const isProcessing = withdrawProcessingId === rec.id
                    const isUpi = rec.paymentMethod === 'UPI'
                    const upiLink = isUpi
                      ? `upi://pay?pa=${rec.upiId}&pn=${encodeURIComponent(rec.userName || 'ColourPlay User')}&am=${rec.amount}&cu=INR`
                      : ''

                    return (
                      <div 
                        key={rec.id} 
                        className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4 space-y-3.5 hover:border-slate-750 transition-colors"
                      >
                        {/* Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-white">{rec.userName || 'Unknown User'}</span>
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">{rec.withdrawalId}</span>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 font-mono">{rec.userPhone || 'No Phone'}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1 shrink-0">
                            <span className="text-sm font-black text-rose-400 font-bold">₹{parseFloat(rec.amount).toFixed(2)}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              rec.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                              rec.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                        </div>

                        {/* Info block */}
                        <div className="bg-slate-955/40 rounded-xl p-3 text-[10px] text-slate-400 space-y-2 border border-slate-850">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Method:</span>
                            <span className="font-bold text-white">{rec.paymentMethod}</span>
                          </div>
                          {isUpi ? (
                            <div className="flex justify-between">
                              <span className="text-slate-500">UPI ID:</span>
                              <span className="font-bold text-white font-mono">{rec.upiId}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Holder:</span>
                                <span className="font-bold text-white">{rec.accountHolderName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Acc No:</span>
                                <span className="font-bold text-white font-mono">{rec.accountNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">IFSC:</span>
                                <span className="font-bold text-white font-mono">{rec.ifscCode}</span>
                              </div>
                            </>
                          )}
                          {rec.utrNumber && (
                            <div className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded text-emerald-400 font-mono mt-1 font-bold">
                              <span>UTR:</span>
                              <span>{rec.utrNumber}</span>
                            </div>
                          )}
                          {rec.adminNote && (
                            <div className="bg-slate-900 rounded p-2 text-slate-450 text-[9px] leading-relaxed">
                              <span className="font-bold text-slate-500 block mb-0.5">Admin Comment:</span>
                              {rec.adminNote}
                            </div>
                          )}
                          <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-1 text-[9px] text-slate-500">
                            <span>Created: {new Date(rec.createdAt).toLocaleString()}</span>
                            {rec.paidAt && <span>Paid: {new Date(rec.paidAt).toLocaleString()}</span>}
                          </div>
                        </div>

                        {/* Admin operational actions panel */}
                        {isSuperAdmin && (rec.status === 'PENDING' || rec.status === 'APPROVED') && (
                          <div className="flex gap-2 justify-end flex-wrap">
                            {/* Reject action */}
                            <button
                              onClick={() => {
                                setRejectId(rec.id)
                                setShowRejectModal(true)
                              }}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-red-955/30 hover:bg-red-900/40 border border-red-900/30 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-55"
                            >
                              Reject
                            </button>

                            {/* Approve action (Only when PENDING) */}
                            {rec.status === 'PENDING' && (
                              <button
                                onClick={() => handleApprove(rec.id)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 bg-blue-955/30 hover:bg-blue-900/40 border border-blue-900/30 text-blue-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-55"
                              >
                                Approve
                              </button>
                            )}

                            {/* UPI "Pay Now" deep link button */}
                            {isUpi && (
                              <a
                                href={upiLink}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-955 font-black text-[10px] rounded-lg shadow-sm hover:from-emerald-600 hover:to-teal-650 transition-colors flex items-center gap-1 cursor-pointer no-underline select-none"
                              >
                                Pay Now (UPI)
                              </a>
                            )}

                            {/* Mark Paid action */}
                            <button
                              onClick={() => {
                                setPayId(rec.id)
                                setShowPayModal(true)
                              }}
                              disabled={isProcessing}
                              className="px-3 py-1.5 bg-emerald-500 text-slate-955 text-[10px] font-extrabold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer disabled:opacity-55 border-0"
                            >
                              Mark Paid
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Pagination Controls */}
            {withdrawTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={withdrawPage === 1}
                  onClick={() => setWithdrawPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-400">Page {withdrawPage} of {withdrawTotalPages}</span>
                <button
                  disabled={withdrawPage === withdrawTotalPages}
                  onClick={() => setWithdrawPage(p => Math.min(withdrawTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TABS: ORDERS ── */}
        {activeTab === 'orders' && isSuperAdmin && (
          <div className="space-y-4">
            {/* Status Filters */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {['ALL', 'pending', 'shipped', 'delivered', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setOrdersStatusFilter(status)
                    setOrdersPage(1)
                  }}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-colors cursor-pointer shrink-0 border-slate-800 ${
                    ordersStatusFilter === status
                      ? 'bg-slate-100 text-slate-950 border-slate-100'
                      : 'bg-slate-955 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-500 font-bold px-1 flex justify-between">
              <span>FOUND: {ordersTotalCount} ORDERS</span>
              <span>PAGE {ordersPage} OF {ordersTotalPages}</span>
            </div>

            {/* Orders list */}
            {ordersList.length === 0 ? (
              <div className="bg-slate-955/20 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <ShoppingBag size={28} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-bold">No orders found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Product Details</th>
                        <th className="px-6 py-4">Purchased By</th>
                        <th className="px-6 py-4">Shipping Info</th>
                        <th className="px-6 py-4">Dates</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {ordersList.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{ord.productTitle}</div>
                            <div className="text-[10px] text-slate-400 mt-1">Qty: {ord.quantity} · Total: <span className="text-indigo-400 font-bold">₹{parseFloat(ord.totalPrice).toFixed(2)}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{ord.userName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ord.userPhone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5 text-[10px] text-slate-400">
                              <p className="font-bold text-slate-350">{ord.shippingName} ({ord.shippingPhone})</p>
                              <p>{ord.addressLine1} {ord.addressLine2 ? `, ${ord.addressLine2}` : ''}</p>
                              <p>{ord.city}, {ord.state} - {ord.pinCode}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] text-slate-500 space-y-1">
                              <p>Ordered: {new Date(ord.purchaseDate).toLocaleString()}</p>
                              {ord.deliveredAt && <p className="text-emerald-500">Delivered: {new Date(ord.deliveredAt).toLocaleString()}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              ord.orderStatus === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              ord.orderStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                              ord.orderStatus === 'shipped' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {ord.orderStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {updatingOrderId === ord.id ? (
                              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : (
                              ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' && (
                                <div className="flex gap-1.5 justify-end">
                                  {ord.orderStatus === 'pending' && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(ord.id, 'shipped')}
                                      className="px-2.5 py-1.5 bg-blue-650 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0"
                                    >
                                      Shipped
                                    </button>
                                  )}
                                  {ord.orderStatus === 'shipped' && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-955 text-[10px] font-bold rounded-lg cursor-pointer border-0"
                                    >
                                      Delivered
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled')}
                                    className="px-2.5 py-1.5 bg-red-955/30 hover:bg-red-900/40 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer border-0"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="lg:hidden space-y-3.5">
                  {ordersList.map((ord) => (
                    <div key={ord.id} className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-750 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-black text-white">{ord.productTitle}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Qty: {ord.quantity} · Total: <span className="text-indigo-400 font-bold">₹{parseFloat(ord.totalPrice).toFixed(2)}</span></p>
                          <p className="text-[9px] text-slate-550 font-mono mt-1">Purchased by: {ord.userName} ({ord.userPhone})</p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          ord.orderStatus === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          ord.orderStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                          ord.orderStatus === 'shipped' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {ord.orderStatus}
                        </span>
                      </div>

                      {/* Shipping Address details */}
                      <div className="bg-slate-905/40 rounded-xl p-3 text-[10px] text-slate-400 space-y-1 border border-slate-850">
                        <p className="font-bold text-white text-[9px] uppercase text-slate-500 mb-1">Shipping Details</p>
                        <p><span className="text-slate-500">Name:</span> {ord.shippingName} ({ord.shippingPhone})</p>
                        <p><span className="text-slate-500">Address:</span> {ord.addressLine1} {ord.addressLine2 ? `, ${ord.addressLine2}` : ''}</p>
                        <p><span className="text-slate-500">City/State/Pin:</span> {ord.city}, {ord.state} - {ord.pinCode}</p>
                        <p className="text-[9px] text-slate-500 pt-1.5 border-t border-slate-900 mt-1 flex justify-between">
                          <span>Ordered: {new Date(ord.purchaseDate).toLocaleString()}</span>
                          {ord.deliveredAt && <span>Delivered: {new Date(ord.deliveredAt).toLocaleString()}</span>}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {updatingOrderId === ord.id ? (
                        <div className="text-center py-1.5">
                          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
                        </div>
                      ) : (
                        ord.orderStatus !== 'delivered' && ord.orderStatus !== 'cancelled' && (
                          <div className="flex gap-2 justify-end">
                            {ord.orderStatus === 'pending' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'shipped')}
                                className="px-2.5 py-1.5 bg-blue-650 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0"
                              >
                                Mark Shipped
                              </button>
                            )}
                            {ord.orderStatus === 'shipped' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-955 text-[10px] font-bold rounded-lg cursor-pointer border-0"
                              >
                                Mark Delivered
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled')}
                              className="px-2.5 py-1.5 bg-red-955/30 hover:bg-red-900/40 text-red-400 text-[10px] font-bold rounded-lg cursor-pointer border-0"
                            >
                              Cancel Order
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {ordersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={ordersPage === 1}
                  onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-400">Page {ordersPage} of {ordersTotalPages}</span>
                <button
                  disabled={ordersPage === ordersTotalPages}
                  onClick={() => setOrdersPage(p => Math.min(ordersTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-350 cursor-pointer border-0"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TABS: SUPPORT TICKETS ── */}
        {activeTab === 'support' && isSuperAdmin && (
          <div className="space-y-4">
            {/* Status filter pills */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {['ALL', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setComplaintsStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-colors cursor-pointer shrink-0 border-slate-800 ${
                    complaintsStatusFilter === status
                      ? 'bg-slate-100 text-slate-950 border-slate-100'
                      : 'bg-slate-955 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Complaints list */}
            {complaintsList.length === 0 ? (
              <div className="bg-slate-955/20 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                <AlertTriangle size={28} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs font-bold">No complaints found</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Ticket Details</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Issue Description</th>
                        <th className="px-6 py-4">Status & Priority</th>
                        <th className="px-6 py-4">Staff Assignment</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {complaintsList.map((complaint) => (
                        <tr key={complaint.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{complaint.subject}</div>
                            <div className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-wider">{complaint.complaintType}</div>
                            <div className="text-[9px] text-slate-500 mt-1">ID: {complaint.id}</div>
                            <div className="text-[9px] text-slate-500">Created: {new Date(complaint.createdAt).toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{complaint.userName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{complaint.userPhone}</div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">{complaint.description}</p>
                            {complaint.imageUrl && (
                              <div className="relative mt-2 w-14 h-14 border border-slate-850 rounded-lg overflow-hidden bg-slate-955 flex items-center justify-center shrink-0">
                                <img src={complaint.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                                <a href={complaint.imageUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-955/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[8px] font-bold text-white transition-opacity no-underline">
                                  Open
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 space-y-1.5">
                            <div>
                              <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                complaint.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                complaint.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                                complaint.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                'bg-slate-800 text-slate-500 border-slate-750'
                              }`}>
                                {complaint.status}
                              </span>
                            </div>
                            <div>
                              <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                complaint.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                complaint.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-800 text-slate-400 border-slate-750'
                              }`}>
                                {complaint.priority}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] text-slate-400">
                              <p><span className="text-slate-500">Admin:</span> {complaint.adminName || 'Unassigned'}</p>
                              {complaint.resolutionNotes && (
                                <div className="mt-1 bg-slate-950/40 p-1.5 rounded text-slate-400 text-[9px] leading-relaxed max-w-[200px]">
                                  <span className="font-bold text-slate-500 block">Resolution Note:</span>
                                  {complaint.resolutionNotes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedComplaint(complaint)
                                setComplaintStatusUpdate(complaint.status)
                                setResolutionNotes(complaint.resolutionNotes || '')
                                setAssignedAdminUpdate(String(user.id)) 
                              }}
                              className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1 inline-flex"
                            >
                              <Settings size={11} /> Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="lg:hidden space-y-3.5">
                  {complaintsList.map((complaint) => (
                    <div key={complaint.id} className="bg-slate-955/30 border border-slate-805 rounded-2xl p-4 space-y-3 hover:border-slate-750 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white">{complaint.subject}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                              complaint.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              complaint.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {complaint.priority}
                            </span>
                          </div>
                          <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-wider">{complaint.complaintType}</p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          complaint.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          complaint.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                          complaint.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-800 text-slate-500 border-slate-750'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-350 leading-relaxed bg-slate-950/20 p-2.5 rounded-lg border border-slate-900">{complaint.description}</p>

                      {complaint.imageUrl && (
                        <div className="relative w-28 h-28 border border-slate-850 rounded-lg overflow-hidden bg-slate-955">
                          <img src={complaint.imageUrl} alt="Complaint Attachment" className="w-full h-full object-cover" />
                          <a href={complaint.imageUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-955/60 opacity-0 hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity no-underline">
                            View Full
                          </a>
                        </div>
                      )}

                      <div className="bg-slate-955/40 rounded-xl p-3 text-[10px] text-slate-400 space-y-1.5 border border-slate-850">
                        <p><span className="text-slate-500">Submitted by:</span> {complaint.userName} ({complaint.userPhone})</p>
                        <p><span className="text-slate-500">Assigned Admin:</span> {complaint.adminName || 'Unassigned'}</p>
                        {complaint.resolutionNotes && (
                          <div className="mt-1 bg-slate-900 p-2 rounded text-slate-400 text-[9px] leading-relaxed">
                            <span className="font-bold text-slate-505 block mb-0.5">Resolution Notes:</span>
                            {complaint.resolutionNotes}
                          </div>
                        )}
                        <p className="text-[9px] text-slate-550 pt-1.5 border-t border-slate-900 mt-1">Created: {new Date(complaint.createdAt).toLocaleString()}</p>
                      </div>

                      {/* Manage ticket button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint)
                            setComplaintStatusUpdate(complaint.status)
                            setResolutionNotes(complaint.resolutionNotes || '')
                            setAssignedAdminUpdate(String(user.id)) 
                          }}
                          className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1"
                        >
                          <Settings size={11} /> Manage Ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TABS: PROMOTIONS ── */}
        {activeTab === 'promotions' && isSuperAdmin && (
          <div className="space-y-6">
            
            {/* Create Coupon Card */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Plus size={14} className="text-emerald-400" />
                Create Gift Voucher Coupon
              </h3>

              <form onSubmit={handleCreateCouponSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Coupon Code*</label>
                    <input
                      type="text"
                      required
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="e.g. EXTRA50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Discount Type*</label>
                    <select
                      value={newCouponDiscountType}
                      onChange={(e) => setNewCouponDiscountType(e.target.value)}
                      className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                    >
                      <option value="flat">Flat Cash (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Value*</label>
                    <input
                      type="number"
                      required
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      placeholder="50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Min. Deposit</label>
                    <input
                      type="number"
                      value={newCouponMinDeposit}
                      onChange={(e) => setNewCouponMinDeposit(e.target.value)}
                      placeholder="100"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Max Uses</label>
                    <input
                      type="number"
                      value={newCouponMaxUses}
                      onChange={(e) => setNewCouponMaxUses(e.target.value)}
                      placeholder="1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Expiry Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newCouponExpiresAt}
                    onChange={(e) => setNewCouponExpiresAt(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={creatingCoupon}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black rounded-xl cursor-pointer disabled:opacity-50 border-0"
                  >
                    {creatingCoupon ? 'Creating...' : 'Create Coupon'}
                  </button>
                </div>
              </form>
            </div>

            {/* Coupons List */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Tag size={14} className="text-indigo-400" />
                Active Deposit Vouchers
              </h3>

              {couponsList.length === 0 ? (
                <p className="text-slate-500 text-center py-6 text-xs">No active coupons</p>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4">Coupon Code</th>
                          <th className="px-6 py-4">Discount Value</th>
                          <th className="px-6 py-4">Min. Deposit</th>
                          <th className="px-6 py-4">Usage Limit</th>
                          <th className="px-6 py-4">Expiry Date</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-xs">
                        {couponsList.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-white">{c.code}</td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded uppercase">
                                {c.discountType === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-300">₹{parseFloat(c.minDeposit).toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-400 font-semibold">
                              Used: <span className="text-white font-bold">{c.usedCount || 0}</span> / {c.maxUses}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {c.expiresAt ? new Date(c.expiresAt).toLocaleString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleDeleteCoupon(c.id)}
                                className="p-1.5 bg-red-955/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer border-0"
                                title="Delete Coupon"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards List View */}
                  <div className="lg:hidden space-y-3">
                    {couponsList.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl p-3 gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white font-mono">{c.code}</span>
                            <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded uppercase">
                              {c.discountType === 'percentage' ? `${c.value}%` : `₹${c.value}`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Min Deposit: ₹{parseFloat(c.minDeposit).toFixed(2)} · Used: {c.usedCount || 0} / {c.maxUses}
                          </p>
                          {c.expiresAt && (
                            <p className="text-[9px] text-slate-500 mt-0.5">Expires: {new Date(c.expiresAt).toLocaleString()}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1.5 bg-red-955/30 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors cursor-pointer border-0"
                          title="Delete Coupon"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}

        {/* ── TABS: SPIN & GAME CONTROLS ── */}
        {activeTab === 'game-controls' && isSuperAdmin && (
          <div className="space-y-6">
            
            {/* Game Engines Status */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Gamepad2 size={14} className="text-indigo-400" />
                Dynamic Games Enable/Disable
              </h3>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Game Engine Name</th>
                      <th className="px-6 py-4">Engine ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {gamesList.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-white uppercase tracking-wider">{g.name.replace('_', ' ')}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{g.id}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            g.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {g.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleGameStatus(g.id, g.isActive)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer border-0 ${
                              g.isActive
                                ? 'bg-red-955/30 hover:bg-red-900/40 text-red-400'
                                : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400'
                            }`}
                          >
                            {g.isActive ? 'Disable Engine' : 'Enable Engine'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards List View */}
              <div className="lg:hidden space-y-3">
                {gamesList.map((g) => (
                  <div key={g.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">{g.name.replace('_', ' ')}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Engine ID: {g.id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                        g.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {g.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <button
                        onClick={() => handleToggleGameStatus(g.id, g.isActive)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer border-0 ${
                          g.isActive
                            ? 'bg-red-955/30 hover:bg-red-900/40 text-red-400'
                            : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400'
                        }`}
                      >
                        {g.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lucky Spin Configurations */}
            <div className="bg-slate-955/30 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Settings size={14} className="text-pink-400" />
                Lucky Spin Wheel Prizes
              </h3>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-805 bg-slate-950/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Prize Segment Name</th>
                      <th className="px-6 py-4">Prize Value</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Odds Weight</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {spinConfigsList.map((prize) => {
                      const isConfigEditing = updatingSpinConfigId === prize.id
                      return isConfigEditing ? (
                        <tr key={prize.id} className="bg-slate-900/60">
                          <td className="px-6 py-4 font-bold text-white">{prize.prizeName}</td>
                          <td colSpan={5} className="px-6 py-4">
                            <form onSubmit={handleUpdateSpinConfigSubmit} className="flex flex-wrap items-end gap-4">
                              <div className="w-28">
                                <label className="text-[9px] font-bold text-slate-505 uppercase block mb-1">Weight (0-10000)*</label>
                                <input
                                  type="number"
                                  required
                                  value={spinConfigWeight}
                                  onChange={(e) => setSpinConfigWeight(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
                                />
                              </div>
                              <div className="w-28">
                                <label className="text-[9px] font-bold text-slate-505 uppercase block mb-1">Value (₹)*</label>
                                <input
                                  type="number"
                                  required
                                  value={spinConfigValue}
                                  onChange={(e) => setSpinConfigValue(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-700"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 pb-2">
                                <input
                                  type="checkbox"
                                  id={`active-desk-${prize.id}`}
                                  checked={spinConfigIsActive}
                                  onChange={(e) => setSpinConfigIsActive(e.target.checked)}
                                  className="bg-slate-950 border-slate-800 rounded text-indigo-500 focus:ring-0"
                                />
                                <label htmlFor={`active-desk-${prize.id}`} className="text-xs text-slate-350 select-none">Available</label>
                              </div>
                              <div className="flex gap-1.5 pb-1">
                                <button
                                  type="button"
                                  onClick={() => setUpdatingSpinConfigId(null)}
                                  className="px-2.5 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 transition-colors border-0 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1.5 bg-emerald-500 text-slate-955 font-bold rounded-lg hover:bg-emerald-650 transition-colors border-0 cursor-pointer"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : (
                        <tr key={prize.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{prize.prizeName}</td>
                          <td className="px-6 py-4 text-white font-bold">₹{parseFloat(prize.value).toFixed(2)}</td>
                          <td className="px-6 py-4 text-slate-400 capitalize">{prize.type}</td>
                          <td className="px-6 py-4 text-slate-400">{prize.weight}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                              prize.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {prize.isActive ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setUpdatingSpinConfigId(prize.id)
                                setSpinConfigWeight(String(prize.weight))
                                setSpinConfigValue(String(prize.value))
                                setSpinConfigIsActive(Boolean(prize.isActive))
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors border-0 cursor-pointer inline-flex"
                              title="Edit config"
                            >
                              <Edit2 size={12} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards List View */}
              <div className="lg:hidden space-y-3">
                {spinConfigsList.map((prize) => {
                  const isConfigEditing = updatingSpinConfigId === prize.id
                  return (
                    <div key={prize.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                      {isConfigEditing ? (
                        <form onSubmit={handleUpdateSpinConfigSubmit} className="space-y-3">
                          <p className="text-xs font-bold text-white">Editing Segment: {prize.prizeName}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-slate-505 uppercase block mb-1">Weight (0-10000)*</label>
                              <input
                                type="number"
                                required
                                value={spinConfigWeight}
                                onChange={(e) => setSpinConfigWeight(e.target.value)}
                                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-505 uppercase block mb-1">Prize Value (Cash/Bonus)*</label>
                              <input
                                type="number"
                                required
                                value={spinConfigValue}
                                onChange={(e) => setSpinConfigValue(e.target.value)}
                                className="w-full bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`active-${prize.id}`}
                              checked={spinConfigIsActive}
                              onChange={(e) => setSpinConfigIsActive(e.target.checked)}
                              className="bg-slate-955 border-slate-800 rounded text-indigo-500 focus:ring-0"
                            />
                            <label htmlFor={`active-${prize.id}`} className="text-xs text-slate-350">Prize Available in Wheel</label>
                          </div>

                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setUpdatingSpinConfigId(null)}
                              className="px-2.5 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 transition-colors border-0 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2.5 py-1.5 bg-emerald-500 text-slate-955 font-bold rounded-lg hover:bg-emerald-600 transition-colors border-0 cursor-pointer"
                            >
                              Save Config
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center gap-3">
                          <div>
                            <p className="text-xs font-bold text-white">{prize.prizeName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Value: ₹{parseFloat(prize.value).toFixed(2)} · Type: {prize.type} · Weight: {prize.weight}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${
                              prize.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>
                              {prize.isActive ? 'Active' : 'Disabled'}
                            </span>
                            <button
                              onClick={() => {
                                setUpdatingSpinConfigId(prize.id)
                                setSpinConfigWeight(String(prize.weight))
                                setSpinConfigValue(String(prize.value))
                                setSpinConfigIsActive(Boolean(prize.isActive))
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors border-0 cursor-pointer"
                              title="Edit config"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── SUPER ADMIN: REJECT WITHDRAWAL MODAL ── */}
      {showRejectModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Reject Withdrawal</h3>
              <button 
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectId(null)
                  setRejectNote('')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-4 space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Reason/Admin Note*</label>
                <textarea
                  required
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Provide reason for rejection (will be shown to user)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 h-24 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectId(null)
                    setRejectNote('')
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN: MARK PAID WITHDRAWAL MODAL ── */}
      {showPayModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Record Payout Transaction</h3>
              <button 
                onClick={() => {
                  setShowPayModal(false)
                  setPayId(null)
                  setPayUtr('')
                  setPayNote('')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="p-4 space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">UTR / Ref Number*</label>
                <input
                  type="text"
                  required
                  value={payUtr}
                  onChange={(e) => setPayUtr(e.target.value)}
                  placeholder="Enter 12-digit UTR/TXN Ref ID..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Admin Note (Optional)</label>
                <textarea
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Add payment processing comment..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false)
                    setPayId(null)
                    setPayUtr('')
                    setPayNote('')
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition-colors cursor-pointer border-0"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN: BALANCE ADJUSTMENT MODAL ── */}
      {showBalanceModal && isSuperAdmin && balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Adjust User Balance</h3>
              <button 
                onClick={() => {
                  setShowBalanceModal(false)
                  setBalanceModalUser(null)
                  setBalanceAmount('')
                  setBalanceDescription('')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustBalanceSubmit} className="p-4 space-y-3.5">
              <div>
                <p className="text-xs text-slate-400">User: <span className="font-bold text-white">{balanceModalUser.name}</span></p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Phone: {balanceModalUser.phone}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Adjustment Type*</label>
                <select
                  value={balanceType}
                  onChange={(e) => setBalanceType(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750"
                >
                  <option value="real">Real Balance (Adjust with +/-)</option>
                  <option value="bonus">Bonus Balance (Adjust with +/-)</option>
                  <option value="wagering">Wagering Requirement (Adjust with +/-)</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Amount (Use minus for deduction)*</label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="e.g. 500 or -250"
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Audit/Transaction Notes*</label>
                <textarea
                  required
                  value={balanceDescription}
                  onChange={(e) => setBalanceDescription(e.target.value)}
                  placeholder="Reason for adjustment (will be logged in ledger)..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBalanceModal(false)
                    setBalanceModalUser(null)
                    setBalanceAmount('')
                    setBalanceDescription('')
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingBalance}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors border-0 cursor-pointer"
                >
                  {adjustingBalance ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN: USER AUDIT LOGS MODAL ── */}
      {selectedUserForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955 shrink-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">User History & Audit Trail</h3>
              <button 
                onClick={() => {
                  setSelectedUserForAudit(null)
                  setSelectedUserHistory({ bets: [], transactions: [] })
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-905 border-b border-slate-850 shrink-0 text-xs">
              <p className="font-bold text-white">{selectedUserForAudit.name} ({selectedUserForAudit.phone})</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {selectedUserForAudit.uid} | Email: {selectedUserForAudit.email || 'No Email'}</p>
            </div>

            {loadingUserHistory ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
                {/* Balance & stats summaries */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Ledger Activity Log (Recent 50)</h4>
                  <div className="bg-slate-955/40 border border-slate-850 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 font-mono text-[9px] leading-relaxed">
                      {selectedUserHistory.transactions?.length === 0 ? (
                        <p className="text-slate-600 text-center py-4">No transactions found</p>
                      ) : (
                        selectedUserHistory.transactions?.map((t) => (
                          <div key={t.id} className="flex justify-between items-start border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
                            <div>
                              <span className="text-slate-500">[{new Date(t.createdAt).toLocaleTimeString()}]</span>{' '}
                              <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.amount >= 0 ? '+' : ''}₹{parseFloat(t.amount).toFixed(2)}
                              </span>{' '}
                              <span className="text-slate-400">({t.type})</span>
                              <p className="text-slate-500 text-[8px] mt-0.5">{t.description}</p>
                            </div>
                            <span className="text-slate-500 text-right">
                              Bal: ₹{parseFloat(t.runningBalance || t.balanceAfter).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bets list */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-505 uppercase tracking-wider mb-2">Wager Records (Recent 50)</h4>
                  <div className="bg-slate-955/40 border border-slate-850 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 font-mono text-[9px] leading-relaxed">
                      {selectedUserHistory.bets?.length === 0 ? (
                        <p className="text-slate-600 text-center py-4">No bets placed</p>
                      ) : (
                        selectedUserHistory.bets?.map((b) => (
                          <div key={b.id} className="flex justify-between items-start border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
                            <div>
                              <span className="text-slate-500">[{new Date(b.createdAt).toLocaleTimeString()}]</span>{' '}
                              <span className="text-indigo-400 font-bold">₹{parseFloat(b.betAmount).toFixed(2)}</span>{' '}
                              <span className="text-slate-400">on {b.gameName} ({b.betValue})</span>
                              <p className="text-slate-500 text-[8px] mt-0.5">Round: {b.roundId}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`font-black uppercase ${
                                b.status === 'won' ? 'text-emerald-400' :
                                b.status === 'lost' ? 'text-slate-550' :
                                'text-amber-500 animate-pulse'
                              }`}>
                                {b.status === 'won' ? `Won ₹${parseFloat(b.payoutAmount).toFixed(2)}` : b.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end p-4 border-t border-slate-800 bg-slate-955 shrink-0">
              <button
                onClick={() => {
                  setSelectedUserForAudit(null)
                  setSelectedUserHistory({ bets: [], transactions: [] })
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors border-0 cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN: RESOLVE COMPLAINT TICKET MODAL ── */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Manage Support Ticket</h3>
              <button 
                onClick={() => {
                  setSelectedComplaint(null)
                  setResolutionNotes('')
                  setComplaintStatusUpdate('open')
                  setAssignedAdminUpdate('')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateComplaintSubmit} className="p-4 space-y-3.5">
              <div>
                <p className="text-xs font-bold text-white">Subject: {selectedComplaint.subject}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{selectedComplaint.description}</p>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Ticket Status*</label>
                <select
                  value={complaintStatusUpdate}
                  onChange={(e) => setComplaintStatusUpdate(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Assign Admin (Your ID)*</label>
                <input
                  type="text"
                  required
                  value={assignedAdminUpdate}
                  onChange={(e) => setAssignedAdminUpdate(e.target.value)}
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 font-mono"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Resolution Notes*</label>
                <textarea
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Provide resolution details for this support ticket..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-750 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComplaint(null)
                    setResolutionNotes('')
                    setComplaintStatusUpdate('open')
                    setAssignedAdminUpdate('')
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingComplaintId === selectedComplaint.id}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors border-0 cursor-pointer"
                >
                  {updatingComplaintId === selectedComplaint.id ? 'Updating...' : 'Update Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddProductModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Tech Product</h3>
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Title*</label>
                <input
                  type="text"
                  required
                  value={newProductTitle}
                  onChange={(e) => setNewProductTitle(e.target.value)}
                  placeholder="e.g. AuraPods Max"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Price (₹)*</label>
                  <input
                    type="number"
                    required
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="e.g. 1999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={newProductOriginal}
                    onChange={(e) => setNewProductOriginal(e.target.value)}
                    placeholder="e.g. 2999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Offer Badge Tag</label>
                  <input
                    type="text"
                    value={newProductBadge}
                    onChange={(e) => setNewProductBadge(e.target.value)}
                    placeholder="e.g. 30% OFF"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Description</label>
                <textarea
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Provide specifications, features, battery life details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-650 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── COMMAND PALETTE MODAL ── */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col">
            {/* Header / Search Input */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Shield size={16} className="text-indigo-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Type a command or search panel..."
                value={commandPaletteSearch}
                onChange={(e) => setCommandPaletteSearch(e.target.value)}
                className="w-full bg-transparent border-0 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none"
              />
              <button 
                onClick={() => {
                  setShowCommandPalette(false)
                  setCommandPaletteSearch('')
                }}
                className="text-slate-550 hover:text-slate-350 cursor-pointer border-0 bg-transparent"
              >
                <X size={16} />
              </button>
            </div>

            {/* Commands List */}
            <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-850">
              {/* Filtered Navigation Commands */}
              {[
                { label: 'Go to Overview Dashboard', action: () => setActiveTab('overview'), icon: Activity, clearance: 'all' },
                { label: 'Go to Users & Audits Console', action: () => setActiveTab('users'), icon: Users, clearance: 'super_admin' },
                { label: 'Go to Withdrawal Requests Queue', action: () => setActiveTab('withdrawals'), icon: Clock, clearance: 'all' },
                { label: 'Go to Product Orders Ledger', action: () => setActiveTab('orders'), icon: ShoppingBag, clearance: 'super_admin' },
                { label: 'Go to Support Complaints Desk', action: () => setActiveTab('support'), icon: AlertTriangle, clearance: 'super_admin' },
                { label: 'Go to Coupons & Promotions Panel', action: () => setActiveTab('promotions'), icon: Tag, clearance: 'super_admin' },
                { label: 'Go to Live Game Controls', action: () => setActiveTab('game-controls'), icon: Gamepad2, clearance: 'super_admin' },
                { label: 'Go to Logs Console', action: () => setActiveTab('logs'), icon: Database, clearance: 'all' },
                { label: 'Go to Store Configuration Settings', action: () => setActiveTab('config'), icon: Settings, clearance: 'all' },
                { 
                  label: 'Force Outcome Override (Live Colour Prediction)', 
                  action: () => {
                    setActiveTab('overview');
                    setTimeout(() => {
                      const el = document.getElementById('colourNumberInput');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }, 
                  icon: AlertCircle, 
                  clearance: 'super_admin' 
                },
                { 
                  label: 'Force Outcome Override (Live Dice Game Pro)', 
                  action: () => {
                    setActiveTab('overview');
                    setTimeout(() => {
                      const el = document.getElementById('diceOverrideInput');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }, 
                  icon: AlertCircle, 
                  clearance: 'super_admin' 
                }
              ]
              .filter(cmd => {
                if (cmd.clearance === 'super_admin' && !isSuperAdmin) return false;
                return cmd.label.toLowerCase().includes(commandPaletteSearch.toLowerCase());
              })
              .map((cmd, i) => {
                const CmdIcon = cmd.icon
                return (
                  <button
                    key={i}
                    onClick={() => {
                      cmd.action()
                      setShowCommandPalette(false)
                      setCommandPaletteSearch('')
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 rounded-lg flex items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer border-0 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <CmdIcon size={13} className="text-slate-405" />
                      <span>{cmd.label}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Press Enter</span>
                  </button>
                )
              })}
            </div>
            
            {/* Shortcut hints footer */}
            <div className="bg-slate-955/40 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 font-bold font-mono tracking-wider">
              <span>↑↓ to navigate</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
