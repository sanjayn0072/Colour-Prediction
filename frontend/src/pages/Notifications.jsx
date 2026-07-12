import { useState, useEffect } from 'react'
import { ArrowLeft, Gift, TrendingUp, Shield, Megaphone, Trophy, Bell, CheckCheck, Trash2 } from 'lucide-react'

const mapNotification = (n) => {
  const title = n.title.toLowerCase();
  const nType = String(n.type || '').toUpperCase();
  let type = 'security';
  let icon = Shield;
  let color = 'text-blue-600 bg-blue-50 border border-blue-200/50';

  if (nType === 'WALLET' || title.includes('deposit') || title.includes('withdraw') || title.includes('wallet') || title.includes('recharged')) {
    type = 'wallet';
    icon = TrendingUp;
    color = 'text-emerald-600 bg-emerald-50 border border-emerald-200/50';
  } else if (nType === 'GAME' || title.includes('won') || title.includes('game') || title.includes('round') || title.includes('bet')) {
    type = 'game';
    icon = Trophy;
    color = 'text-amber-600 bg-amber-50 border border-amber-200/50';
  } else if (nType === 'PROMO' || nType === 'COUPON' || title.includes('promo') || title.includes('coupon') || title.includes('bonus') || title.includes('reward')) {
    type = 'promo';
    icon = Gift;
    color = 'text-indigo-600 bg-indigo-50 border border-indigo-200/50';
  } else if (nType === 'SECURITY' || title.includes('security') || title.includes('password') || title.includes('2fa')) {
    type = 'security';
    icon = Shield;
    color = 'text-blue-600 bg-blue-50 border border-blue-200/50';
  } else if (nType === 'GLOBAL' || nType === 'SYSTEM_ALERT') {
    type = 'global';
    icon = Bell;
    color = 'text-purple-600 bg-purple-50 border border-purple-200/50';
  }

  const diffMs = Date.now() - new Date(n.createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let timeText = 'Just now';
  if (diffMins > 0 && diffMins < 60) {
    timeText = `${diffMins} min ago`;
  } else if (diffHours > 0 && diffHours < 24) {
    timeText = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffHours >= 24) {
    timeText = new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return {
    id: n.id,
    type,
    icon,
    color,
    title: n.title,
    message: n.message,
    time: timeText,
    read: Boolean(n.read || n.isRead),
  };
};

export default function Notifications({ onBack, onRefreshUnread }) {
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState('all') // all | unread

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setNotifications(data.map(mapNotification));
        if (onRefreshUnread) onRefreshUnread();
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleNewNotif = (e) => {
      const newNotif = mapNotification(e.detail);
      setNotifications(prev => [newNotif, ...prev]);
      if (onRefreshUnread) onRefreshUnread();
    };
    window.addEventListener('new_notification_received', handleNewNotif);
    return () => {
      window.removeEventListener('new_notification_received', handleNewNotif);
    };
  }, [onRefreshUnread]);

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      await fetch(`${API_BASE}/api/notifications/mark-read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (onRefreshUnread) onRefreshUnread();
    } catch (err) {
      console.error(err);
    }
  }

  const markRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (onRefreshUnread) onRefreshUnread();
    } catch (err) {
      console.error(err);
    }
  }

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ── Header ────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back */}
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors text-slate-700 border-0 outline-none"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-800">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Mark all read */}
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-indigo-600 border-0 outline-none"
            title="Mark all as read"
          >
            <CheckCheck size={16} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-0 outline-none ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Notification List ─────────── */}
      <div className="flex-1 px-4 pt-3 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
              <Bell size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'unread' ? 'All caught up!' : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((notif) => {
              const Icon = notif.icon
              return (
                <div
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`relative flex gap-3 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                    notif.read
                      ? 'bg-white border-slate-200/60 hover:bg-slate-100/30 text-slate-600'
                      : 'bg-indigo-50/20 border-indigo-200/40 hover:bg-indigo-50/40 shadow-sm text-slate-800'
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${notif.color} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm leading-tight ${notif.read ? 'font-medium text-slate-600' : 'font-semibold text-slate-800'}`}>
                        {notif.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {notif.time}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-550 transition-all cursor-pointer border-0 outline-none bg-transparent"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
