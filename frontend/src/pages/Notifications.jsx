import { useState, useEffect } from 'react'
import { ArrowLeft, Gift, TrendingUp, Shield, Megaphone, Trophy, Bell, CheckCheck, Trash2 } from 'lucide-react'

const mapNotification = (n) => {
  const title = n.title.toLowerCase();
  let type = 'security';
  let icon = Shield;
  let color = 'text-blue-650 bg-blue-50';

  if (title.includes('bonus') || title.includes('spin') || title.includes('reward')) {
    type = 'reward';
    icon = Gift;
    color = 'text-pink-650 bg-pink-50';
  } else if (title.includes('won') || title.includes('game') || title.includes('round') || title.includes('bet')) {
    type = 'game';
    icon = Trophy;
    color = 'text-amber-600 bg-amber-50';
  } else if (title.includes('promo') || title.includes('coupon') || title.includes('hour')) {
    type = 'promo';
    icon = Megaphone;
    color = 'text-indigo-650 bg-indigo-50';
  } else if (title.includes('deposit') || title.includes('withdraw') || title.includes('wallet')) {
    type = 'wallet';
    icon = TrendingUp;
    color = 'text-emerald-650 bg-emerald-50';
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
    read: Boolean(n.isRead),
  };
};

export default function Notifications({ onBack }) {
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
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const unread = notifications.filter(n => !n.read);
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      await Promise.all(unread.map(n => 
        fetch(`${API_BASE}/api/notifications/${n.id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
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
    } catch (err) {
      console.error(err);
    }
  }

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back */}
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          >
            <ArrowLeft size={18} className="text-foreground" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Mark all read */}
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Mark all as read"
          >
            <CheckCheck size={16} className="text-primary" />
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
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'
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
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Bell size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
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
                      ? 'bg-white border-border hover:bg-slate-50'
                      : 'bg-primary/[0.03] border-primary/15 hover:bg-primary/[0.06] shadow-sm'
                  }`}
                >
                  {/* Unread dot */}
                  {!notif.read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${notif.color} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm leading-tight ${notif.read ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                        {notif.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground/60 font-medium">
                        {notif.time}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
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
