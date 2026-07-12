import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Gamepad2, Play, Lock, Mail, Settings, Edit, Copy, Link, LogOut, Check, X, Shield, HelpCircle } from 'lucide-react';
import { gameRegistry } from '../utils/gameRegistry';
import { useUser } from '../context/UserContext';
import { getVipLevel } from '../utils/vipTiers';

// Premium Game Shimmer/Skeleton loader
const GameSkeleton = () => (
  <div className="min-h-screen bg-[#f8fafc] p-6 flex flex-col items-center justify-center font-sans space-y-6">
    <div className="w-full max-w-md h-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
    <div className="w-full max-w-md h-96 bg-white border border-slate-200 rounded-2xl animate-pulse flex flex-col items-center justify-center space-y-4">
      <div className="w-20 h-20 bg-slate-100 rounded-full animate-pulse" />
      <div className="w-48 h-6 bg-slate-100 rounded-lg animate-pulse" />
      <div className="w-32 h-4 bg-slate-100 rounded-lg animate-pulse" />
    </div>
  </div>
);

// High-end SVG VIP Avatar Frame Overlays
const VIP_FRAMES = [
  {
    level: 0,
    name: 'VIP0',
    color: 'border-amber-800 bg-amber-900/10',
    badge: 'bg-amber-800',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.05]">
        <circle cx="50" cy="50" r="46" stroke="#78350f" strokeWidth="6" fill="none" />
      </svg>
    )
  },
  {
    level: 1,
    name: 'VIP1',
    color: 'border-slate-350 bg-slate-450/15',
    badge: 'bg-slate-500',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.07]">
        <circle cx="50" cy="50" r="46" stroke="#cbd5e1" strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r="42" stroke="#94a3b8" strokeWidth="2" fill="none" />
        <path d="M 50 4 L 46 12 L 54 12 Z M 50 96 L 46 88 L 54 88 Z" fill="#64748b" />
      </svg>
    )
  },
  {
    level: 2,
    name: 'VIP2',
    color: 'border-amber-400 bg-amber-400/10',
    badge: 'bg-amber-500',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.1]">
        <circle cx="50" cy="50" r="46" stroke="#eab308" strokeWidth="6" fill="none" />
        <circle cx="50" cy="50" r="41" stroke="#d97706" strokeWidth="2.5" fill="none" />
        <polygon points="50,2 55,10 45,10" fill="#eab308" />
        <polygon points="50,98 55,90 45,90" fill="#eab308" />
        <polygon points="2,50 10,55 10,45" fill="#eab308" />
        <polygon points="98,50 90,55 90,45" fill="#eab308" />
      </svg>
    )
  },
  {
    level: 3,
    name: 'VIP3',
    color: 'border-yellow-500 bg-yellow-500/15',
    badge: 'bg-yellow-600',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.12]">
        <circle cx="50" cy="50" r="46" stroke="#fbbf24" strokeWidth="7" fill="none" />
        <circle cx="50" cy="50" r="40" stroke="#b45309" strokeWidth="2.5" fill="none" />
        <g transform="translate(35, -2) scale(0.3)">
          <path d="M 0 35 L 20 0 L 50 25 L 80 0 L 100 35 Z" fill="#d97706" stroke="#fbbf24" strokeWidth="4" />
          <circle cx="20" cy="0" r="6" fill="#f59e0b" />
          <circle cx="50" cy="25" r="6" fill="#f59e0b" />
          <circle cx="80" cy="0" r="6" fill="#f59e0b" />
        </g>
        <circle cx="50" cy="94" r="5" fill="#ef4444" stroke="#fbbf24" strokeWidth="2" />
      </svg>
    )
  },
  {
    level: 4,
    name: 'VIP4',
    color: 'border-purple-500 bg-purple-500/15',
    badge: 'bg-purple-600',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.12]">
        <circle cx="50" cy="50" r="46" stroke="#a855f7" strokeWidth="7" fill="none" />
        <circle cx="50" cy="50" r="40" stroke="#6b21a8" strokeWidth="2" fill="none" />
        <polygon points="50,6 52,12 58,12 53,16 55,22 50,18 45,22 47,16 42,12 48,12" fill="#e879f9" />
        <polygon points="12,50 14,56 20,56 15,60 17,66 12,62 7,66 9,60 4,56 10,56" fill="#e879f9" />
        <polygon points="88,50 90,56 96,56 91,60 93,66 88,62 83,66 85,60 80,56 86,56" fill="#e879f9" />
      </svg>
    )
  },
  {
    level: 5,
    name: 'VIP5',
    color: 'border-rose-500 bg-rose-500/15',
    badge: 'bg-rose-600',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.13]">
        <circle cx="50" cy="50" r="46" stroke="#f43f5e" strokeWidth="7" fill="none" />
        <circle cx="50" cy="50" r="39" stroke="#9f1239" strokeWidth="2.5" fill="none" />
        <path d="M 50,2 C 48,9 38,15 38,20 C 38,23 41,26 44,26 C 47,26 50,22 50,22 C 50,22 53,26 56,26 C 59,26 62,23 62,20 C 62,15 52,9 50,2 Z" fill="#fda4af" />
        <path d="M 12,75 C 20,85 35,92 50,92 C 65,92 80,85 88,75" stroke="#f43f5e" strokeWidth="4" fill="none" />
      </svg>
    )
  },
  {
    level: 6,
    name: 'VIP6',
    color: 'border-cyan-400 bg-cyan-400/15',
    badge: 'bg-cyan-500',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.12]">
        <circle cx="50" cy="50" r="46" stroke="#22d3ee" strokeWidth="7" fill="none" />
        <circle cx="50" cy="50" r="40" stroke="#0891b2" strokeWidth="2" fill="none" />
        <polygon points="50,3 54,9 50,15 46,9" fill="#e0f2fe" />
        <polygon points="50,97 54,91 50,85 46,91" fill="#e0f2fe" />
      </svg>
    )
  },
  {
    level: 7,
    name: 'VIP7',
    color: 'border-teal-400 bg-teal-400/15',
    badge: 'bg-teal-500',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.13]">
        <circle cx="50" cy="50" r="46" stroke="#2dd4bf" strokeWidth="7" fill="none" />
        <circle cx="50" cy="50" r="39" stroke="#0d9488" strokeWidth="3" fill="none" />
        <path d="M 22,22 C 30,12 40,8 50,8" stroke="#5eead4" strokeWidth="2" fill="none" />
        <path d="M 78,22 C 70,12 60,8 50,8" stroke="#5eead4" strokeWidth="2" fill="none" />
      </svg>
    )
  },
  {
    level: 8,
    name: 'VIP8',
    color: 'border-indigo-500 bg-indigo-500/15',
    badge: 'bg-indigo-650',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.14]">
        <circle cx="50" cy="50" r="46" stroke="#6366f1" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="38" stroke="#312e81" strokeWidth="3" fill="none" />
        <path d="M 4,40 C -2,50 -2,60 4,70 C 10,65 12,55 4,40 Z" fill="#818cf8" stroke="#6366f1" strokeWidth="2" />
        <path d="M 96,40 C 102,50 102,60 96,70 C 90,65 88,55 96,40 Z" fill="#818cf8" stroke="#6366f1" strokeWidth="2" />
      </svg>
    )
  },
  {
    level: 9,
    name: 'VIP9',
    color: 'border-rose-600 bg-rose-600/15',
    badge: 'bg-rose-700',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.14]">
        <circle cx="50" cy="50" r="46" stroke="#e11d48" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="38" stroke="#4c0519" strokeWidth="3" fill="none" />
        <g transform="translate(30, -5) scale(0.4)">
          <path d="M 0 35 L 25 0 L 50 20 L 75 0 L 100 35 Z" fill="#fda4af" stroke="#e11d48" strokeWidth="4" />
        </g>
      </svg>
    )
  },
  {
    level: 10,
    name: 'VIP10',
    color: 'border-orange-500 bg-orange-500/15',
    badge: 'bg-orange-600',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.15]">
        <circle cx="50" cy="50" r="45" stroke="#f97316" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="37" stroke="#7c2d12" strokeWidth="3" fill="none" />
        <path d="M 40,2 C 45,-3 50,-5 55,-3 C 58,1 55,8 50,11 C 45,8 42,1 40,2 Z" fill="#f97316" />
        <path d="M 45,98 C 47,93 50,91 53,93 C 55,95 53,99 50,101 C 47,99 45,95 45,98 Z" fill="#ea580c" />
      </svg>
    )
  },
  {
    level: 11,
    name: 'VIP11~20',
    color: 'border-red-500 bg-red-500/20',
    badge: 'bg-gradient-to-r from-red-650 to-amber-600',
    svg: (
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 scale-[1.18]">
        <circle cx="50" cy="50" r="45" stroke="#ef4444" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="37" stroke="#991b1b" strokeWidth="3" fill="none" />
        <path d="M 12,25 C -5,35 -5,65 12,75 C 10,65 2,55 12,25 Z" fill="#fca5a5" stroke="#ef4444" strokeWidth="3" />
        <path d="M 88,25 C 105,35 105,65 88,75 C 90,65 98,55 88,25 Z" fill="#fca5a5" stroke="#ef4444" strokeWidth="3" />
        <g transform="translate(30, -10) scale(0.4)">
          <path d="M 0 35 L 25 0 L 50 20 L 75 0 L 100 35 Z" fill="#facc15" stroke="#eab308" strokeWidth="5" />
          <circle cx="25" cy="0" r="5" fill="#ffffff" />
          <circle cx="50" cy="20" r="5" fill="#ffffff" />
          <circle cx="75" cy="0" r="5" fill="#ffffff" />
        </g>
      </svg>
    )
  }
];

