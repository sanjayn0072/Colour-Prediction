import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Phone, Lock, Eye, EyeOff, KeyRound, ShieldCheck, Send } from 'lucide-react'
import { translateError } from '../utils/errorTranslator'

const STEPS = ['phone', 'otp', 'reset']

export default function ForgotPassword({ onNavigate }) {
  const [step, setStep] = useState('phone') // phone → otp → reset
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Timer state for resend OTP
  const [resendTimer, setResendTimer] = useState(60)
  const timerRef = useRef(null)
  
  const otpRefs = useRef([])
  const stepIndex = STEPS.indexOf(step)

  const startResendTimer = () => {
    setResendTimer(60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (step === 'otp') {
      startResendTimer()
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step])

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /* ── Step 1: Send OTP ──────────── */
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const cleanPhone = phone.trim().replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      setError('Please enter a standard 10-digit phone number.')
      return
    }

    setLoading(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneOrEmail: cleanPhone
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.')
      }

      setStep('otp')
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  /* ── Resend OTP trigger ────────── */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    await handleSendOtp()
    startResendTimer()
  }

  /* ── Step 2: Verify OTP ────────── */
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = cleaned
    setOtp(newOtp)

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        otpRefs.current[index - 1]?.focus()
      } else if (otp[index]) {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    }
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    setError('')
    const code = otp.join('')
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter the complete 6-digit verification code.')
      return
    }
    // Set to next step (reset form)
    setStep('reset')
  }

  /* ── Step 3: Reset Password ────── */
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const code = otp.join('')
      const cleanPhone = phone.trim().replace(/\D/g, '')

      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: cleanPhone,
          otp: code,
          newPassword: newPassword
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password. Please check your OTP.')
      }

      setSuccess(true)
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  /* ── Success Screen ────────────── */
  if (success) {
    return (
      <div className="w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 md:border-x md:border-border flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <ShieldCheck size={36} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Password Reset!</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
          Your password has been updated successfully. Please sign in with your new password.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    )
  }

  return (
    <div className="w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 md:border-x md:border-border flex flex-col">
      {/* Top Gradient Header */}
      <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 px-6 pt-10 pb-10 rounded-b-[2rem] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10" />

        {/* Back button */}
        <button
          onClick={() => {
            if (step === 'phone') onNavigate('login')
            else if (step === 'otp') setStep('phone')
            else setStep('otp')
          }}
          className="relative z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4 cursor-pointer hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={16} className="text-white" />
        </button>

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-lg">
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {step === 'phone' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'New Password'}
          </h1>
          <p className="text-sm text-white/75 mt-1">
            {step === 'phone' && "Enter your phone number, we'll send a code"}
            {step === 'otp' && `Code sent to +91 ${phone}`}
            {step === 'reset' && 'Create a new secure password'}
          </p>
        </div>
      </div>

      {/* Step Progress Indicator */}
      <div className="flex items-center justify-center gap-2 pt-6 px-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= stepIndex
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full transition-all ${i < stepIndex ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 pt-6 pb-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl mb-4 animate-[fadeIn_0.2s_ease-out]">
            {error}
          </div>
        )}

        {/* ── Step 1: Phone ──────────── */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1 text-sm font-semibold text-slate-600 border-r border-slate-200 pr-2.5 h-6">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span className="leading-none">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9999999999"
                  className="w-full pl-[4.5rem] pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  Send OTP via SMS
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP ────────────── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block text-center">
                Enter 6-digit Code
              </label>
              <div className="flex justify-center gap-2.5">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-13 text-center text-lg font-bold bg-slate-50 border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                      digit ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  />
                ))}
              </div>
              
              <p className="text-[11px] text-muted-foreground text-center mt-4">
                Didn't receive the code?{' '}
                {resendTimer > 0 ? (
                  <span className="text-slate-400 font-semibold">Resend OTP in {formatResendTimer(resendTimer)}</span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResendOtp}
                    className="text-primary font-semibold hover:underline cursor-pointer bg-transparent border-0 outline-none p-0 inline"
                  >
                    Resend OTP via SMS
                  </button>
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Verify Code
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Step 3: Reset ──────────── */}
        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-orange-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <button
            onClick={() => onNavigate('login')}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
