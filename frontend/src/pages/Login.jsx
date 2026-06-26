import { useState, useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock, LogIn, Sparkles, Phone, KeyRound } from 'lucide-react'
import { auth } from '../lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'

export default function Login({ onLogin, onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Firebase Phone Auth State
  const [loginMethod, setLoginMethod] = useState('email') // 'email' or 'phone'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState(null)

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear()
          window.recaptchaVerifier = null
        } catch (_) {}
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneOrEmail: email,
          password: password
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Invalid email or password.')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault()
    setError('')

    if (phone.length !== 10) {
      setError('Phone number must be exactly 10 digits.')
      return
    }

    setLoading(true)

    try {
      const fullPhone = `+91${phone}`

      // Setup recaptcha
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        })
      }

      const verifier = window.recaptchaVerifier
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier)
      setConfirmationResult(confirmation)
      setOtpSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send verification SMS. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhoneLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (otp.length < 6) {
      setError('Please enter a 6-digit OTP code.')
      return
    }

    setLoading(true)

    try {
      // 1. Confirm code with Firebase
      const result = await confirmationResult.confirm(otp)
      const idToken = await result.user.getIdToken()

      // 2. Login on backend
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
      const response = await fetch(`${API_BASE}/api/auth/firebase-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Login verification failed.')
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      onLogin(data.user)
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full md:max-w-md mx-auto min-h-screen bg-background text-foreground md:shadow-xl md:shadow-slate-200/80 md:border-x md:border-border flex flex-col">
      <div id="recaptcha-container"></div>

      {/* Top Gradient Header */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 pt-14 pb-12 rounded-b-[2rem] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Sparkles size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
          <p className="text-sm text-white/75 mt-1">Sign in to continue playing</p>
        </div>
      </div>

      {/* Login Tabs */}
      <div className="px-6 pt-4">
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            onClick={() => { setLoginMethod('email'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              loginMethod === 'email' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Email / Password
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod('phone'); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              loginMethod === 'phone' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Phone OTP (Firebase)
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-6 pt-6 pb-6">
        {loginMethod === 'phone' ? (
          <form onSubmit={otpSent ? handleVerifyPhoneLogin : handleSendPhoneOtp} className="space-y-5 animate-[fadeIn_0.2s_ease-out]">
            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            {!otpSent ? (
              <>
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
                      value={phone}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(cleanValue);
                      }}
                      placeholder="9999999999"
                      className="w-full pl-[4.5rem] pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Phone size={16} />
                      Send Verification SMS
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2.5">
                  <KeyRound size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    A 6-digit verification code has been sent to <strong>+91 {phone}</strong>. Please check your SMS.
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
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3.5 text-center text-lg tracking-[0.5em] font-bold bg-slate-50 border border-border rounded-xl text-foreground placeholder:text-slate-300 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify & Log In
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Change Phone Number
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl animate-[fadeIn_0.2s_ease-out]">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email Address / Phone
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@colourplay.com or phone"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-foreground placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate('forgot')}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        )}

        {/* Demo Credentials Card */}
        <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-indigo-700 mb-1">🎮 Demo Account</p>
          <div className="space-y-0.5">
            <p className="text-[11px] text-indigo-600">
              Email: <span className="font-mono font-semibold">demo@colourplay.com</span>
            </p>
            <p className="text-[11px] text-indigo-600">
              Password: <span className="font-mono font-semibold">Demo@1234</span>
            </p>
          </div>
        </div>

        {/* Register Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
