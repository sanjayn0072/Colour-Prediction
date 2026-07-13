import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, Phone, UserPlus, ArrowLeft, Sparkles, KeyRound } from 'lucide-react'
import { translateError } from '../utils/errorTranslator'

export default function Register({ onNavigate }) {
  const [searchParams] = useSearchParams()
  const rawInviteCode = searchParams.get('invitecode') || ''
  const inviteCode = rawInviteCode.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
  
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', otp: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Timer state for resend OTP
  const [resendTimer, setResendTimer] = useState(60)
  const timerRef = useRef(null)

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
    if (step === 2) {
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

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    setError('')

    const cleanPhone = form.phone.trim().replace(/\D/g, '')

    if (!form.name || !cleanPhone || !form.password || !form.confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }
    if (!/^[a-zA-Z\s]+$/.test(form.name)) {
      setError('Full name can only contain alphabetic characters and spaces.')
      return
    }
    if (cleanPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          phone: cleanPhone,
          email: form.email,
          password: form.password
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize registration.')
      }

      setStep(2)
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    await handleSendOtp()
    startResendTimer()
  }

  const handleVerifyRegister = async (e) => {
    e.preventDefault()
    setError('')

    const cleanOtp = form.otp.trim().replace(/\D/g, '')
    const cleanPhone = form.phone.trim().replace(/\D/g, '')

    if (cleanOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.')
      return
    }

    setLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: form.name,
          phone: cleanPhone,
          email: form.email,
          password: form.password,
          otp: cleanOtp,
          inviteCode: inviteCode || undefined
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.')
      }

      setSuccess(true)
    } catch (err) {
      setError(translateError(err.message))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 md:border-x md:border-border flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">Verification Complete!</h2>
        <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed">
          Your account has been securely registered. Please sign in to continue.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all cursor-pointer"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 md:border-x md:border-border flex flex-col">
      
      {/* Top Gradient Header */}
      <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-6 pt-10 pb-10 rounded-b-[2rem] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10" />

        {/* Back button */}
        <button
          onClick={() => step === 2 ? setStep(1) : onNavigate('login')}
          className="relative z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4 cursor-pointer hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={16} className="text-white" />
        </button>

        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-lg">
            {step === 1 ? <Sparkles size={26} className="text-white" /> : <KeyRound size={26} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {step === 1 ? 'Create Account' : 'Verify Phone'}
          </h1>
          <p className="text-sm text-white/75 mt-1">
            {step === 1 ? 'Join RRClub today' : `Enter the code sent to +91 ${form.phone}`}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 pt-6 pb-8 overflow-y-auto">
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Full Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^a-zA-Z\s]/g, '')
                    update('name', filtered)
                  }}
                  onKeyDown={(e) => {
                    const key = e.key
                    const isLetter = /^[a-zA-Z]$/.test(key)
                    const isAllowedControl = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', ' ', 'Home', 'End'].includes(key)
                    const isShortcut = e.ctrlKey || e.metaKey
                    if (!isLetter && !isAllowedControl && !isShortcut) {
                      e.preventDefault()
                    }
                  }}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Phone Number <span className="text-destructive">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 flex items-center gap-1 text-sm font-semibold text-slate-600 border-r border-slate-200 pr-2.5 h-6">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span className="leading-none">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => {
                    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                    update('phone', cleanValue);
                  }}
                  placeholder="9999999999"
                  className="w-full pl-[4.5rem] pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>



            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
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

            {/* Terms */}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{' '}
              <span className="text-primary font-medium cursor-pointer hover:underline">Terms of Service</span>{' '}
              and{' '}
              <span className="text-primary font-medium cursor-pointer hover:underline">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || form.phone.length !== 10}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Send OTP
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyRegister} className="space-y-5">
             {/* Error */}
             {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2.5">
              <KeyRound size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                A verification code has been sent to your phone number <strong>+91 {form.phone}</strong>. Please enter the 6-digit code below.
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Verification Code <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) => update('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3.5 text-center text-lg tracking-[0.5em] font-bold bg-slate-50 border border-border rounded-xl text-foreground placeholder:text-slate-300 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || form.otp.length < 6}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Register
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        {step === 1 && (
          <div className="mt-6 text-center pb-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => onNavigate('login')}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
