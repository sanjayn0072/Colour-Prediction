import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
const LegacyAdminDashboard = React.lazy(() => import('./LegacyAdminDashboard'));
import { Shield, Lock, ArrowRight, ArrowLeft, Key, ShieldAlert, Clipboard } from 'lucide-react';

export default function AdminDashboard({ onNavigate, onBack }) {
  const { user } = useUser();
  const [authStatus, setAuthStatus] = useState('loading'); // loading, setup, verify, verified
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || null);

  // Auto-focus code digits state & refs
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const digitRefs = useRef([]);

  useEffect(() => {
    check2FaStatus();
  }, []);

  const check2FaStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedAdminToken = localStorage.getItem('adminToken');
      
      const parseJwt = (t) => {
        try {
          if (!t) return null;
          return JSON.parse(atob(t.split('.')[1]));
        } catch (e) {
          return null;
        }
      };

      const decodedUser = parseJwt(token);
      const decodedAdmin = parseJwt(storedAdminToken);

      let isStale = true;
      if (decodedUser && decodedAdmin && String(decodedUser.id) === String(decodedAdmin.id)) {
        const isExpired = decodedAdmin.exp * 1000 < Date.now();
        if (!isExpired) {
          isStale = false;
        }
      }

      if (isStale) {
        localStorage.removeItem('adminToken');
        setAdminToken(null);
      }

      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      const res = await fetch(`${API_BASE}/api/admin/2fa/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to check 2FA status');
      
      if (!data.isSetup) {
        setQrCodeUrl(data.qrCode);
        setAuthStatus('setup');
      } else {
        if (!isStale && localStorage.getItem('adminToken')) {
          setAuthStatus('verified');
        } else {
          setAuthStatus('verify');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setAuthStatus('verify'); // fallback
    }
  };

  const handleDigitChange = (value, index) => {
    const cleanedVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = cleanedVal;
    setCodeDigits(newDigits);
    setTwoFaCode(newDigits.join(''));

    // Move focus to next input cell if filled
    if (cleanedVal !== '' && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (codeDigits[index] === '' && index > 0) {
        // Backspace on empty: clear previous cell and focus it
        const newDigits = [...codeDigits];
        newDigits[index - 1] = '';
        setCodeDigits(newDigits);
        setTwoFaCode(newDigits.join(''));
        digitRefs.current[index - 1]?.focus();
      } else if (codeDigits[index] !== '') {
        // Clear current cell
        const newDigits = [...codeDigits];
        newDigits[index] = '';
        setCodeDigits(newDigits);
        setTwoFaCode(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e) => {
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...codeDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || '';
    }
    setCodeDigits(newDigits);
    setTwoFaCode(newDigits.join(''));
    // Focus last filled or next empty
    const focusIndex = Math.min(pasteData.length, 5);
    digitRefs.current[focusIndex]?.focus();
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const pasteData = text.replace(/\D/g, '').slice(0, 6);
      if (!pasteData) return;
      const newDigits = [...codeDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasteData[i] || '';
      }
      setCodeDigits(newDigits);
      setTwoFaCode(newDigits.join(''));
      const focusIndex = Math.min(pasteData.length, 5);
      digitRefs.current[focusIndex]?.focus();
    } catch (err) {
      console.error('Failed to read clipboard text: ', err);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (twoFaCode.length !== 6) {
      setErrorMsg('Please enter a complete 6-digit authentication code.');
      return;
    }
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      
      const res = await fetch(`${API_BASE}/api/admin/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: twoFaCode })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      // Verification successful, we got an elevated admin token set via HttpOnly cookies
      setAdminToken(data.token);
      setAuthStatus('verified');
      
    } catch (err) {
      setErrorMsg(err.message);
      // Reset input digits upon failure
      setCodeDigits(['', '', '', '', '', '']);
      setTwoFaCode('');
      digitRefs.current[0]?.focus();
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070b13] text-white">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
            <Shield className="w-14 h-14 text-indigo-400 relative animate-[pulse_2s_infinite]" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest animate-pulse">
            Securing Administrative Session...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'verified') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-400 font-sans"><span className="text-xs font-bold uppercase tracking-widest animate-pulse">Loading Workspace...</span></div>}>
        <LegacyAdminDashboard 
          onBack={onBack} 
          adminToken={adminToken} 
          on2FARequired={() => {
            localStorage.removeItem('adminToken');
            setAdminToken(null);
            setAuthStatus('verify');
          }} 
        />
      </React.Suspense>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#070b13] text-slate-100 p-6 relative overflow-hidden font-sans">
      {/* Background decoration glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />
      
      {/* Security grid lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Return button */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-all bg-slate-900/30 border border-slate-800/40 px-4 py-2 rounded-xl backdrop-blur-md cursor-pointer hover:shadow-sm"
      >
        <ArrowLeft size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Return</span>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center max-w-[420px] mx-auto w-full relative z-10">
        <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-[32px] p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
          {/* Subtle gradient border line on top */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {/* Breathing key lock icon wrapper */}
          <div className="relative w-20 h-20 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 animate-[pulse_3s_infinite]" />
            <div className="absolute inset-2 rounded-2xl bg-indigo-500/5 animate-[pulse_2s_infinite]" />
            <Key className="w-9 h-9 text-indigo-400 relative z-10" />
          </div>

          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Shield size={10} /> Admin Gateway
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">Secure Authentication</h1>
            <p className="text-slate-400 text-xs mt-2 font-medium leading-relaxed">
              {authStatus === 'setup' 
                ? 'Scan the QR code with Google Authenticator to setup 2FA.'
                : 'Enter your 6-digit Google Authenticator code to continue.'}
            </p>
          </div>

          {authStatus === 'setup' && qrCodeUrl && (
            <div className="flex justify-center mb-8 p-4 bg-white/95 rounded-[24px] border border-slate-700/35 shadow-inner">
              <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 rounded-xl" />
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                Authentication Code
              </label>
              
              {/* Spaced out digit cells layout */}
              <div className="flex gap-2.5 justify-between" onPaste={handlePaste}>
                {codeDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (digitRefs.current[idx] = el)}
                    onChange={(e) => handleDigitChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    className="w-12 h-14 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-center text-2xl font-extrabold text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
                    required
                  />
                ))}
              </div>
              
              {/* Paste Code Button */}
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleClipboardPaste}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0d121f] border border-slate-800/80 hover:bg-[#141b2e] hover:border-slate-700/80 text-[#5f69f8] hover:text-[#737dfa] rounded-xl text-[11px] font-bold tracking-wide transition-all shadow-[0_2px_8px_rgba(0,0,0,0.5)] cursor-pointer outline-none active:scale-[0.97]"
                >
                  <Clipboard size={13} className="shrink-0 text-[#5f69f8]" />
                  Paste Code
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.3)] cursor-pointer outline-none active:scale-[0.98]"
            >
              Verify & Authenticate
              <ArrowRight size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
