import { useState, useEffect, useRef } from 'react'
import { translateError } from '../utils/errorTranslator'
import { useUser } from '../context/UserContext'
import { ArrowLeft, ExternalLink, CheckCircle, Clock, Shield, AlertCircle, RefreshCw, Loader2, CreditCard } from 'lucide-react'

export default function DepositGateway({ depositData, onBack, onNavigate }) {
  const { fetchUserHistory } = useUser()
  const [paymentUrl, setPaymentUrl] = useState(null)
  const [orderInfo, setOrderInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gatewayOpened, setGatewayOpened] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [depositStatus, setDepositStatus] = useState(null) // 'pending' | 'completed' | 'failed'
  const [retryCount, setRetryCount] = useState(0)
  const pollTimerRef = useRef(null)
  const windowRef = useRef(null)

  const amount = depositData?.amount || 0
  const voucher = depositData?.voucher || null

  // ── Create Pay0 Order on Mount ──
  useEffect(() => {
    let active = true
    const createOrder = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token') || ''
        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
        const res = await fetch(`${API_BASE}/api/payment/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount })
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Server returned ${res.status}`)
        }
        const data = await res.json()
        if (active && data.success && data.payment_url) {
          setPaymentUrl(data.payment_url)
          setOrderInfo({ orderId: data.orderId, amount: data.amount })
          setDepositStatus('pending')
          setLoading(false)
          // Auto-open gateway in new tab
          const win = window.open(data.payment_url, '_blank')
          windowRef.current = win
          if (win) {
            setGatewayOpened(true)
          }
        } else {
          throw new Error(data.error || data.message || 'Failed to create payment order')
        }
      } catch (err) {
        if (active) {
          setError(translateError(err.message))
          setLoading(false)
        }
      }
    }
    createOrder()
    return () => { active = false }
  }, [amount, retryCount])

  // ── Auto-poll deposit status every 10 seconds ──
  useEffect(() => {
    if (!orderInfo?.orderId || depositStatus === 'completed') return
    
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token') || ''
        const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
        const res = await fetch(`${API_BASE}/api/payment/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const records = await res.json()
          const found = records.find(r => r.transactionId === orderInfo.orderId)
          if (found && found.status === 'completed') {
            setDepositStatus('completed')
            fetchUserHistory?.()
          }
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }

    // Initial check after 5 seconds
    const initialTimer = setTimeout(checkStatus, 5000)
    // Then poll every 10 seconds
    pollTimerRef.current = setInterval(checkStatus, 10000)

    return () => {
      clearTimeout(initialTimer)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [orderInfo?.orderId, depositStatus])

  // ── Manual Status Check ──
  const handleCheckStatus = async () => {
    if (checkingStatus) return
    setCheckingStatus(true)
    try {
      const token = localStorage.getItem('token') || ''
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const res = await fetch(`${API_BASE}/api/payment/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const records = await res.json()
        const found = records.find(r => r.transactionId === orderInfo?.orderId)
        if (found && found.status === 'completed') {
          setDepositStatus('completed')
          fetchUserHistory?.()
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setTimeout(() => setCheckingStatus(false), 1500)
    }
  }

  const handleOpenGateway = () => {
    if (paymentUrl) {
      const win = window.open(paymentUrl, '_blank')
      windowRef.current = win
      if (win) setGatewayOpened(true)
    }
  }

  // ── Loading State ──
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <CreditCard size={24} color="white" />
        </div>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(99,102,241,0.15)',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', marginBottom: 16
        }} />
        <p style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>Creating secure payment session...</p>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Connecting to payment gateway</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.05) } }
        `}</style>
      </div>
    )
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6 text-center">
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, boxShadow: '0 4px 16px rgba(239,68,68,0.1)'
        }}>
          <AlertCircle size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Payment Session Failed</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 280, lineHeight: 1.6 }}>{error}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px', background: '#f1f5f9', color: '#475569',
              fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Go Back
          </button>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{
              padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 12,
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.2s'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Success / Completed State ──
  if (depositStatus === 'completed') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center px-6">
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, boxShadow: '0 8px 32px rgba(34,197,94,0.2)',
          animation: 'scaleIn 0.4s ease-out'
        }}>
          <CheckCircle size={40} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>Payment Successful!</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 1.6, maxWidth: 300 }}>
          Your deposit of <span style={{ fontWeight: 700, color: '#1e293b' }}>₹{amount.toLocaleString()}</span> has been
          verified and credited to your wallet.
        </p>
        {voucher && (
          <div style={{
            marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0',
            padding: '6px 14px', borderRadius: 10
          }}>
            <p style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>🎟️ Voucher "{typeof voucher === 'object' ? voucher.title : voucher}" applied!</p>
          </div>
        )}
        <button
          onClick={() => { fetchUserHistory?.(); onBack() }}
          style={{
            marginTop: 28, padding: '14px 32px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', fontWeight: 700, fontSize: 14, borderRadius: 14,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
            transition: 'all 0.2s'
          }}
        >
          Back to Wallet
        </button>
        <style>{`
          @keyframes scaleIn { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        `}</style>
      </div>
    )
  }

  // ── Main: Gateway Opened / Waiting for Payment ──
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0', padding: '16px',
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', border: 'none', transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} color="#475569" />
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Complete Deposit</h1>
      </header>

      <div style={{ padding: '20px 16px', flex: 1 }}>
        {/* Amount Card */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #8b5cf6 100%)',
          borderRadius: 20, padding: 24, color: 'white', position: 'relative',
          overflow: 'hidden', marginBottom: 20,
          boxShadow: '0 8px 32px rgba(99,102,241,0.3)'
        }}>
          <div style={{ position: 'absolute', top: -32, right: -32, width: 96, height: 96, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -24, left: -24, width: 80, height: 80, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>Deposit Amount</p>
            <p style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>₹{amount.toLocaleString()}</p>
            {orderInfo && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, fontFamily: 'monospace' }}>
                Order: {orderInfo.orderId}
              </p>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 24,
          border: '1px solid #e2e8f0', marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          textAlign: 'center'
        }}>
          {/* Animated waiting indicator */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', position: 'relative'
          }}>
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              border: '2px solid transparent', borderTopColor: '#6366f1',
              animation: 'spin 2s linear infinite'
            }} />
            <Clock size={24} color="#6366f1" />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
            {gatewayOpened ? 'Complete Payment in New Tab' : 'Payment Gateway Ready'}
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
            {gatewayOpened
              ? 'A new tab has been opened with the payment gateway. Complete your payment there.'
              : 'Click the button below to open the payment gateway and complete your deposit.'
            }
          </p>

          {/* Open Gateway / Re-open Button */}
          <button
            onClick={handleOpenGateway}
            style={{
              marginTop: 20, padding: '14px 28px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, fontSize: 13, borderRadius: 12,
              border: 'none', cursor: 'pointer', display: 'inline-flex',
              alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.2s'
            }}
          >
            <ExternalLink size={16} />
            {gatewayOpened ? 'Re-open Payment Page' : 'Open Payment Gateway'}
          </button>

          {gatewayOpened && (
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
              If the tab was blocked by your browser, click the button above to open it manually.
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 12, padding: 14, marginBottom: 16
        }}>
          <Shield size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 2 }}>Secure Payment</p>
            <p style={{ fontSize: 11, color: '#2563eb', lineHeight: 1.5 }}>
              Your payment is processed securely via our payment partner. Your wallet will be credited automatically once payment is confirmed.
            </p>
          </div>
        </div>

        {/* Auto-settlement notice */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 12, padding: 14, marginBottom: 16
        }}>
          <CheckCircle size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#15803d', marginBottom: 2 }}>Auto-Settlement</p>
            <p style={{ fontSize: 11, color: '#16a34a', lineHeight: 1.5 }}>
              Once you complete payment on the gateway, your wallet balance will be credited automatically within 1-2 minutes. No manual verification needed.
            </p>
          </div>
        </div>

        {/* Check Status Button */}
        <button
          onClick={handleCheckStatus}
          disabled={checkingStatus}
          style={{
            width: '100%', padding: '14px', marginTop: 4,
            background: checkingStatus ? '#f1f5f9' : 'white',
            color: checkingStatus ? '#94a3b8' : '#475569',
            fontWeight: 700, fontSize: 13, borderRadius: 12,
            border: '1px solid #e2e8f0', cursor: checkingStatus ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s'
          }}
        >
          {checkingStatus ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              I Have Paid — Check Status
            </>
          )}
        </button>

        <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          Status is checked automatically every 10 seconds. You can also manually check above.
        </p>

        {/* Support helper */}
        <div style={{
          marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontSize: 12, color: '#64748b',
          background: 'white', border: '1px solid #e2e8f0',
          borderRadius: 16, padding: 12
        }}>
          <AlertCircle size={14} color="#6366f1" style={{ flexShrink: 0 }} />
          <span>Need help?</span>
          <button
            type="button"
            onClick={() => onNavigate?.('support')}
            style={{
              color: '#6366f1', fontWeight: 700, cursor: 'pointer',
              background: 'transparent', border: 'none', padding: 0,
              fontSize: 12, textDecoration: 'none'
            }}
          >
            Chat with Support
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