export default function GameLobby({ onNavigate, routeData }) {
  const { user, setUser, balance, logout } = useUser();
  const [currentGameId, setCurrentGameId] = useState(null);
  const [jackpot, setJackpot] = useState(1152004.85);

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [copiedUid, setCopiedUid] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);



  // Calculate user's true VIP level dynamically based on deposit history
  const vipLevel = getVipLevel(user?.totalDeposits || 0);

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  // Parse query route data on navigation
  useEffect(() => {
    if (routeData?.gameId) {
      setCurrentGameId(routeData.gameId);
    } else {
      setCurrentGameId(null);
    }
  }, [routeData]);

  // Live Jackpot increments to simulate active environment
  useEffect(() => {
    const timer = setInterval(() => {
      setJackpot((prev) => prev + Math.random() * 1.5);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const selectedGame = gameRegistry.find((g) => g.id === currentGameId);

  // Handle saving the user profile name
  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!editedName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editedName.trim() })
      });
      if (response.ok) {
        setUser((prev) => (prev ? { ...prev, name: editedName.trim() } : null));
        setIsEditingName(false);
      }
    } catch (err) {
      console.error('Failed to update name:', err);
    }
  };

  // Handle saving the user profile avatar
  const handleSaveAvatar = async (avatarUrl) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: avatarUrl })
      });
      if (response.ok) {
        setUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));
        setIsSelectingAvatar(false);
      }
    } catch (err) {
      console.error('Failed to update avatar:', err);
    }
  };

  // Copy user UID to clipboard
  const handleCopyUid = () => {
    if (!user?.uid && !user?.id) return;
    const uidStr = user.uid || user.id;
    navigator.clipboard.writeText(uidStr);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // If a game is active and selected, unmount the lobby and render the game container
  if (currentGameId && selectedGame && selectedGame.component) {
    const GameComponent = selectedGame.component;

    return (
      <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-[#f8fafc] relative">
        {/* Floating Back Button */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => setCurrentGameId(null)}
            className="flex items-center justify-center text-slate-600 hover:text-primary transition-all duration-200 cursor-pointer bg-white p-2.5 rounded-full border border-slate-200 shadow-md active:scale-95"
            title="Back to Lobby"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Dynamic Game Component Viewport */}
        <main className="flex-1 relative z-10 overflow-y-auto pt-16">
          <React.Suspense fallback={<GameSkeleton />}>
            <GameComponent onNavigate={onNavigate} />
          </React.Suspense>
        </main>
      </div>
    );
  }

  // Otherwise, render the Centralized Game Lobby Dashboard
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col pb-8 relative">
      <div className="flex flex-col min-h-screen">
        {/* Lobby Hero Header matching the exact top bar image */}
        <header className="p-4 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl text-slate-800">
          {/* Modern Profile Avatar Frame with custom SVG border overlays */}
          <div className="relative">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
            >
              <img
                src={user?.avatar || '/avatars/Avatar_1.jpg'}
                className="w-full h-full object-cover rounded-full"
                alt="Profile"
              />
            </button>
            {/* pulsing green online indicator */}
            <span className="absolute bottom-0 left-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-20">
              <span className="w-1 h-1 bg-white rounded-full animate-ping" />
            </span>
            {/* Overlapping gold VIP badge */}
            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-[8px] font-black text-slate-950 px-1.5 py-0.5 rounded-full border border-white shadow-md select-none z-20">
              VIP {vipLevel}
            </span>
          </div>

          {/* Dynamic balance display connected to live react wallet balance */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full pl-2 pr-1 py-1 shadow-inner">
            <img src="/spade_chip.png" alt="Chip" className="w-4.5 h-4.5 object-contain" />
            <span className="text-xs font-black text-slate-700 tracking-tight font-mono">
              {parseFloat(balance || 0).toFixed(2)}
            </span>
            <button
              onClick={() => onNavigate?.('wallet', { tab: 'deposit' })}
              className="bg-emerald-500 hover:bg-emerald-400 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-xs font-black transition-all cursor-pointer border-0 active:scale-90"
            >
              +
            </button>
          </div>

          {/* Inbox and settings gear icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate?.('notifications')}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Mail size={16} />
            </button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Live Jackpot Banner: Slot Machine Billboard */}
        <div className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-xl flex flex-col items-center justify-center w-full max-w-md mx-auto aspect-[1.6/1]">
            <img
              src="/jackpot_lotto.png"
              className="w-full h-full object-cover"
              alt="Jackpot Lotto"
            />
            {/* Absolute overlay container positioned directly over the red rectangle empty space in the center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] sm:text-[22px] font-black text-[#FFE680] font-mono tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] select-none mt-1">
                ₹{jackpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Game Slots Lobby Category Selector */}
        <div className="px-4 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-500">
              🎰 All Game Slots
            </h2>
            <span className="text-[10px] text-slate-600 font-medium">
              {gameRegistry.filter((g) => g.badge !== 'COMING_SOON').length} Active Games
            </span>
          </div>

          {/* 3-Column Slot Game Grid Box Lobby */}
          <div className="grid grid-cols-3 gap-3 px-4 pt-4">
            {gameRegistry.map((game) => {
              const isComingSoon = game.badge === 'COMING_SOON';
              const isHot = game.badge === 'HOT';
              const isTrending = game.badge === 'TRENDING';

              return (
                <div
                  key={game.id}
                  onClick={() => {
                    if (!isComingSoon) {
                      setCurrentGameId(game.id);
                    }
                  }}
                  className={`group relative aspect-square overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col bg-white cursor-pointer ${
                    isComingSoon
                      ? 'border-slate-200 opacity-60'
                      : 'border-slate-200/60 shadow-sm hover:border-primary/50 hover:shadow-md hover:shadow-primary/5'
                  }`}
                >
                  {/* Premium moving glossy sheen shimmer effect on hover */}
                  {!isComingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10 pointer-events-none" />
                  )}

                  {/* Thumbnail Layer */}
                  <div className="absolute inset-0 z-0">
                    {game.thumbnail ? (
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          isComingSoon ? 'blur-[2px] grayscale' : 'group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center text-white space-y-2 relative ${
                          game.id === 'safari-mystery'
                            ? 'bg-gradient-to-br from-amber-500 to-orange-700'
                            : game.id === 'dragon-hatch'
                            ? 'bg-gradient-to-br from-rose-600 to-red-800'
                            : game.id === 'mahjon-wins'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
                            : game.id === 'spin-wheel'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {/* Circular Icon Base */}
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shadow-black/10 group-hover:scale-110 transition-transform duration-300">
                          <span className="text-2xl filter drop-shadow-md select-none">{game.icon}</span>
                        </div>

                        {/* Glow element */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    )}

                    {/* Gradient Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent z-0" />
                  </div>

                  {/* Top Left Badge overlay */}
                  <span
                    className={`absolute top-2 left-2 z-10 bg-gradient-to-r ${
                      isComingSoon
                        ? 'from-slate-500 to-slate-650'
                        : isHot
                        ? 'from-rose-500 to-red-650'
                        : isTrending
                        ? 'from-amber-500 to-orange-650'
                        : 'from-emerald-500 to-teal-650'
                    } text-[7px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded shadow-lg border border-white/10 text-white`}
                  >
                    {isComingSoon ? 'Soon' : game.badge}
                  </span>

                  {/* Bottom Title & Play circle */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                    <span className="text-[8px] font-black tracking-wide text-white truncate max-w-[70%] drop-shadow-md">
                      {game.title}
                    </span>
                    {isComingSoon ? (
                      <span className="w-5 h-5 rounded-full bg-slate-200/80 border border-slate-300 flex items-center justify-center">
                        <Lock size={8} className="text-slate-600" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow shadow-emerald-500/40 transition-transform group-hover:scale-110 relative">
                        {/* Pulse glow element */}
                        <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping group-hover:block hidden" />
                        <Play size={8} fill="white" className="text-white ml-0.5 relative z-10" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Premium Game-Themed User Profile Modal Popup ─── */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white border border-slate-200 rounded-[2.2rem] p-6 shadow-2xl relative overflow-hidden text-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Custom inline style overrides to hide the scrollbar on backpack grid */}
            <style>{`
              .scrollbar-none::-webkit-scrollbar {
                display: none !important;
              }
              .scrollbar-none {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
              }
            `}</style>

            {/* Top Close Cross */}
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 bg-slate-100 p-1.5 rounded-full cursor-pointer hover:bg-slate-200 transition-colors border-0"
            >
              <X size={14} />
            </button>
            {isSelectingAvatar ? (
              // ─── Avatar Selection Grid Sub-View ───
              <div className="flex flex-col">
                {/* Back Header */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setIsSelectingAvatar(false)}
                    className="p-1 rounded-full hover:bg-slate-100 cursor-pointer text-slate-650 border-0 bg-transparent flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                    Choose Avatar
                  </h3>
                </div>

                {/* Avatar Selection Grid */}
                <div className="grid grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-none mb-5">
                  {Array.from({ length: 12 }, (_, i) => {
                    const avatarUrl = `/avatars/Avatar_${i + 1}.jpg`;
                    const isSelected = user?.avatar === avatarUrl;
                    return (
                      <div
                        key={i}
                        onClick={() => handleSaveAvatar(avatarUrl)}
                        className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-200 active:scale-95 ${
                          isSelected ? 'border-amber-400 shadow-md shadow-amber-400/10' : 'border-transparent hover:border-slate-350'
                        }`}
                      >
                        <img
                          src={avatarUrl}
                          className="w-full h-full object-cover"
                          alt={`Avatar ${i + 1}`}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-400/20 flex items-center justify-center">
                            <span className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 shadow-md border border-white">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsSelectingAvatar(false)}
                  className="py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-wider transition-all cursor-pointer bg-transparent active:scale-95"
                >
                  Cancel
                </button>
              </div>
            ) : (
              // ─── Standard Profile Details View ───
              <>
                {/* Profile Avatar & Details Header */}
                <div className="flex gap-4 items-center">
                  {/* Left Side: Avatar Container with equipped VIP frame */}
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <img
                      src={user?.avatar || '/avatars/Avatar_1.jpg'}
                      className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                      alt="Profile Photo"
                    />
                    {/* Camera Overlay Icon */}
                    <button
                      onClick={() => setIsSelectingAvatar(true)}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-amber-400 p-1.5 rounded-full border border-white shadow z-20 cursor-pointer active:scale-90 border-0 flex items-center justify-center hover:bg-amber-300 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-950">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                    </button>
                  </div>

                  {/* Right Side: Info Fields */}
                  <div className="flex-1 space-y-1.5">
                    {/* Gender Badge & Name Edit */}
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-black shadow-inner">
                        ♂
                      </span>
                      {isEditingName ? (
                        <form onSubmit={handleSaveName} className="flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="bg-transparent text-slate-800 font-bold text-xs outline-none w-20"
                            maxLength={12}
                            autoFocus
                          />
                          <button type="submit" className="text-emerald-500 border-0 bg-transparent cursor-pointer p-0 flex items-center"><Check size={11} /></button>
                          <button type="button" onClick={() => setIsEditingName(false)} className="text-rose-450 border-0 bg-transparent cursor-pointer p-0 flex items-center"><X size={11} /></button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-800 tracking-wide">{user?.name}</span>
                          <button
                            onClick={() => { setIsEditingName(true); setEditedName(user?.name || ''); }}
                            className="text-slate-400 hover:text-slate-650 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          >
                            <Edit size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* UID Container */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-full px-3 py-0.5 border border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">UID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-700">{user?.uid || user?.id || 'N/A'}</span>
                        <button onClick={handleCopyUid} className="text-slate-400 hover:text-slate-700 bg-transparent border-0 p-0 cursor-pointer flex items-center">
                          {copiedUid ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>

                    {/* Phone Container */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-full px-3 py-0.5 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" width="9" height="9" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-slate-400">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                          <line x1="12" y1="18" x2="12.01" y2="18"/>
                        </svg>
                        <span className="text-[10px] font-mono font-bold text-slate-700">{user?.phone || 'N/A'}</span>
                      </div>
                      <button className="text-slate-400 hover:text-slate-700 bg-transparent border-0 p-0 cursor-pointer flex items-center">
                        <Link size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Wallet Balance & VIP Shield Level */}
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100 mt-4">
                  <div className="flex items-center gap-1.5">
                    <img src="/spade_chip.png" alt="Chip" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-black text-amber-500 font-mono tracking-tight">
                      {parseFloat(balance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-slate-400 cursor-pointer hover:text-slate-650" />
                    <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-yellow-300/40 shadow shadow-amber-400/10">
                      <Shield size={9} fill="currentColor" />
                      <span>VIP {vipLevel}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Logout Action */}
                <button
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    logout();
                  }}
                  className="py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 mt-5"
                >
                  <LogOut size={11} />
                  <span>Logout</span>
                </button>

                {/* Tap to close trigger */}
                <div className="text-center mt-4">
                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0 outline-none select-none"
                  >
                    TAP TO CLOSE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
