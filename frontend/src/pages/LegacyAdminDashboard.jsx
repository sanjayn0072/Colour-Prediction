
import { QRCodeSVG } from 'qrcode.react';
import React, { useState, useEffect } from 'react'
import { translateError } from '../utils/errorTranslator'
import axios from 'axios'
import { useUser } from '../context/UserContext'
import { useGame } from '../context/GameContext'
import { 
  ArrowLeft, Shield, Activity, Database, Settings, Plus, Trash2, Edit2, Save, 
  AlertTriangle, TrendingUp, Users, Wallet, Clock, Lock, Check, RefreshCw, X, AlertCircle,
  ShoppingBag, Tag, Gamepad2, FileText, Copy, QrCode, Eye, EyeOff, Bell, CreditCard, Trophy, Paperclip
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function LegacyAdminDashboard({ onBack, adminToken, on2FARequired }) {
  const { 
    user, 
    banners, addBanner, updateBanner, deleteBanner,
    products, setProducts, addProduct, updateProduct, deleteProduct 
  } = useUser()

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin'
  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  const {
    diceTimeLeft, diceRoundId, dicePhase,
    colourTimeLeft, colourRoundId, colourPhase,
    socket
  } = useGame()

  const [activeTab, setActiveTab] = useState('overview')
  const [onlineAdmins, setOnlineAdmins] = useState([])

  useEffect(() => {
    if (!socket || !isSuperAdmin) return;
    
    const handleStatusUpdate = (data) => {
      if (data && data.onlineAdmins) {
        setOnlineAdmins(data.onlineAdmins.filter(a => a.id !== user?.id));
      }
    };
    
    socket.on('admin_status_update', handleStatusUpdate);
    socket.emit('check_online_admins');
    
    return () => {
      socket.off('admin_status_update', handleStatusUpdate);
    };
  }, [socket, isSuperAdmin, user?.id]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 200 || response.status === 401 || response.status === 403) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          if (data && (data.require2FA || response.status === 401) && on2FARequired) {
            on2FARequired();
          }
        } catch (e) {
          // ignore
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [on2FARequired]);

  // Global toast notification engine state
  const [toasts, setToasts] = useState([]);

  // Global confirmation modal engine state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    onConfirm: null
  });

  const showToast = (message, type = 'error') => {
    const finalMsg = type === 'error' ? translateError(message) : message;
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: finalMsg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const showSuccessToast = (msg) => showToast(msg, 'success');
  const showErrorToast = (msg) => showToast(msg, 'error');

  // Store Config States
  const [storeConfig, setStoreConfig] = useState({
    trafficThresholdAmount: 500,
    gameSettings: 'standard',
    systemMaintenance: 'active',
    pay0UserToken: ''
  });
  const [storeConfigLoading, setStoreConfigLoading] = useState(false);
  const [storeConfigSaving, setStoreConfigSaving] = useState(false);
  const [isStoreConfigEditing, setIsStoreConfigEditing] = useState(false);

  // Dynamic Bot Traffic States
  const [botThreshold, setBotThreshold] = useState('');
  const [botThresholdSaving, setBotThresholdSaving] = useState(false);

  // Game Center Advanced States
  const [gameCenterTab, setGameCenterTab] = useState('yield');
  const [rtpTarget, setRtpTarget] = useState(96.5);
  const [settlementMode, setSettlementMode] = useState('auto');
  const [minBetColour, setMinBetColour] = useState(10);
  const [maxBetColour, setMaxBetColour] = useState(10000);
  const [minBetDice, setMinBetDice] = useState(10);
  const [maxBetDice, setMaxBetDice] = useState(10000);
  const [jackpotSeed, setJackpotSeed] = useState(1000000);
  const [jackpotGrowth, setJackpotGrowth] = useState(0.5);
  const [isJackpotEnabled, setIsJackpotEnabled] = useState(true);
  const [manualJackpotUser, setManualJackpotUser] = useState('');
  const [colourWinRule, setColourWinRule] = useState('rng');
  const [diceWinRule, setDiceWinRule] = useState('rng');
  const [colourMultiplierGreen, setColourMultiplierGreen] = useState(2.0);
  const [colourMultiplierViolet, setColourMultiplierViolet] = useState(4.5);
  const [colourMultiplierRed, setColourMultiplierRed] = useState(2.0);
  const [diceHouseFee, setDiceHouseFee] = useState(2.0);
  const [activeServerSeed, setActiveServerSeed] = useState('d3b07384d113edec49eaa6238ad5ff00');
  const [activeClientSeed, setActiveClientSeed] = useState('colourplay_public_client_seed');
  const [seedNonce, setSeedNonce] = useState(402);
  const [publicSeedHash, setPublicSeedHash] = useState('f728c7075c34511efda8df2838bd238c');
  const [isRotatingSeed, setIsRotatingSeed] = useState(false);
  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const [seedHistory, setSeedHistory] = useState([
    { timestamp: '2026-07-09 18:00:02', serverSeed: '8a27b9cde15d90471bfae83ac58a1290', clientSeed: 'colourplay_public_client_seed', nonce: 512, algorithm: 'HMAC-SHA256' },
    { timestamp: '2026-07-08 18:00:00', serverSeed: 'fe4017de8b99201948ac504938a19241', clientSeed: 'colourplay_public_client_seed', nonce: 830, algorithm: 'HMAC-SHA256' },
    { timestamp: '2026-07-07 18:00:01', serverSeed: '6e0f81d89acbb3f02e0947510abccb29', clientSeed: 'colourplay_public_client_seed', nonce: 490, algorithm: 'HMAC-SHA256' }
  ]);

  const fetchGameCenterConfig = async () => {
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/admin/game-center/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRtpTarget(data.rtpTarget);
        setSettlementMode(data.settlementMode);
        setMinBetColour(data.minBetColour);
        setMaxBetColour(data.maxBetColour);
        setMinBetDice(data.minBetDice);
        setMaxBetDice(data.maxBetDice);
        setJackpotSeed(data.jackpotSeed);
        setJackpotGrowth(data.jackpotGrowth);
        setIsJackpotEnabled(data.isJackpotEnabled);
        setManualJackpotUser(data.manualJackpotUser);
        setColourWinRule(data.colourWinRule);
        setDiceWinRule(data.diceWinRule);
        setColourMultiplierGreen(data.colourMultiplierGreen);
        setColourMultiplierViolet(data.colourMultiplierViolet);
        setColourMultiplierRed(data.colourMultiplierRed);
        setDiceHouseFee(data.diceHouseFee);
        setActiveServerSeed(data.activeServerSeed);
        setActiveClientSeed(data.activeClientSeed);
        setSeedNonce(data.seedNonce);
        setPublicSeedHash(data.publicSeedHash);
      }
    } catch (err) {
      console.error('Failed to fetch game center configs:', err);
    }
  };

  const handleRotateServerSeed = async () => {
    setIsRotatingSeed(true);
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`

    const hexChars = '0123456789abcdef';
    let newSeed = '';
    for (let i = 0; i < 32; i++) {
      newSeed += hexChars[Math.floor(Math.random() * 16)];
    }
    let mockHash = '';
    for (let i = 0; i < 64; i++) {
      mockHash += hexChars[Math.floor(Math.random() * 16)];
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/game-center/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activeServerSeed: newSeed,
          publicSeedHash: mockHash,
          seedNonce: 1
        })
      });
      if (response.ok) {
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        setSeedHistory(prev => [
          { timestamp: nowStr, serverSeed: activeServerSeed, clientSeed: activeClientSeed, nonce: seedNonce, algorithm: 'HMAC-SHA256' },
          ...prev
        ]);
        setActiveServerSeed(newSeed);
        setPublicSeedHash(mockHash);
        setSeedNonce(1);
        showToast('Cryptographic server seed rotated successfully and saved in database!', 'success');
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to rotate seed', 'error');
      }
    } catch (err) {
      showToast('Network error during rotation', 'error');
    } finally {
      setIsRotatingSeed(false);
    }
  };

  const handleApplyGameCenterConfigs = async (e) => {
    e?.preventDefault();
    setIsSavingLimits(true);
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/admin/game-center/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rtpTarget,
          settlementMode,
          minBetColour,
          maxBetColour,
          minBetDice,
          maxBetDice,
          jackpotSeed,
          jackpotGrowth,
          isJackpotEnabled,
          manualJackpotUser,
          colourWinRule,
          diceWinRule,
          colourMultiplierGreen,
          colourMultiplierViolet,
          colourMultiplierRed,
          diceHouseFee,
          activeServerSeed,
          activeClientSeed,
          seedNonce,
          publicSeedHash
        })
      });
      if (response.ok) {
        showToast('Game Center limits and RTP parameters applied successfully!', 'success');
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to save parameters', 'error');
      }
    } catch (err) {
      showToast('Connection error while saving config', 'error');
    } finally {
      setIsSavingLimits(false);
    }
  };

  // Deposit Appeals States
  const [appealsList, setAppealsList] = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [verifyingAppeals, setVerifyingAppeals] = useState({});
  const [resolvingAppeals, setResolvingAppeals] = useState({});

  const fetchAppeals = async () => {
    const token = adminToken || localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
      setAppealsLoading(true);
      const res = await fetch(`${API_BASE}/api/payment/admin/appeals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppealsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch payment appeals:', err);
    } finally {
      setAppealsLoading(false);
    }
  };

  const handleResolveAppeal = async (appealId, status) => {
    const token = adminToken || localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    setResolvingAppeals(prev => ({ ...prev, [appealId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/payment/admin/appeals/${appealId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Appeal marked as ${status} successfully!`, 'success');
        fetchAppeals();
      } else {
        showToast(data.error || 'Failed to resolve appeal', 'error');
      }
    } catch (err) {
      console.error('Error resolving appeal:', err);
      showToast('Failed to resolve appeal.', 'error');
    } finally {
      setResolvingAppeals(prev => ({ ...prev, [appealId]: false }));
    }
  };

  const handleManualVerifyPay0 = async (orderId) => {
    if (!orderId) {
      showToast('Order ID is required', 'error');
      return;
    }
    const token = adminToken || localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-pay0-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId: orderId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Order status verified successfully!`, 'success');
        fetchAppeals();
      } else {
        showToast(data.message || data.error || 'Gateway status check: pending', 'error');
      }
    } catch (err) {
      console.error('Error verifying Pay0 status:', err);
      showToast('Connection error verifying gateway status.', 'error');
    }
  };

  const handleUpdateBotThreshold = async () => {
    if (!/^\d+$/.test(String(botThreshold).trim())) {
      showErrorToast('Threshold amount must be a positive integer!');
      return;
    }
    
    setBotThresholdSaving(true);
    try {
      const token = adminToken || localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
      
      const res = await fetch(`${API_BASE}/api/admin/store-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          trafficThresholdAmount: parseInt(botThreshold, 10)
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showSuccessToast('📋 RRClub Bot Threshold updated successfully!');
        setStoreConfig(prev => ({
          ...prev,
          trafficThresholdAmount: parseInt(botThreshold, 10)
        }));
      } else {
        showErrorToast(data.error || 'Failed to update threshold');
      }
    } catch (err) {
      console.error('Failed to update bot threshold:', err);
      showErrorToast('Failed to update threshold due to a connection issue');
    } finally {
      setBotThresholdSaving(false);
    }
  };

  const fetchStoreConfig = async () => {
    const token = adminToken || localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    try {
      setStoreConfigLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/store-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStoreConfig(data);
        if (data.trafficThresholdAmount !== undefined) {
          setBotThreshold(String(data.trafficThresholdAmount));
        }
      }
    } catch (err) {
      console.error('Failed to fetch store config:', err);
    } finally {
      setStoreConfigLoading(false);
    }
  };

  const handleSaveStoreConfig = async (e) => {
    e.preventDefault();
    const token = adminToken || localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    setStoreConfigSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/store-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeConfig)
      });
      if (res.ok) {
        showToast('Store configurations updated successfully!', 'success');
        setIsStoreConfigEditing(false);
        fetchStoreConfig();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update store configurations', 'error');
      }
    } catch (err) {
      showToast('Network error updating configurations', 'error');
    } finally {
      setStoreConfigSaving(false);
    }
  };

  // Environment & Credentials State
  const [envConfigs, setEnvConfigs] = useState({
    RESEND_API_KEY: '',
    SMTP_FROM_EMAIL: '',
    GEMINI_AI_API_KEY: '',
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_CHAT_ID: '',
    PAY0_USER_TOKEN: '',
    PAY0_WEBHOOK_URL: '',
    PAY0_REDIRECT_URL: '',
    RENFLAIR_SMS_API_KEY: ''
  });
  const [envLoading, setEnvLoading] = useState(false);
  const [showConfigTotpModal, setShowConfigTotpModal] = useState(false);
  const [configTotpCode, setConfigTotpCode] = useState('');
  const [visibleKeys, setVisibleKeys] = useState({});
  const [envSaving, setEnvSaving] = useState(false);

  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcastUserId, setBroadcastUserId] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('SYSTEM_ALERT');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastLogs, setBroadcastLogs] = useState([]);
  
  const fetchBroadcastLogs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/notifications`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastLogs(data);
      } else {
        console.error('Failed to fetch broadcast logs', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch broadcast logs', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications' && isSuperAdmin) {
      fetchBroadcastLogs();
    }
  }, [activeTab, user?.role]);

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      const payload = {
        target: broadcastTarget,
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType
      };
      if (broadcastTarget === 'SPECIFIC_USER') {
        payload.target_user_id = broadcastUserId;
      }
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast('Broadcast dispatched successfully!', 'success');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastUserId('');
        fetchBroadcastLogs();
      } else {
        showToast(data.error || 'Failed to dispatch broadcast', 'error');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      showToast('Failed to dispatch broadcast: Network Error', 'error');
    } finally {
      setBroadcasting(false);
    }
  };


  const fetchEnvConfigs = async () => {
    try {
      setEnvLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/superadmin/config`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) setEnvConfigs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setEnvLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'credentials' && (user?.role === 'super_admin' || user?.role === 'admin')) {
      fetchEnvConfigs();
    }
  }, [activeTab, user?.role]);

  const handleEnvChange = (key, value) => {
    setEnvConfigs(prev => ({ ...prev, [key]: value }));
  };

  const toggleKeyVisibility = (key) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveEnvConfigs = (e) => {
    e?.preventDefault();
    setShowConfigTotpModal(true);
  };

  const confirmSaveEnvConfigs = async () => {
    if (!configTotpCode || configTotpCode.length !== 6) return showToast('Enter a 6-digit TOTP code', 'error');
    try {
      setEnvSaving(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/superadmin/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          totpCode: configTotpCode,
          ...envConfigs
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Saved successfully', 'success');
        setShowConfigTotpModal(false);
        setConfigTotpCode('');
        fetchEnvConfigs();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
    } finally {
      setEnvSaving(false);
    }
  };
 
  const [logFilter, setLogFilter] = useState('ALL') 
  const [logSearch, setLogSearch] = useState('')
  const [logs, setLogs] = useState([])

  // Database stats metrics
  const [activePlayers, setActivePlayers] = useState(0)
  const [totalBets, setTotalBets] = useState(0)
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0)
  const [pendingAppeals, setPendingAppeals] = useState(0)
  const [openComplaints, setOpenComplaints] = useState(0)

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
  const [predefinedReason, setPredefinedReason] = useState('Suspicious betting pattern detected')
  const [expandedRows, setExpandedRows] = useState({})

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [copiedState, setCopiedState] = useState("");

  const toggleRow = (id) => {
    setExpandedRows(prev => (prev[id] ? {} : { [id]: true }));
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
      textArea.remove();
    }
  };
  const [upiQrData, setUpiQrData] = useState(null)
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
  const [newProductStock, setNewProductStock] = useState('100')
  const [newProductCategory, setNewProductCategory] = useState('Tech')
  const [newProductImageFiles, setNewProductImageFiles] = useState([])
  const [newProductImagePreviews, setNewProductImagePreviews] = useState([])

  const [showEditProductModal, setShowEditProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editProductTitle, setEditProductTitle] = useState('')
  const [editProductPrice, setEditProductPrice] = useState('')
  const [editProductOriginal, setEditProductOriginal] = useState('')
  const [editProductStock, setEditProductStock] = useState('')
  const [editProductCategory, setEditProductCategory] = useState('')
  const [editProductDesc, setEditProductDesc] = useState('')
  const [editProductImageFiles, setEditProductImageFiles] = useState([])
  const [editProductImagePreviews, setEditProductImagePreviews] = useState([])

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

  // Banner creation states
  const [showAddBannerModal, setShowAddBannerModal] = useState(false)
  const [newBannerTitle, setNewBannerTitle] = useState('')
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('')
  const [newBannerGradient, setNewBannerGradient] = useState('from-indigo-650 to-purple-800')
  const [newBannerAction, setNewBannerAction] = useState('/win')

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

  const tabs = isSuperAdmin ? [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users & Audits', icon: Users },
    { id: 'withdrawals', label: 'Withdrawals', icon: Clock },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'support', label: 'Support Tickets', icon: AlertTriangle },
    { id: 'promotions', label: 'Coupons & Promos', icon: Tag },
    { id: 'game-controls', label: 'Game Center', icon: Gamepad2 },
    { id: 'logs', label: 'Logs', icon: Database },
    { id: 'config', label: 'Store Config', icon: Settings },
    { id: 'appeals', label: 'Payment Appeals', icon: CreditCard },
    { id: 'credentials', label: 'Env & Credentials', icon: Shield },
    { id: 'notifications', label: 'Alerts Center', icon: Bell }
  ] : [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users & Audits', icon: Users },
    { id: 'withdrawals', label: 'Withdrawals', icon: Clock },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'support', label: 'Support Tickets', icon: AlertTriangle },
    { id: 'game-controls', label: 'Game Center', icon: Gamepad2 },
    { id: 'config', label: 'Store Config', icon: Settings },
    { id: 'appeals', label: 'Payment Appeals', icon: CreditCard },
    { id: 'credentials', label: 'Env & Credentials', icon: Shield }
  ]

  // Fetch admin stats and logs from backend endpoints
  const fetchDashboardData = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setPendingAppeals(metricsData.pendingAppeals || 0)
        setOpenComplaints(metricsData.openComplaints || 0)
      }

      const logsRes = await fetch(`${API_BASE}/api/admin/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setLogs(logsData || [])
      }

      // Fetch risk alerts (restricted to super_admin)
      if (isSuperAdmin) {
        const riskRes = await fetch(`${API_BASE}/api/admin/risk-alerts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (riskRes.ok) {
          const riskData = await riskRes.json()
          setRiskAlerts(riskData || [])
        }
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
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const response = await fetch(`${API_BASE}/api/admin/risk-alerts/${alertId}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        showToast('Risk alert marked as resolved!', 'success')
        fetchDashboardData()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to resolve alert', 'error')
      }
    } catch (err) {
      showToast('Error resolving risk alert', 'error')
    }
  }

  const fetchWithdrawals = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setWithdrawals(Array.isArray(data) ? data : (data.records || []))
        setWithdrawTotalPages(data.pagination?.pages || 1)
        setWithdrawTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load admin withdrawals:', err)
    }
  }

  const fetchUsers = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setUsersList(Array.isArray(data) ? data : (data.records || []))
        setUsersTotalPages(data.pagination?.pages || 1)
        setUsersTotalCount(data.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load admin users:', err)
    }
  }

  const fetchUserHistory = async (userId) => {
    setLoadingUserHistory(true)
    const token = adminToken || localStorage.getItem('token')
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
    const token = adminToken || localStorage.getItem('token')
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
        showToast(`User status updated to ${newStatus}`, 'success')
        fetchUsers()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to update status', 'error')
      }
    } catch (err) {
      showToast('Error updating user status', 'error')
    }
  }

  const handleAdjustBalanceSubmit = async (e) => {
    e.preventDefault()
    if (!balanceModalUser || !balanceAmount.trim()) return
    const token = adminToken || localStorage.getItem('token')
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
        showToast('Balance adjusted successfully!', 'success')
        setShowBalanceModal(false)
        setBalanceModalUser(null)
        setBalanceAmount('')
        setBalanceDescription('')
        fetchUsers()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to adjust balance', 'error')
      }
    } catch (err) {
      showToast('Error adjusting user balance', 'error')
    } finally {
      setAdjustingBalance(false)
    }
  }

  const fetchOrders = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setOrdersList(Array.isArray(data?.records) ? data.records : [])
        setOrdersTotalPages(data?.pagination?.pages || 1)
        setOrdersTotalCount(data?.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    const token = adminToken || localStorage.getItem('token')
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
        showToast('Order status updated successfully', 'success')
        fetchOrders()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to update order status', 'error')
      }
    } catch (err) {
      showToast('Error updating order status', 'error')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const fetchComplaints = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setComplaintsList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load complaints:', err)
    }
  }

  const handleUpdateComplaintSubmit = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return
    const token = adminToken || localStorage.getItem('token')
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
        showToast('Support ticket updated successfully!', 'success')
        setSelectedComplaint(null)
        setResolutionNotes('')
        setComplaintStatusUpdate('open')
        setAssignedAdminUpdate('')
        fetchComplaints()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to update ticket', 'error')
      }
    } catch (err) {
      showToast('Error updating ticket', 'error')
    } finally {
      setUpdatingComplaintId(null)
    }
  }

  const fetchCoupons = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setCouponsList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load coupons:', err)
    }
  }

  const handleCreateCouponSubmit = async (e) => {
    e.preventDefault()
    if (!newCouponCode.trim() || !newCouponValue.trim()) return
    const token = adminToken || localStorage.getItem('token')
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
        showToast('Coupon created successfully!', 'success')
        setNewCouponCode('')
        setNewCouponValue('')
        setNewCouponMinDeposit('')
        setNewCouponMaxUses('')
        setNewCouponExpiresAt('')
        fetchCoupons()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to create coupon', 'error')
      }
    } catch (err) {
      showToast('Error creating coupon', 'error')
    } finally {
      setCreatingCoupon(false)
    }
  }

  const handleDeleteCoupon = (couponId) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to delete this coupon?',
      onConfirm: async () => {
        const token = adminToken || localStorage.getItem('token')
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
            showToast('Coupon deleted successfully!', 'success')
            fetchCoupons()
          } else {
            const err = await response.json()
            showToast(err.error || 'Failed to delete coupon', 'error')
          }
        } catch (err) {
          showToast('Error deleting coupon', 'error')
        }
      }
    });
  }

  const fetchSpinConfigs = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setSpinConfigsList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load spin configs:', err)
    }
  }

  const fetchGames = async () => {
    const token = adminToken || localStorage.getItem('token')
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
        setGamesList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load games:', err)
    }
  }

  const handleUpdateSpinConfigSubmit = async (e) => {
    e.preventDefault()
    if (!updatingSpinConfigId) return
    const token = adminToken || localStorage.getItem('token')
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
        showToast('Spin configuration updated successfully!', 'success')
        setUpdatingSpinConfigId(null)
        setSpinConfigWeight('')
        setSpinConfigValue('')
        fetchSpinConfigs()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to update config', 'error')
      }
    } catch (err) {
      showToast('Error updating config', 'error')
    }
  }

  const handleToggleGameStatus = async (gameId, currentStatus) => {
    const token = adminToken || localStorage.getItem('token')
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
        showToast(`Game status updated successfully!`, 'success')
        fetchGames()
      } else {
        const err = await response.json()
        showToast(err.error || 'Failed to update status', 'error')
      }
    } catch (err) {
      showToast('Error updating game status', 'error')
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
      fetchGameCenterConfig()
    } else if (activeTab === 'config') {
      fetchStoreConfig()
    }
  }, [activeTab, withdrawFilter, withdrawSearch, withdrawPage, usersSearch, usersPage, ordersStatusFilter, ordersPage, complaintsStatusFilter])

  const handleApprove = async (id) => {
    setWithdrawProcessingId(id)
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${id}/processing`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve request')
      showToast('Request approved successfully!', 'success')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setWithdrawProcessingId(null)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectId) return
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${rejectId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rejectionReason: rejectNote,
          predefinedReason: predefinedReason
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject request')
      showToast('Request rejected and user balance re-credited successfully.', 'success')
      setShowRejectModal(false)
      setRejectId(null)
      setRejectNote('')
      setPredefinedReason('Suspicious betting pattern detected')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    if (!payId || !payUtr.trim()) return
    const token = adminToken || localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${payId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ utrNumber: payUtr, adminNote: payNote })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to mark as paid')
      showToast('Request marked as PAID and locked funds permanently released.', 'success')
      setShowPayModal(false)
      setPayId(null)
      setPayUtr('')
      setPayNote('')
      await fetchWithdrawals()
      await fetchDashboardData()
    } catch (err) {
      showToast(err.message, 'error')
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

  const handleAddProductSubmit = async (e) => {
    e.preventDefault()
    if (!isSuperAdmin && !isAdmin) return
    if (!newProductTitle || !newProductPrice) {
      showToast('Title and price are required', 'error')
      return
    }

    const formData = new FormData()
    formData.append('title', newProductTitle)
    formData.append('discount_price', newProductPrice)
    formData.append('price', newProductOriginal || (parseFloat(newProductPrice) * 1.5).toString())
    formData.append('stock_count', newProductStock || '100')
    formData.append('category', newProductCategory || 'Tech')
    formData.append('description', newProductDesc || '')
    if (newProductImageFiles && newProductImageFiles.length > 0) {
      newProductImageFiles.forEach(file => {
        formData.append('images', file)
      })
    }

    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    const token = localStorage.getItem('token')

    try {
      const response = await axios.post(`${API_BASE}/api/admin/products`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 201) {
        showToast('Product created successfully!', 'success')
        
        const mapProduct = (p) => {
          const resolveImg = (imgStr) => {
            if (!imgStr) return '/src/assets/earbuds.png';
            if (imgStr.startsWith('/uploads/')) {
              return `${API_BASE}${imgStr}`;
            }
            return imgStr;
          };
          return {
            ...p,
            id: p.id,
            image: resolveImg(p.image),
            images: p.images ? p.images.map(resolveImg) : [resolveImg(p.image)]
          };
        }
        setProducts(prev => [mapProduct(response.data), ...prev])
        
        // Reset Form
        setNewProductTitle('')
        setNewProductPrice('')
        setNewProductOriginal('')
        setNewProductBadge('')
        setNewProductDesc('')
        setNewProductStock('100')
        setNewProductCategory('Tech')
        setNewProductImageFiles([])
        setNewProductImagePreviews([])
        setShowAddProductModal(false)
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to create product'
      showToast(errMsg, 'error')
    }
  }

  const handleStartEditProduct = (product) => {
    setEditingProduct(product)
    setEditProductTitle(product.title)
    setEditProductPrice(product.price ? product.price.toString() : '')
    setEditProductOriginal(product.original ? product.original.toString() : '')
    setEditProductStock(product.stock ? product.stock.toString() : '100')
    setEditProductCategory(product.category || 'Tech')
    setEditProductDesc(product.desc || '')
    setEditProductImageFiles([])
    setEditProductImagePreviews(product.images || (product.image ? [product.image] : []))
    setShowEditProductModal(true)
  }

  const handleEditProductSubmit = async (e) => {
    e.preventDefault()
    if (!isSuperAdmin && !isAdmin) return
    if (!editingProduct) return
    if (!editProductTitle || !editProductPrice) {
      showToast('Title and price are required', 'error')
      return
    }

    const formData = new FormData()
    formData.append('title', editProductTitle)
    formData.append('discount_price', editProductPrice)
    formData.append('price', editProductOriginal || (parseFloat(editProductPrice) * 1.5).toString())
    formData.append('stock_count', editProductStock)
    formData.append('category', editProductCategory)
    formData.append('description', editProductDesc)
    if (editProductImageFiles && editProductImageFiles.length > 0) {
      editProductImageFiles.forEach(file => {
        formData.append('images', file)
      })
    }

    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`
    const token = localStorage.getItem('token')

    try {
      const response = await axios.put(`${API_BASE}/api/admin/products/${editingProduct.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 200) {
        showToast('Product updated successfully!', 'success')
        
        const mapProduct = (p) => {
          const resolveImg = (imgStr) => {
            if (!imgStr) return '/src/assets/earbuds.png';
            if (imgStr.startsWith('/uploads/')) {
              return `${API_BASE}${imgStr}`;
            }
            return imgStr;
          };
          return {
            ...p,
            id: p.id,
            image: resolveImg(p.image),
            images: p.images ? p.images.map(resolveImg) : [resolveImg(p.image)]
          };
        }
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? mapProduct(response.data) : p))
        
        // Reset state
        setEditingProduct(null)
        setEditProductTitle('')
        setEditProductPrice('')
        setEditProductOriginal('')
        setEditProductStock('')
        setEditProductCategory('')
        setEditProductDesc('')
        setEditProductImageFiles([])
        setEditProductImagePreviews([])
        setShowEditProductModal(false)
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to update product'
      showToast(errMsg, 'error')
    }
  }

  const filteredWithdrawals = withdrawals.filter(req => {
    // Client-side status filtering corresponding to tab selection
    const matchesStatus = 
      withdrawFilter === 'ALL' || 
      (withdrawFilter === 'PENDING' && (req.status === 'PENDING' || req.status === 'PROCESSING')) ||
      (withdrawFilter === 'COMPLETED' && (req.status === 'PAID' || req.status === 'APPROVED')) ||
      (req.status === withdrawFilter);
    
    if (!matchesStatus) return false;

    const query = withdrawSearch?.toLowerCase() || '';
    if (!query) return true;
    
    // Defensive fields matching to prevent undefined/breaks
    return (
      req.id?.toString().toLowerCase().includes(query) ||
      (req.user_name || req.userName)?.toString().toLowerCase().includes(query) ||
      (req.phone_number || req.userPhone || req.phone)?.toString().includes(query) ||
      (req.withdrawal_id || req.withdrawalId)?.toString().toLowerCase().includes(query)
    );
  });

  const filteredLogs = logs.filter(log => {
    const matchesFilter = logFilter === 'ALL' || log.type === logFilter
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || 
                          log.type.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.time.includes(logSearch)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative overflow-hidden">
      <style>{`
        /* Custom Scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(7, 11, 19, 0.6);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.25);
          border-radius: 8px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.45);
        }

        /* Base Body Grid Background Override */
        .min-h-screen.bg-slate-955,
        .min-h-screen.bg-slate-950 {
          background-color: #0b0f19 !important;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 40%),
            linear-gradient(to right, rgba(255, 255, 255, 0.006) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.006) 1px, transparent 1px) !important;
          background-size: auto, auto, 24px 24px, 24px 24px !important;
        }

        /* Glassmorphism Cards Overrides */
        .bg-slate-900\/40.backdrop-blur-md,
        .bg-slate-900\/40.backdrop-blur-xl,
        .bg-slate-900\/80.backdrop-blur-md {
          background: rgba(19, 26, 38, 0.4) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.3) !important;
          border-radius: 12px !important;
        }

        /* Sidebar Overrides */
        aside {
          background: rgba(10, 15, 30, 0.4) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(24px) !important;
          position: relative;
          z-index: 10;
        }

        /* Sidebar Navigation Buttons */
        aside nav button {
          border-radius: 12px !important;
          margin-bottom: 6px !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          font-size: 10px !important;
          border: 1px solid transparent !important;
          padding: 10px 14px !important;
        }
        aside nav button:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.03) !important;
          transform: translateX(2px);
        }

        /* Sidebar Active Button Override */
        aside nav button.bg-indigo-650 {
          background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%) !important;
          box-shadow: 0 4px 15px rgba(79, 70, 229, 0.25) !important;
          border-left: 3px solid #6366f1 !important;
          color: #fff !important;
        }

        /* Table styling override */
        table {
          border-collapse: separate !important;
          border-spacing: 0 8px !important;
          width: 100% !important;
        }
        thead tr {
          background: transparent !important;
        }
        thead th {
          padding: 14px 16px !important;
          font-size: 10px !important;
          font-weight: 800 !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
          color: rgba(148, 163, 184, 0.7) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        tbody tr {
          background: rgba(15, 23, 42, 0.18) !important;
          border: 1px solid rgba(255, 255, 255, 0.02) !important;
          border-radius: 16px !important;
          transition: all 0.2s ease-in-out !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
        tbody tr:hover {
          background: rgba(15, 23, 42, 0.35) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.06) !important;
          border-color: rgba(99, 102, 241, 0.12) !important;
        }
        tbody td {
          padding: 16px !important;
          border-top: 1px solid rgba(255, 255, 255, 0.02) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
        }
        tbody td:first-child {
          border-left: 1px solid rgba(255, 255, 255, 0.02) !important;
          border-top-left-radius: 16px !important;
          border-bottom-left-radius: 16px !important;
        }
        tbody td:last-child {
          border-right: 1px solid rgba(255, 255, 255, 0.02) !important;
          border-top-right-radius: 16px !important;
          border-bottom-right-radius: 16px !important;
        }

        /* Beautiful Action Buttons inside Table */
        tbody td button,
        .flex.items-center.gap-2.shrink-0 button {
          font-size: 10px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.06em !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          transition: all 0.15s ease !important;
          border: 1px solid transparent !important;
          cursor: pointer !important;
        }
        tbody td button:hover,
        .flex.items-center.gap-2.shrink-0 button:hover {
          transform: translateY(-1px) !important;
          filter: brightness(1.1) !important;
        }
        tbody td button.bg-red-600 {
          background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%) !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
          color: #fff !important;
        }
        tbody td button.bg-indigo-600,
        tbody td button.bg-blue-600 {
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%) !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15) !important;
          color: #fff !important;
        }
        tbody td button.bg-emerald-600 {
          background: linear-gradient(135deg, #10b981 0%, #065f46 100%) !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15) !important;
          color: #fff !important;
        }

        /* Status Pills */
        span.bg-amber-500\/10,
        span.text-amber-400 {
          background: rgba(245, 158, 11, 0.06) !important;
          border: 1px solid rgba(245, 158, 11, 0.15) !important;
          color: #f59e0b !important;
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.25) !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
        }
        span.bg-emerald-500\/10,
        span.text-emerald-400 {
          background: rgba(16, 185, 129, 0.06) !important;
          border: 1px solid rgba(16, 185, 129, 0.15) !important;
          color: #10b981 !important;
          text-shadow: 0 0 8px rgba(16, 185, 129, 0.25) !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
        }

        /* Input Fields styling */
        input[type="text"],
        input[type="number"],
        input[type="password"],
        select {
          background: rgba(10, 15, 26, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          color: #fff !important;
          transition: all 0.2s ease !important;
        }
        input[type="text"]:focus,
        input[type="number"]:focus,
        input[type="password"]:focus,
        select:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12), inset 0 2px 4px rgba(0,0,0,0.3) !important;
        }

        /* Section Cards custom glow effects */
        .flex-1.p-4.lg\:p-8 > div > div.bg-slate-900 {
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
          border-radius: 28px !important;
          overflow: hidden;
        }
      `}</style>
      
      {/* Background decoration glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      
      {/* Security grid lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b05_1px,transparent_1px),linear-gradient(to_bottom,#1e293b05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      {/* ── Left Sidebar (Desktop only) ── */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/80 flex-col p-6 shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo Section */}

          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="RRClub Logo" className="w-9 h-9 rounded-xl object-cover shadow-lg border border-slate-700/50" />
            <div>
              <h1 className="text-sm font-black tracking-wide text-white uppercase">RRClub</h1>
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

          {isSuperAdmin && (
            <div className="p-3 bg-indigo-950/20 border border-indigo-900/35 rounded-xl space-y-2">
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Active Staff Status
              </div>
              {onlineAdmins.length === 0 ? (
                <div className="text-[10px] font-semibold text-slate-550 italic">No standard admins online</div>
              ) : (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {onlineAdmins.map((adm) => (
                    <div key={adm.id} className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                      <span className="truncate pr-1">{adm.name}</span>
                      <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Online
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              // Guard withdrawals and logs options so they are visible only to admin or super_admin
              if ((tab.id === 'withdrawals' || tab.id === 'logs') && 
                  !(user?.role === 'admin' || user?.role === 'super_admin')) {
                return null
              }
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = tab.id === 'withdrawals' ? pendingWithdrawals :
                            tab.id === 'appeals' ? pendingAppeals :
                            tab.id === 'support' ? openComplaints : 0
              const displayName = count > 0 ? `${tab.label} (${count})` : tab.label
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-150 cursor-pointer border-0 relative ${
                    isActive
                      ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  {displayName}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-[#0c1225] shadow-lg animate-pulse leading-none">
                      {count}
                    </span>
                  )}
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
              // Guard withdrawals and logs options so they are visible only to admin or super_admin
              if ((tab.id === 'withdrawals' || tab.id === 'logs') && 
                  !(user?.role === 'admin' || user?.role === 'super_admin')) {
                return null
              }
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = tab.id === 'withdrawals' ? pendingWithdrawals :
                            tab.id === 'appeals' ? pendingAppeals :
                            tab.id === 'support' ? openComplaints : 0
              const displayName = count > 0 ? `${tab.label} (${count})` : tab.label
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border-0 cursor-pointer relative ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  <span>{displayName}</span>
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[7px] font-black text-white ring-1 ring-slate-900 shadow-sm animate-pulse leading-none">
                      {count}
                    </span>
                  )}
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
            {isSuperAdmin && riskAlerts && riskAlerts.filter(a => !a.isResolved).length > 0 && (
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Active Players */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 transition-all hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 group">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Active Players</span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                    <Users size={12} className="text-indigo-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-bold text-white tracking-tight">{activePlayers.toLocaleString()}</p>
                  <span className="flex items-center gap-0.5 text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping shrink-0" /> Live
                  </span>
                </div>
              </div>

              {/* Card 2: Total Volume */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 transition-all hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 group">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Volume</span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-all">
                    <Wallet size={12} className="text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-bold text-white tracking-tight">₹{totalBets.toLocaleString()}</p>
                  <span className="text-[8px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    +1.2%
                  </span>
                </div>
              </div>

              {/* Card 3: Withdraw Queue */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 transition-all hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 group">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Withdraw Queue</span>
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-all">
                    <Clock size={12} className="text-amber-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-bold text-white tracking-tight">{pendingWithdrawals} Pending</p>
                  <button 
                    onClick={() => setPendingWithdrawals(0)}
                    disabled={isAdmin}
                    className={`flex items-center gap-0.5 text-[8.5px] font-bold px-2 py-0.5 rounded cursor-pointer border-0 transition-all ${
                      isAdmin 
                        ? 'bg-slate-800/45 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:scale-[1.02]'
                    }`}
                  >
                    {isAdmin ? '🔒' : 'Clear'}
                  </button>
                </div>
              </div>

              {/* Card 4: Engine Status */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 transition-all hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 group">
                <div className="flex items-center justify-between text-slate-400 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Engine Status</span>
                  <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                    <Activity size={12} className="text-red-400" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                    Online
                  </p>
                  <span className="text-[8px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                    Node 01
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Performance Overview */}
            {financialData && financialData.summary && (
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
                        <p className="text-xl font-extrabold text-white">₹{(financialData?.summary?.grossVolume || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Platform Profit Margin</p>
                        <p className="text-xl font-extrabold text-emerald-400">₹{(financialData?.summary?.platformProfit || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Total User Wallet Liabilities</p>
                        <p className="text-xs font-extrabold text-slate-350 mt-1 leading-relaxed">
                          Real Wallets: ₹{(financialData?.summary?.walletBalances || 0).toLocaleString()}<br/>
                          Bonus Wallets: ₹{(financialData?.summary?.bonusBalances || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-500 font-bold uppercase">
                    <span>Deposits: ₹{(financialData?.summary?.totalDeposits || 0).toLocaleString()}</span>
                    <span>Withdraws: ₹{(financialData?.summary?.totalWithdrawals || 0).toLocaleString()}</span>
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
                            showToast('Enter a valid number between 0 and 100', 'error');
                            return;
                          }
                          const token = adminToken || localStorage.getItem('token');
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
                            showToast(`Dice Pro Round ${diceRoundId} outcome overridden to ${val.toFixed(2)}`, 'success');
                            if(input) input.value = '';
                          } else {
                            showToast(data.error || 'Failed to override outcome', 'error');
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
                            showToast('Please select both a winning number and color', 'error');
                            return;
                          }
                          const outcomeStr = `${winNum} ${winCol.toUpperCase()}`;
                          const token = adminToken || localStorage.getItem('token');
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
                            showToast(`Colour prediction Round ${colourRoundId} outcome overridden to ${outcomeStr}`, 'success');
                            if(numInput) numInput.value = '';
                            if(colInput) colInput.value = '';
                          } else {
                            showToast(data.error || 'Failed to override outcome', 'error');
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
        {activeTab === 'users' && (isSuperAdmin || isAdmin) && (
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

        {/* ── TABS: SYSTEM LOGS (Restricted to Super Admin) ── */}
        {activeTab === 'logs' && isSuperAdmin && (
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

        {/* ── TABS: CREDENTIALS ── */}
        
        {activeTab === 'credentials' && (isSuperAdmin || isAdmin) && (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out] pb-20 font-sans">
            {/* Header Vault Banner */}
            <div className="bg-[#0b1021]/80 backdrop-blur-xl border border-indigo-900/30 rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded font-black tracking-wider uppercase">Vault Secure</span>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold">Version 1.0.0</span>
                </div>
                <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2.5">
                  <Shield className="text-rose-500 w-6 h-6 animate-pulse" />
                  Credentials & Environment Vault
                </h2>
                <p className="text-xs text-slate-450 mt-1 max-w-xl leading-relaxed">
                  Manage third-party API configurations, mail services, SMS gateways, and secure webhook channels. Updates require 2FA authorization codes.
                </p>
              </div>
              <button 
                onClick={handleSaveEnvConfigs}
                disabled={envSaving}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-750 text-slate-955 px-5 py-2.5 rounded-xl transition-all font-black text-xs shadow-lg shadow-rose-500/10 disabled:opacity-50 cursor-pointer border-0 shrink-0 uppercase tracking-wider"
              >
                {envSaving ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Commit Configurations
              </button>
            </div>

            {envLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-xs font-bold">Unlocking credentials vault...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Email Credentials */}
                <div className="bg-[#0c1225]/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/15">
                        <Lock className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Email Communications</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">Resend API & Outbound settings</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">RESEND_API_KEY</label>
                        <div className="relative">
                          <input
                            type={visibleKeys.RESEND_API_KEY ? 'text' : 'password'}
                            value={envConfigs.RESEND_API_KEY}
                            onChange={(e) => handleEnvChange('RESEND_API_KEY', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder="re_..."
                          />
                          <button type="button" onClick={() => toggleKeyVisibility('RESEND_API_KEY')} className="absolute right-2 top-2 p-1 text-slate-555 hover:text-slate-300 bg-transparent border-0 cursor-pointer">
                            {visibleKeys.RESEND_API_KEY ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">SMTP_FROM_EMAIL</label>
                        <input
                          type="text"
                          value={envConfigs.SMTP_FROM_EMAIL}
                          onChange={(e) => handleEnvChange('SMTP_FROM_EMAIL', e.target.value)}
                          className="w-full h-9 bg-slate-955 border border-slate-800 focus:border-blue-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all"
                          placeholder="noreply@domain.com"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-5 pt-3 border-t border-slate-800/40">Used for registration OTPs & email confirmation.</div>
                </div>

                {/* AI Configuration */}
                <div className="bg-[#0c1225]/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/15">
                        <Activity className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Artificial Intelligence</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">Google Gemini API credentials</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">GEMINI_AI_API_KEY</label>
                        <div className="relative">
                          <input
                            type={visibleKeys.GEMINI_AI_API_KEY ? 'text' : 'password'}
                            value={envConfigs.GEMINI_AI_API_KEY}
                            onChange={(e) => handleEnvChange('GEMINI_AI_API_KEY', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder="AIzaSy..."
                          />
                          <button type="button" onClick={() => toggleKeyVisibility('GEMINI_AI_API_KEY')} className="absolute right-2 top-2 p-1 text-slate-555 hover:text-slate-300 bg-transparent border-0 cursor-pointer">
                            {visibleKeys.GEMINI_AI_API_KEY ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-5 pt-3 border-t border-slate-800/40">Powers administrative metrics audits & support bots.</div>
                </div>

                {/* Telegram Monitoring */}
                <div className="bg-[#0c1225]/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/15">
                        <AlertCircle className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">System Monitoring</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">Telegram Bot Dispatch & Chat Alerts</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">TELEGRAM_BOT_TOKEN</label>
                        <div className="relative">
                          <input
                            type={visibleKeys.TELEGRAM_BOT_TOKEN ? 'text' : 'password'}
                            value={envConfigs.TELEGRAM_BOT_TOKEN}
                            onChange={(e) => handleEnvChange('TELEGRAM_BOT_TOKEN', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-sky-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder="123456:ABC-DEF..."
                          />
                          <button type="button" onClick={() => toggleKeyVisibility('TELEGRAM_BOT_TOKEN')} className="absolute right-2 top-2 p-1 text-slate-555 hover:text-slate-300 bg-transparent border-0 cursor-pointer">
                            {visibleKeys.TELEGRAM_BOT_TOKEN ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">TELEGRAM_CHAT_ID</label>
                        <input
                          type="text"
                          value={envConfigs.TELEGRAM_CHAT_ID}
                          onChange={(e) => handleEnvChange('TELEGRAM_CHAT_ID', e.target.value)}
                          className="w-full h-9 bg-slate-955 border border-slate-800 focus:border-sky-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all"
                          placeholder="-100..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-5 pt-3 border-t border-slate-800/40">Dispatches real-time withdrawal & security audit alerts.</div>
                </div>

                {/* Gateway Integration */}
                <div className="bg-[#0c1225]/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/15">
                        <Wallet className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Payment Gateway</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">Pay0 gateway API config settings</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">PAY0_USER_TOKEN</label>
                        <div className="relative">
                          <input
                            type={visibleKeys.PAY0_USER_TOKEN ? 'text' : 'password'}
                            value={envConfigs.PAY0_USER_TOKEN}
                            onChange={(e) => handleEnvChange('PAY0_USER_TOKEN', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder="gw_..."
                          />
                          <button type="button" onClick={() => toggleKeyVisibility('PAY0_USER_TOKEN')} className="absolute right-2 top-2 p-1 text-slate-555 hover:text-slate-300 bg-transparent border-0 cursor-pointer">
                            {visibleKeys.PAY0_USER_TOKEN ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Webhook URL - Editable */}
                      <div className="space-y-1 mt-3 pt-3 border-t border-slate-800/40">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">PAY0_WEBHOOK_URL</label>
                        <div className="relative flex items-center gap-1">
                          <input
                            type="text"
                            value={envConfigs.PAY0_WEBHOOK_URL}
                            onChange={(e) => handleEnvChange('PAY0_WEBHOOK_URL', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder={`${window.location.origin}/api/payment/webhook`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const url = envConfigs.PAY0_WEBHOOK_URL || `${window.location.origin}/api/payment/webhook`;
                              navigator.clipboard.writeText(url);
                              showToast('Webhook URL copied!', 'success');
                            }}
                            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-450 hover:text-white cursor-pointer border-0 shrink-0 transition-colors flex items-center justify-center"
                            title="Copy Webhook URL"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-600 mt-0.5">Leave empty to auto-detect from current domain. Set your production domain URL when going live (e.g. https://yourdomain.com/api/payment/webhook)</p>
                      </div>

                      {/* Redirect URL - Editable */}
                      <div className="space-y-1 mt-3">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">PAY0_REDIRECT_URL</label>
                        <div className="relative flex items-center gap-1">
                          <input
                            type="text"
                            value={envConfigs.PAY0_REDIRECT_URL}
                            onChange={(e) => handleEnvChange('PAY0_REDIRECT_URL', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder={`${window.location.origin}/#/wallet?tab=deposit`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const url = envConfigs.PAY0_REDIRECT_URL || `${window.location.origin}/#/wallet?tab=deposit`;
                              navigator.clipboard.writeText(url);
                              showToast('Redirect URL copied!', 'success');
                            }}
                            className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-450 hover:text-white cursor-pointer border-0 shrink-0 transition-colors flex items-center justify-center"
                            title="Copy Redirect URL"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-600 mt-0.5">Where users are sent after payment. Leave empty to auto-detect. Set your production URL when going live (e.g. https://yourdomain.com/#/wallet?tab=deposit)</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-5 pt-3 border-t border-slate-800/40">Webhook and redirect URLs auto-detect from your current domain. Set production URLs before going live.</div>
                </div>

                {/* SMS OTP Gateway */}
                <div className="bg-[#0c1225]/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/60 shadow-lg transition-all duration-300 group flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/15">
                        <Settings className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">SMS OTP Gateway</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5">Renflair SMS API credentials</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">RENFLAIR_SMS_API_KEY</label>
                        <div className="relative">
                          <input
                            type={visibleKeys.RENFLAIR_SMS_API_KEY ? 'text' : 'password'}
                            value={envConfigs.RENFLAIR_SMS_API_KEY}
                            onChange={(e) => handleEnvChange('RENFLAIR_SMS_API_KEY', e.target.value)}
                            className="w-full h-9 bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all pr-10 font-mono"
                            placeholder="8b23ea8ee7..."
                          />
                          <button type="button" onClick={() => toggleKeyVisibility('RENFLAIR_SMS_API_KEY')} className="absolute right-2 top-2 p-1 text-slate-555 hover:text-slate-300 bg-transparent border-0 cursor-pointer">
                            {visibleKeys.RENFLAIR_SMS_API_KEY ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[8px] text-slate-600 mt-5 pt-3 border-t border-slate-800/40">Dispatches user authentication codes during registers.</div>
                </div>
              </div>
            )}
          </div>
        )}

        
        {/* Alerts & Notifications Center */}
        {activeTab === 'notifications' && isSuperAdmin && (
          <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Bell className="text-purple-400" /> Centralized Alerts & Notifications Center
                </h2>
                <p className="text-gray-400 mt-1">Dispatch global broadcasts or target specific users.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Broadcast Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="text-purple-400 w-5 h-5" /> New Broadcast
                  </h3>
                  
                  <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
                      <select 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value)}
                      >
                        <option value="ALL">Broadcast to All Users</option>
                        <option value="SPECIFIC_USER">Target Specific User ID</option>
                      </select>
                    </div>

                    <div className={`transition-all duration-300 overflow-hidden ${broadcastTarget === 'SPECIFIC_USER' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. 1"
                        value={broadcastUserId}
                        onChange={(e) => setBroadcastUserId(e.target.value)}
                        required={broadcastTarget === 'SPECIFIC_USER'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Notification Type</label>
                      <select 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        value={broadcastType}
                        onChange={(e) => setBroadcastType(e.target.value)}
                      >
                        <option value="SYSTEM_ALERT">System Alert</option>
                        <option value="COUPON">Coupon / Promo</option>
                        <option value="WITHDRAWAL">Withdrawal Notice</option>
                        <option value="DEPOSIT">Deposit Notice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                      <input 
                        type="text"
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="e.g. Maintenance Break"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Message Body</label>
                      <textarea 
                        className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
                        placeholder="Enter the broadcast message..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        required
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={broadcasting}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {broadcasting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                      {broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Broadcast Logs */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm relative overflow-hidden group">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Database className="text-purple-400 w-5 h-5" /> Recent Broadcast Logs
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                        <tr>
                          <th className="px-6 py-4 rounded-tl-xl">Time</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Target</th>
                          <th className="px-6 py-4">Title</th>
                          <th className="px-6 py-4 rounded-tr-xl">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {broadcastLogs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center py-8 text-gray-500">No broadcasts found.</td>
                          </tr>
                        ) : (
                          broadcastLogs.map((log) => (
                            <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded-lg text-xs font-medium border border-gray-700">
                                  {log.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {log.userId === null ? (
                                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium">ALL USERS</span>
                                ) : (
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">USER {log.userId}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-white font-medium">{log.title}</td>
                              <td className="px-6 py-4 max-w-xs truncate" title={log.message}>{log.message}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appeals' && (isSuperAdmin || isAdmin) && (
          <div className="space-y-4">
            {/* PAYMENT APPEALS CARD */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-700/60 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    💳 Payment Dispute Appeals Queue
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Verify customer payment screenshots and manually settle pending deposits.</p>
                </div>
                <button
                  onClick={fetchAppeals}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-350 text-[10px] font-bold border border-slate-700/50 transition-all cursor-pointer"
                >
                  Refresh Queue
                </button>
              </div>

              {/* Direct Verify Tool */}
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 mb-4 flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Direct Order Verification Tool</label>
                  <input
                    type="text"
                    id="directOrderIdInput"
                    placeholder="Enter order ID (e.g. RR-DEP-178...)"
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 rounded-lg text-xs placeholder:text-slate-650 focus:outline-none transition-all font-mono"
                  />
                </div>
                <button
                  onClick={async () => {
                    const val = document.getElementById('directOrderIdInput')?.value?.trim();
                    if (!val) {
                      showToast('Please enter a valid order ID', 'error');
                      return;
                    }
                    await handleManualVerifyPay0(val);
                  }}
                  className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-650 text-white text-[10px] font-bold border-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/15 shrink-0"
                >
                  Verify Gateway Status
                </button>
              </div>

              {/* Appeals List Table */}
              {appealsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <div className="w-5 h-5 border-2 border-indigo-550 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-[10px] font-semibold">Loading disputes queue...</p>
                </div>
              ) : appealsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                  <p className="text-[10px] font-bold text-slate-450">No pending appeal records found</p>
                  <p className="text-[8px] text-slate-500 mt-1">Disputed payment appeals filed by users will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">User Details</th>
                        <th className="py-2.5">Disputed UTR</th>
                        <th className="py-2.5">WhatsApp Info</th>
                        <th className="py-2.5">Screenshot</th>
                        <th className="py-2.5">Submitted</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {appealsList.map((appeal) => (
                        <tr key={appeal.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-2.5">
                            <span className="font-bold text-white block">{appeal.userName}</span>
                            <span className="text-[10px] text-slate-550 font-mono block mt-0.5">{appeal.userPhone}</span>
                          </td>
                          <td className="py-2.5 font-mono font-bold text-indigo-400 select-all">{appeal.utrNumber}</td>
                          <td className="py-2.5 font-mono text-slate-350">{appeal.whatsappNumber}</td>
                          <td className="py-2.5">
                            <a
                              href={`${import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':5000')}${appeal.screenshotUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                            >
                              View Image
                            </a>
                          </td>
                          <td className="py-2.5 text-slate-500 text-[10px]">
                            {new Date(appeal.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                              appeal.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                                : appeal.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-455 border-amber-500/20'
                            }`}>
                              {appeal.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                            {appeal.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleResolveAppeal(appeal.id, 'approved')}
                                  disabled={resolvingAppeals[appeal.id]}
                                  className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleResolveAppeal(appeal.id, 'rejected')}
                                  disabled={resolvingAppeals[appeal.id]}
                                  className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* STORE CONFIGURATIONS CARD */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-700/60 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Settings size={14} className="text-indigo-400" />
                    Store & Core Settings
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Configure game modes, balance parameters, and maintenance states.</p>
                </div>
                <button
                  onClick={() => setIsStoreConfigEditing(!isStoreConfigEditing)}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-lg cursor-pointer border-0 flex items-center gap-1 transition-all ${
                    isStoreConfigEditing 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-800/80' 
                      : 'bg-slate-800 text-slate-350 hover:bg-slate-750'
                  }`}
                >
                  {isStoreConfigEditing ? 'Lock Settings' : 'Edit Settings'}
                </button>
              </div>

              <form onSubmit={handleSaveStoreConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Game Settings Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Game Mode</label>
                    <select
                      value={storeConfig.gameSettings}
                      disabled={!isStoreConfigEditing}
                      onChange={(e) => setStoreConfig({ ...storeConfig, gameSettings: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950/50 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-lg disabled:opacity-50 transition-all font-semibold"
                    >
                      <option value="standard">Standard Mode</option>
                      <option value="high_yield">High Yield Mode</option>
                      <option value="conservative">Conservative Mode</option>
                    </select>
                  </div>

                  {/* Traffic Threshold */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Traffic Balance Threshold (₹)</label>
                    <input
                      type="number"
                      value={storeConfig.trafficThresholdAmount}
                      disabled={!isStoreConfigEditing}
                      onChange={(e) => setStoreConfig({ ...storeConfig, trafficThresholdAmount: parseInt(e.target.value, 10) || 0 })}
                      className="w-full h-9 px-3 bg-slate-950/50 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-lg disabled:opacity-50 transition-all font-semibold"
                    />
                  </div>

                  {/* Maintenance State */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">System State</label>
                    <select
                      value={storeConfig.systemMaintenance}
                      disabled={!isStoreConfigEditing}
                      onChange={(e) => setStoreConfig({ ...storeConfig, systemMaintenance: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950/50 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-lg disabled:opacity-50 transition-all font-semibold"
                    >
                      <option value="active">Active / Online</option>
                      <option value="maintenance">Maintenance Mode</option>
                    </select>
                  </div>

                  {/* Pay0 User Token */}
                  <div className="space-y-1.5 md:col-span-3 font-sans">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pay0 User Token / API Key</label>
                    <input
                      type="text"
                      value={storeConfig.pay0UserToken || storeConfig.pay0_user_token || ''}
                      disabled={!isStoreConfigEditing}
                      onChange={(e) => setStoreConfig({ ...storeConfig, pay0UserToken: e.target.value })}
                      placeholder="Enter Pay0 gateway API credentials token"
                      className="w-full h-9 px-3 bg-slate-955 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 rounded-lg disabled:opacity-50 transition-all font-mono"
                    />
                  </div>
                </div>

                {isStoreConfigEditing && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={storeConfigSaving}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-xs text-slate-955 font-bold rounded-lg hover:from-emerald-600 hover:to-teal-650 transition-all cursor-pointer border-0 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                    >
                      {storeConfigSaving ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save size={13} /> Save Configurations
                        </>
                      )}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* DYNAMIC TRAFFIC BOT CONTROLS CARD */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-700/60 animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    🤖 Dynamic Traffic Bot Controls
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Fine-tune the virtual wagers balancing threshold dynamically.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Traffic Threshold Amount (₹)</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      pattern="\d*"
                      placeholder="e.g. 500"
                      value={botThreshold}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ''); // Sanitized Input Clamping: digits only
                        setBotThreshold(val);
                      }}
                      className="h-9 px-3 w-full border border-slate-800 rounded-lg text-sm bg-slate-950/50 text-slate-100 focus:outline-none focus:border-slate-700 transition-all font-mono"
                    />
                    <button
                      onClick={handleUpdateBotThreshold}
                      disabled={botThresholdSaving || !botThreshold}
                      className="h-9 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-750 text-xs text-white font-bold rounded-lg transition-all border-0 cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                    >
                      {botThresholdSaving ? 'Saving...' : 'Update'}
                    </button>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-normal">
                    This threshold sets the target amount for virtual bots. If real wagers in a round are below this value, bot traffic fills the gap to ensure realistic wagers volume.
                  </p>
                </div>
              </div>
            </div>

            {/* BANNERS SECTION */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-400" />
                Dashboard Banners
              </h3>
              <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Manage top carousel slides displayed on the user homepage.</p>
            </div>
            {(isSuperAdmin || isAdmin) && (
              <button
                onClick={() => {
                  setNewBannerTitle('')
                  setNewBannerSubtitle('')
                  setNewBannerGradient('from-indigo-650 to-purple-800')
                  setNewBannerAction('/win')
                  setShowAddBannerModal(true)
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 border-0 shadow-lg shadow-emerald-500/10 transition-all shrink-0"
              >
                <Plus size={12} /> Add Slide
              </button>
            )}
          </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {banners.map((banner) => {
                  const isEditing = editingBannerId === banner.id
                  return (
                    <div key={banner.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Banner Title</label>
                            <input
                              type="text"
                              value={bannerEditTitle}
                              onChange={(e) => setBannerEditTitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Subtitle Description</label>
                            <textarea
                              value={bannerEditSubtitle}
                              onChange={(e) => setBannerEditSubtitle(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-16 resize-none transition-all"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingBannerId(null)}
                              className="px-3 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 transition-all border-0"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveBanner(banner.id)}
                              className="px-3 py-1.5 bg-emerald-500 text-[10px] text-slate-950 font-bold rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-1 border-0"
                            >
                              <Save size={12} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-white truncate">{banner.title}</p>
                              <span className="text-[8px] font-bold bg-slate-800 text-slate-400 px-1 rounded uppercase tracking-wider font-mono">
                                {banner.action}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{banner.subtitle}</p>
                          </div>
                          
                          {(isSuperAdmin || isAdmin) && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleStartEditBanner(banner)}
                                className="p-2 bg-slate-855 hover:bg-slate-755 text-slate-300 rounded-lg transition-colors border-0"
                                title="Edit Banner"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    message: 'Delete this banner?',
                                    onConfirm: () => deleteBanner(banner.id)
                                  });
                                }}
                                className="p-2 bg-red-955/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors border-0"
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
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-700/60">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/50">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Database size={14} className="text-pink-400" />
                    Tech Products Directory
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Manage catalog products used for spin wheel wagers and voucher redemption.</p>
                </div>
                {(isSuperAdmin || isAdmin) && (
                  <button
                    onClick={() => {
                      setNewProductTitle('')
                      setNewProductPrice('')
                      setNewProductOriginal('')
                      setNewProductDesc('')
                      setNewProductStock('100')
                      setNewProductCategory('Tech')
                      setNewProductImageFiles([])
                      setNewProductImagePreviews([])
                      setShowAddProductModal(true)
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-650 text-white text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1 border-0 shadow-lg shadow-pink-500/10"
                  >
                    <Plus size={12} /> Add Product
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between bg-slate-955/40 border border-slate-800/80 rounded-xl p-3 gap-3 hover:border-slate-700/50 transition-all">
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
                        <p className="text-[10px] text-slate-400 mt-1">
                          ₹{product.price.toLocaleString()} <span className="text-[9px] text-slate-500 line-through ml-1">₹{product.original?.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(isSuperAdmin || isAdmin) && (
                        <button
                          onClick={() => handleStartEditProduct(product)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg transition-colors cursor-pointer border-0"
                          title="Edit Product"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              message: 'Delete this product?',
                              onConfirm: () => deleteProduct(product.id)
                            });
                          }}
                          className="p-1.5 bg-red-955/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors cursor-pointer border-0"
                          title="Delete Product"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TABS: WITHDRAWALS ── */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-5 animate-[fadeIn_0.3s_ease-out] font-sans pb-20">
            
            {/* Quick Metrics Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending Queue</p>
                  <p className="text-xl font-black text-white mt-1">
                    {filteredWithdrawals.filter(w => w.status === 'PENDING').length} <span className="text-[10px] text-amber-500 font-normal">requests</span>
                  </p>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/15">
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Processing Queue</p>
                  <p className="text-xl font-black text-white mt-1">
                    {filteredWithdrawals.filter(w => w.status === 'PROCESSING').length} <span className="text-[10px] text-blue-505 font-normal">active</span>
                  </p>
                </div>
                <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/15">
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
              </div>

              <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Queue Value</p>
                  <p className="text-xl font-black text-emerald-450 mt-1 font-mono">
                    ₹{filteredWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/15">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <div className="bg-[#0b1021]/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Queue Total</p>
                  <p className="text-xl font-black text-white mt-1">
                    {withdrawTotalCount} <span className="text-[10px] text-slate-550 font-normal">total</span>
                  </p>
                </div>
                <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/15">
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </div>

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
                className="flex-1 h-10 bg-slate-950 border border-slate-850 focus:border-slate-700 text-slate-200 rounded-xl px-4 text-xs placeholder:text-slate-650 focus:outline-none transition-colors font-sans"
              />
              <button
                onClick={fetchWithdrawals}
                className="w-10 h-10 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center shrink-0"
                title="Refresh Queue"
              >
                <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
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
                  className={`px-4 py-1.5 rounded-full text-[9px] font-black border transition-all cursor-pointer shrink-0 uppercase tracking-wider border-0 ${
                    withdrawFilter === status
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/35 shadow-lg shadow-indigo-500/5'
                      : 'bg-[#0a0f1d] text-slate-500 border border-slate-900 hover:text-slate-350'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Withdrawals Grid/List */}
            {filteredWithdrawals.length === 0 ? (
              <div className="bg-[#0c1225]/40 border border-slate-850/80 rounded-2xl p-12 text-center text-slate-500 shadow-xl">
                <Clock size={32} className="mx-auto text-slate-700 mb-3" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No withdrawals found</p>
                <p className="text-[10px] text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">Withdrawal requests matching the criteria will list here.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block bg-[#0c1225]/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-slate-950/30 text-[9px] font-black text-slate-450 uppercase tracking-widest select-none">
                        <th className="px-6 py-3.5">User</th>
                        <th className="px-6 py-3.5">Request ID & Date</th>
                        <th className="px-6 py-3.5">Amount</th>
                        <th className="px-6 py-3.5">Method & Details</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {filteredWithdrawals.map((rec) => {
                        const isProcessing = withdrawProcessingId === rec.id
                        const isUpi = rec.paymentMethod === 'UPI'
                        const upiLink = isUpi
                          ? `upi://pay?pa=${rec.upiId}&pn=${encodeURIComponent(rec.userName || 'RRClub User')}&am=${rec.amount}&cu=INR&tn=${encodeURIComponent(rec.withdrawalId)}&tr=${encodeURIComponent(rec.withdrawalId)}`
                          : ''
                        const isExpanded = !!expandedRows[rec.id];
                        return (
                          <React.Fragment key={rec.id}>
                            <tr 
                              className={`hover:bg-slate-900/15 transition-all duration-200 cursor-pointer ${isExpanded ? 'bg-slate-950/20' : ''}`}
                              onClick={() => toggleRow(rec.id)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-slate-200">{rec.userName || 'Unknown User'}</div>
                                  <span className="text-[8px] text-slate-655 font-bold select-none">{isExpanded ? '▲' : '▼'}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{rec.userPhone || 'No Phone'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-mono text-slate-400 text-[11px]">{rec.withdrawalId}</div>
                                <div className="text-[10px] text-slate-550 mt-1">Created: {new Date(rec.createdAt).toLocaleString()}</div>
                                {rec.paidAt && <div className="text-[10px] text-emerald-500/80 font-bold mt-0.5">Paid: {new Date(rec.paidAt).toLocaleString()}</div>}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-black text-rose-450 font-mono">₹{parseFloat(rec.amount).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-1.5">
                                  <span className="text-[8px] font-black text-white bg-slate-800/80 border border-slate-700/30 px-1.5 py-0.5 rounded tracking-wide uppercase">{rec.paymentMethod}</span>
                                  {isUpi ? (
                                    <div className="text-[10px] text-slate-400 font-mono mt-1 select-all">{rec.upiId}</div>
                                  ) : (
                                    <div className="text-[10px] text-slate-455 space-y-0.5 select-all">
                                      <p className="truncate">Holder: {rec.accountHolderName}</p>
                                      <p className="font-mono">No: {rec.accountNumber}</p>
                                      <p className="font-mono text-[9px] text-slate-500">IFSC: {rec.ifscCode}</p>
                                    </div>
                                  )}
                                  {rec.utrNumber && (
                                    <div className="text-[9px] text-emerald-400 font-mono bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 inline-block select-all">
                                      UTR: {rec.utrNumber}
                                    </div>
                                  )}
                                  {rec.adminNote && (
                                    <div className="text-[9px] text-slate-500 bg-[#070b15]/40 border border-slate-855/55 p-2 rounded-lg mt-1 max-w-[220px] leading-relaxed">
                                      <span className="font-bold text-slate-400">Note:</span> {rec.adminNote}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider select-none ${
                                  rec.status === 'PAID' ? 'bg-emerald-550/10 text-emerald-400 border-emerald-500/20' :
                                  rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                                  rec.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  'bg-rose-500/10 text-rose-455 border-rose-500/20'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                {(isSuperAdmin || isAdmin) && (rec.status === 'PENDING' || rec.status === 'PROCESSING') && (
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setRejectId(rec.id);
                                        setShowRejectModal(true);
                                      }}
                                      disabled={isProcessing}
                                      className="px-2 py-1 bg-[#0b0c15] hover:bg-rose-955/20 border border-rose-900/30 text-rose-455 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                                    >
                                      Reject
                                    </button>
                                    {rec.status === 'PENDING' && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleApprove(rec.id);
                                        }}
                                        disabled={isProcessing}
                                        className="px-2 py-1 bg-[#0b0c15] hover:bg-blue-955/20 border border-blue-900/30 text-blue-400 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    {isUpi && (
                                      <button
                                        onClick={(e) => { 
                                          e.preventDefault(); 
                                          setUpiQrData(upiLink); 
                                          setPayId(rec.id); 
                                          setSelectedWithdrawal(rec); 
                                          setShowPayModal(true); 
                                        }}
                                        className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-955 font-black text-[9px] rounded-lg shadow-md hover:from-emerald-600 hover:to-teal-650 transition-all flex items-center gap-1 cursor-pointer border-0"
                                      >
                                        Pay via UPI
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setPayId(rec.id);
                                        setSelectedWithdrawal(rec);
                                        setShowPayModal(true);
                                      }}
                                      disabled={isProcessing}
                                      className="px-2 py-1 bg-emerald-500 text-slate-955 text-[9px] font-black rounded-lg hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-55 border-0"
                                    >
                                      Mark Paid
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-950/15">
                                <td colSpan={6} className="px-6 py-4 border-t border-b border-slate-800/40">
                                  <div className="bg-[#070b18]/90 p-4 rounded-2xl border border-slate-855/60 space-y-3.5 max-w-2xl shadow-inner">
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                                      👤 Live User Audit Dossier
                                    </h4>
                                    <div className="grid grid-cols-4 gap-3.5 text-xs font-mono font-bold">
                                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-855/50 flex flex-col justify-between">
                                        <p className="text-[8px] text-slate-500 uppercase font-sans font-bold mb-1.5">Total Deposits</p>
                                        <p className="text-emerald-450 text-sm">₹{parseFloat(rec.totalDeposits || 0).toFixed(2)}</p>
                                      </div>
                                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-855/50 flex flex-col justify-between">
                                        <p className="text-[8px] text-slate-500 uppercase font-sans font-bold mb-1.5">Total Withdrawals</p>
                                        <p className="text-rose-455 text-sm">₹{parseFloat(rec.totalWithdrawals || 0).toFixed(2)}</p>
                                      </div>
                                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-855/50 flex flex-col justify-between">
                                        <p className="text-[8px] text-slate-500 uppercase font-sans font-bold mb-1.5">Active Wagers</p>
                                        <p className="text-indigo-400 text-sm">₹{parseFloat(rec.totalWagers || 0).toFixed(2)}</p>
                                      </div>
                                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-855/50 flex flex-col justify-between">
                                        <p className="text-[8px] text-slate-500 uppercase font-sans font-bold mb-1.5">Net Margin (P/L)</p>
                                        <p className={`text-sm ${parseFloat(rec.totalDeposits || 0) - parseFloat(rec.totalWithdrawals || 0) >= 0 ? 'text-emerald-455' : 'text-rose-455'}`}>
                                          ₹{parseFloat((rec.totalDeposits || 0) - (rec.totalWithdrawals || 0)).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="lg:hidden space-y-3.5">
                  {filteredWithdrawals.map((rec) => {
                    const isProcessing = withdrawProcessingId === rec.id
                    const isUpi = rec.paymentMethod === 'UPI'
                    const upiLink = isUpi
                      ? `upi://pay?pa=${rec.upiId}&pn=${encodeURIComponent(rec.userName || 'RRClub User')}&am=${rec.amount}&cu=INR&tn=${encodeURIComponent(rec.withdrawalId)}&tr=${encodeURIComponent(rec.withdrawalId)}`
                      : ''

                    return (
                      <div 
                        key={rec.id} 
                        className="bg-[#0c1225]/40 border border-slate-850/80 rounded-2xl p-4.5 space-y-4 shadow-lg hover:border-slate-750 transition-all"
                      >
                        {/* Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-200">{rec.userName || 'Unknown User'}</span>
                              <span className="text-[9px] font-mono text-slate-550 bg-slate-950 px-1.5 py-0.5 rounded">{rec.withdrawalId}</span>
                            </div>
                            <p className="text-[9px] text-slate-450 mt-1 font-mono">{rec.userPhone || 'No Phone'}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-sm font-black text-rose-455 font-bold font-mono">₹{parseFloat(rec.amount).toFixed(2)}</span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              rec.status === 'PAID' ? 'bg-emerald-555/10 text-emerald-400 border-emerald-500/20' :
                              rec.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                              rec.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              'bg-rose-500/10 text-rose-455 border-rose-500/20'
                            }`}>
                              {rec.status}
                            </span>
                          </div>
                        </div>

                        {/* Info block */}
                        <div className="bg-slate-955/40 rounded-xl p-3 text-[10px] text-slate-400 space-y-2 border border-slate-850/50">
                          <div className="flex justify-between">
                            <span className="text-slate-550">Method:</span>
                            <span className="font-bold text-slate-200">{rec.paymentMethod}</span>
                          </div>
                          {isUpi ? (
                            <div className="flex justify-between">
                              <span className="text-slate-550">UPI ID:</span>
                              <span className="font-bold text-slate-200 font-mono select-all">{rec.upiId}</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-555">Holder:</span>
                                <span className="font-bold text-slate-200">{rec.accountHolderName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-555">Acc No:</span>
                                <span className="font-bold text-slate-200 font-mono select-all">{rec.accountNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-555">IFSC:</span>
                                <span className="font-bold text-slate-200 font-mono select-all">{rec.ifscCode}</span>
                              </div>
                            </>
                          )}
                          {rec.utrNumber && (
                            <div className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded text-emerald-400 font-mono mt-1 font-bold select-all">
                              <span>UTR:</span>
                              <span>{rec.utrNumber}</span>
                            </div>
                          )}
                          {rec.adminNote && (
                            <div className="bg-[#070b15]/40 rounded p-2 text-slate-450 text-[9px] leading-relaxed border border-slate-850/50">
                              <span className="font-bold text-slate-505 block mb-0.5">Admin Comment:</span>
                              {rec.adminNote}
                            </div>
                          )}
                          <div className="flex justify-between border-t border-slate-900 pt-1.5 mt-1 text-[9px] text-slate-550">
                            <span>Created: {new Date(rec.createdAt).toLocaleString()}</span>
                            {rec.paidAt && <span>Paid: {new Date(rec.paidAt).toLocaleString()}</span>}
                          </div>
                        </div>

                        {/* Admin operational actions panel */}
                        {(isSuperAdmin || isAdmin) && (rec.status === 'PENDING' || rec.status === 'PROCESSING') && (
                          <div className="flex gap-2 justify-end flex-wrap pt-1">
                            {/* Reject action */}
                            <button
                              onClick={() => {
                                setRejectId(rec.id)
                                setShowRejectModal(true)
                              }}
                              disabled={isProcessing}
                              className="px-2 py-1 bg-[#0b0c15] hover:bg-rose-955/20 border border-rose-900/30 text-rose-455 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                            >
                              Reject
                            </button>

                            {/* Approve action (Only when PENDING) */}
                            {rec.status === 'PENDING' && (
                              <button
                                onClick={() => handleApprove(rec.id)}
                                disabled={isProcessing}
                                className="px-2 py-1 bg-[#0b0c15] hover:bg-blue-955/20 border border-blue-900/30 text-blue-400 text-[9px] font-bold rounded-lg cursor-pointer transition-all disabled:opacity-55"
                              >
                                Approve
                              </button>
                            )}

                            {/* UPI "Pay Now" deep link button */}
                            {isUpi && (
                              <button
                                onClick={(e) => { e.preventDefault(); setUpiQrData(upiLink); setPayId(rec.id); setSelectedWithdrawal(rec); setShowPayModal(true); }}
                                className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-955 font-black text-[9px] rounded-lg shadow-md hover:from-emerald-600 hover:to-teal-650 transition-all flex items-center gap-1 cursor-pointer border-0 w-full justify-center"
                              >
                                Pay via UPI
                              </button>
                            )}

                            {/* Mark Paid action */}
                            <button
                              onClick={() => {
                                setPayId(rec.id)
                                setShowPayModal(true)
                              }}
                              disabled={isProcessing}
                              className="px-2 py-1 bg-emerald-500 text-slate-955 text-[9px] font-black rounded-lg hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-55 border-0"
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
        {activeTab === 'orders' && (isSuperAdmin || isAdmin) && (
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
        {activeTab === 'support' && (isSuperAdmin || isAdmin) && (
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
                        <th className="px-6 py-4">Evidence</th>
                        <th className="px-6 py-4">Status & Priority</th>
                        <th className="px-6 py-4">Staff Assignment</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {complaintsList.map((complaint) => (
                        <tr key={complaint.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 max-w-sm">
                            <div className="font-bold text-white text-[13px]">{complaint.subject}</div>
                            <div className="text-[11px] text-slate-350 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed mt-2 font-medium">
                              {complaint.description}
                            </div>
                            <div className="flex gap-2 flex-wrap items-center mt-2 text-[9px] text-slate-500">
                              <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 font-bold">UID: {complaint.userUid || 'N/A'}</span>
                              <span>·</span>
                              <span>Ticket ID: {complaint.id}</span>
                              <span>·</span>
                              <span>Created: {new Date(complaint.createdAt).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-300">
                            <div className="font-bold text-white">{complaint.userName}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{complaint.userPhone}</div>
                            {complaint.complaintType && (
                              <div className="text-[9px] text-indigo-400 font-bold mt-1.5 uppercase tracking-wider">
                                Order ID: {complaint.complaintType}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {complaint.imageUrl ? (
                              complaint.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                <a
                                  href={`${API_BASE}${complaint.imageUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors no-underline"
                                >
                                  <Paperclip size={12} />
                                  <span>PDF Evidence</span>
                                </a>
                              ) : (
                                <a
                                  href={`${API_BASE}${complaint.imageUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors no-underline"
                                >
                                  <Paperclip size={12} />
                                  <span>Image Evidence</span>
                                </a>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-600 font-bold">No Evidence</span>
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
                        <div className="mt-2">
                          {complaint.imageUrl.toLowerCase().endsWith('.pdf') ? (
                            <a
                              href={`${API_BASE}${complaint.imageUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors no-underline"
                            >
                              <Paperclip size={12} />
                              <span>View PDF Evidence</span>
                            </a>
                          ) : (
                            <a
                              href={`${API_BASE}${complaint.imageUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors no-underline"
                            >
                              <Paperclip size={12} />
                              <span>View Image Evidence</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="bg-slate-955/40 rounded-xl p-3 text-[10px] text-slate-400 space-y-1.5 border border-slate-850">
                        <p><span className="text-slate-500">Submitted by:</span> {complaint.userName} ({complaint.userPhone}) · <span className="font-mono text-indigo-400 font-bold">UID: {complaint.userUid || 'N/A'}</span></p>
                        <p><span className="text-slate-500">Ticket ID:</span> {complaint.id}</p>
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
        {activeTab === 'game-controls' && (isSuperAdmin || isAdmin) && (
          <div className="space-y-6">
            
            {/* Game Center Header Banner */}
            <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-48 h-full bg-gradient-to-l from-indigo-500/5 to-transparent blur-xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 size={18} className="text-indigo-400" />
                    <h2 className="text-sm font-black tracking-wider uppercase text-white">
                      🎯 Game Center Console
                    </h2>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed max-w-2xl">
                    Configure active slot engines, adjust platform-wide Return-to-Player (RTP) ratios, rotate cryptographically secure seeds, and manage live Jackpot pools.
                  </p>
                </div>
                <div className="flex bg-slate-950/80 border border-slate-850 p-1.5 rounded-xl shrink-0 gap-1 flex-wrap">
                  {[
                    { id: 'yield', label: 'Yield & Rules' },
                    { id: 'limits', label: 'Bet Limits' },
                    { id: 'jackpot', label: 'Jackpot Counter' },
                    { id: 'engines', label: 'Active Engines' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setGameCenterTab(tab.id)}
                      className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer border-0 ${
                        gameCenterTab === tab.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* INNER TAB: YIELD & RULES */}
            {gameCenterTab === 'yield' && (
              <div className="space-y-6">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-400" />
                    Custom Multiplier Rules
                  </h3>
                  
                  <form onSubmit={handleApplyGameCenterConfigs} className="space-y-5">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-955/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-emerald-400">Green Multiplier</span>
                            <span className="text-white font-mono">{colourMultiplierGreen}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="1.5" 
                            max="3.0" 
                            step="0.1"
                            value={colourMultiplierGreen} 
                            onChange={(e) => setColourMultiplierGreen(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded cursor-pointer"
                          />
                        </div>

                        <div className="bg-slate-955/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-violet-400">Violet Multiplier</span>
                            <span className="text-white font-mono">{colourMultiplierViolet}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="3.0" 
                            max="6.0" 
                            step="0.1"
                            value={colourMultiplierViolet} 
                            onChange={(e) => setColourMultiplierViolet(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded cursor-pointer"
                          />
                        </div>

                        <div className="bg-slate-955/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-rose-500">Red Multiplier</span>
                            <span className="text-white font-mono">{colourMultiplierRed}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="1.5" 
                            max="3.0" 
                            step="0.1"
                            value={colourMultiplierRed} 
                            onChange={(e) => setColourMultiplierRed(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded cursor-pointer"
                          />
                        </div>

                        <div className="bg-slate-955/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-indigo-400">Dice Commission Fee</span>
                            <span className="text-white font-mono">{diceHouseFee}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="10" 
                            step="0.5"
                            value={diceHouseFee} 
                            onChange={(e) => setDiceHouseFee(parseFloat(e.target.value))}
                            className="w-full accent-indigo-500 h-1 bg-slate-900 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSavingLimits}
                        className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer border-0"
                      >
                        {isSavingLimits ? 'Saving Rules...' : 'Apply Yield & Rules Config'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* INNER TAB: BET LIMITS */}
            {gameCenterTab === 'limits' && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={14} className="text-indigo-400" />
                  Limits & Stakes Bounds
                </h3>
                <form onSubmit={handleApplyGameCenterConfigs} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-955/60 p-4 rounded-xl border border-slate-800 space-y-3">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Colour Prediction Stakes Limits</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Min Bet (₹)</label>
                          <input 
                            type="number" 
                            value={minBetColour} 
                            onChange={(e) => setMinBetColour(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Max Bet (₹)</label>
                          <input 
                            type="number" 
                            value={maxBetColour} 
                            onChange={(e) => setMaxBetColour(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-955/60 p-4 rounded-xl border border-slate-800 space-y-3">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">Dice Game Pro Stakes Limits</span>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Min Bet (₹)</label>
                          <input 
                            type="number" 
                            value={minBetDice} 
                            onChange={(e) => setMinBetDice(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase block mb-0.5">Max Bet (₹)</label>
                          <input 
                            type="number" 
                            value={maxBetDice} 
                            onChange={(e) => setMaxBetDice(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingLimits}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer border-0"
                    >
                      {isSavingLimits ? 'Saving Bounds...' : 'Save Stakes Limits'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* INNER TAB: JACKPOT COUNTER */}
            {gameCenterTab === 'jackpot' && (
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy size={14} className="text-amber-500" />
                    Jackpot Counter & Seeding Parameters
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJackpotEnabled(!isJackpotEnabled);
                        showToast(`Jackpot pool ${!isJackpotEnabled ? 'enabled' : 'disabled'}!`, 'info');
                      }}
                      className={`px-3 py-1 text-[9px] font-black rounded-lg cursor-pointer border-0 uppercase ${
                        isJackpotEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {isJackpotEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleApplyGameCenterConfigs} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Seeding Amount (₹)</label>
                          <input 
                            type="number" 
                            value={jackpotSeed} 
                            onChange={(e) => setJackpotSeed(parseInt(e.target.value, 10))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Daily Increment (%)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={jackpotGrowth} 
                            onChange={(e) => setJackpotGrowth(parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-relaxed">
                        Seeding sets the base starting pool. Daily Increment automatically redirects a fraction of total bet volumes from all player tickets to grow the jackpot counter in real-time.
                      </p>
                    </div>

                    <div className="bg-[#0b1021]/50 p-4 rounded-xl border border-slate-800 space-y-3">
                      <span className="text-[10px] font-black text-amber-500 block uppercase tracking-wider">Trigger Manual Jackpot Winner</span>
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Schedule Winner (User ID or Phone)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 9876543210"
                          value={manualJackpotUser} 
                          onChange={(e) => setManualJackpotUser(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                      <p className="text-[8px] text-slate-500 leading-normal">
                        Enter a player's registered ID/phone number. The game outcome calculator will trigger a jackpot payout for this specific user on the next round they place a bet. Leave blank for normal random payouts.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingLimits}
                      className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer border-0"
                    >
                      {isSavingLimits ? 'Saving Setup...' : 'Re-seed & Apply Setup'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* INNER TAB: ACTIVE ENGINES */}
            {gameCenterTab === 'engines' && (
              <div className="space-y-6">
                {/* Game Engines Status */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Gamepad2 size={14} className="text-indigo-400" />
                    Dynamic Games Enable/Disable
                  </h3>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
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
                            <td className="px-6 py-4 font-mono text-slate-500">{g.id}</td>
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
                                    ? 'bg-red-955/30 hover:bg-red-900/45 text-red-400'
                                    : 'bg-emerald-950/30 hover:bg-emerald-900/45 text-emerald-400'
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
                      <div key={g.id} className="flex items-center justify-between bg-slate-955/60 border border-slate-850 rounded-xl p-3.5">
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
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Settings size={14} className="text-pink-400" />
                    Lucky Spin Wheel Prizes
                  </h3>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                          <th className="px-6 py-4">Prize Segment Name</th>
                          <th className="px-6 py-4">Prize Value</th>
                          <th className="px-6 py-4">Type</th>
                          <th className="px-6 py-4">Odds Weight</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-xs">
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
                                      className="bg-slate-955 border-slate-850 rounded text-indigo-500 focus:ring-0"
                                    />
                                    <label htmlFor={`active-desk-${prize.id}`} className="text-xs text-slate-350 select-none">Available</label>
                                  </div>
                                  <div className="flex gap-1.5 pb-1">
                                    <button
                                      type="button"
                                      onClick={() => setUpdatingSpinConfigId(null)}
                                      className="px-2.5 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 border-0 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-2.5 py-1.5 bg-emerald-500 text-slate-955 font-bold rounded-lg hover:bg-emerald-650 border-0 cursor-pointer"
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
                                  className="p-1.5 bg-slate-805 hover:bg-slate-750 text-slate-300 rounded-lg transition-colors border-0 cursor-pointer inline-flex"
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
                        <div key={prize.id} className="bg-slate-950/60 border border-slate-850 rounded-xl p-3.5 space-y-2.5">
                          {isConfigEditing ? (
                            <form onSubmit={handleUpdateSpinConfigSubmit} className="space-y-3">
                              <p className="text-xs font-bold text-white">Editing Segment: {prize.prizeName}</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-550 uppercase block mb-1">Weight (0-10000)*</label>
                                  <input
                                    type="number"
                                    required
                                    value={spinConfigWeight}
                                    onChange={(e) => setSpinConfigWeight(e.target.value)}
                                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-555 uppercase block mb-1">Prize Value (Cash/Bonus)*</label>
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
                                  className="bg-slate-955 border-slate-850 rounded text-indigo-500 focus:ring-0"
                                />
                                <label htmlFor={`active-${prize.id}`} className="text-xs text-slate-350">Prize Available in Wheel</label>
                              </div>

                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setUpdatingSpinConfigId(null)}
                                  className="px-2.5 py-1.5 bg-slate-800 text-[10px] font-bold rounded-lg text-slate-350 hover:bg-slate-750 border-0 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-2.5 py-1.5 bg-emerald-500 text-slate-955 font-bold rounded-lg hover:bg-emerald-600 border-0 cursor-pointer"
                                >
                                  Save Config
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex justify-between items-center gap-3">
                              <div>
                                <p className="text-xs font-bold text-white">{prize.prizeName}</p>
                                <p className="text-[10px] text-slate-450 mt-0.5">
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
        )}
      </div>

      {/* ── SUPER ADMIN: REJECT WITHDRAWAL MODAL ── */}
      {showRejectModal && (isSuperAdmin || isAdmin) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out] p-4">
          <div className="w-full max-w-md bg-[#0b1426]/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-955/60">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Reject Withdrawal Request</h3>
              <button 
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectId(null)
                  setRejectNote('')
                  setPredefinedReason('Suspicious betting pattern detected')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1.5">Predefined Reason</label>
                  <select
                    value={predefinedReason}
                    onChange={(e) => setPredefinedReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    {['Suspicious betting pattern detected', 'Insufficient turnover balance', 'Bank server experiencing downtime', 'Multiple registration mismatch'].map((r) => (
                      <option key={r} value={r} className="bg-[#0b1426] text-slate-100">{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1.5">Custom Explanation note (Max 150 chars)</label>
                  <textarea
                    required
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    maxLength={150}
                    placeholder="Provide additional details for rejection (will be shown to user)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 h-20 resize-none font-sans"
                  />
                  <div className="text-right text-[9px] text-slate-500 font-mono mt-1">
                    {rejectNote.length}/150
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false)
                      setRejectId(null)
                      setRejectNote('')
                      setPredefinedReason('Suspicious betting pattern detected')
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer border-0"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-650 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0 shadow-[0_4px_12px_rgba(220,38,38,0.2)]"
                  >
                    Confirm Reject
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      
      {/* ── SUPER ADMIN: MARK PAID WITHDRAWAL MODAL ── */}
      {showPayModal && (isSuperAdmin || isAdmin) && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-[fadeIn_0.15s_ease-out] p-4">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1426] rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-955">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <QrCode size={18} className="text-emerald-500"/> Record Payout Transaction
              </h3>
              <button 
                onClick={() => {
                  setShowPayModal(false)
                  setPayId(null)
                  setSelectedWithdrawal(null)
                  setPayUtr('')
                  setPayNote('')
                }}
                className="text-slate-400 hover:text-white cursor-pointer bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg border-0 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: QR Code Area */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center h-full">
                  <div className="w-full mb-6">
                    <h4 className="text-white text-sm font-bold mb-1 text-center">SCAN QR TO AUTO-FILL PAYOUT</h4>
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-955 p-3 rounded-lg border border-slate-800 gap-2">
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] text-slate-400 uppercase">User / Amount</p>
                        <p className="text-xs font-bold text-white">{selectedWithdrawal.userId} ({selectedWithdrawal.userName})</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-black text-emerald-400">₹{selectedWithdrawal.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-slate-800 mb-4 inline-block">
                    <QRCodeSVG 
                      value={upiQrData || `upi://pay?pa=${selectedWithdrawal.upiId}&pn=${encodeURIComponent(selectedWithdrawal.userName || 'RRClub User')}&am=${selectedWithdrawal.amount}&cu=INR&tn=${encodeURIComponent(selectedWithdrawal.withdrawalId)}&tr=${encodeURIComponent(selectedWithdrawal.withdrawalId)}`} 
                      size={220} 
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium text-center mt-1">Scan this QR code using any UPI app</p>

                  {/* Quick Payout App Deep Links */}
                  {(() => {
                    const baseLink = upiQrData || `upi://pay?pa=${selectedWithdrawal.upiId}&pn=${encodeURIComponent(selectedWithdrawal.userName || 'RRClub User')}&am=${selectedWithdrawal.amount}&cu=INR&tn=${encodeURIComponent(selectedWithdrawal.withdrawalId)}&tr=${encodeURIComponent(selectedWithdrawal.withdrawalId)}`;
                    const phonePeLink = baseLink.replace('upi://', 'phonepe://');
                    const gpayLink = baseLink.replace('upi://', 'tez://upi/');
                    const paytmLink = baseLink.replace('upi://', 'paytmmp://');
                    return (
                      <div className="w-full max-w-[280px] mt-4 space-y-3">
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                          <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Quick App Pay</span>
                          <span className="text-[9px] bg-slate-800 text-slate-350 px-1.5 py-0.5 rounded font-mono">Mobile Only</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href={phonePeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 hover:border-purple-600/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-purple-400 group-hover:scale-105 transition-transform">PhonePe</span>
                          </a>
                          <a
                            href={gpayLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-600/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-blue-450 group-hover:scale-105 transition-transform">GPay</span>
                          </a>
                          <a
                            href={paytmLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-center py-2.5 px-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500/50 transition-all duration-200 group text-center cursor-pointer no-underline"
                          >
                            <span className="text-[10px] font-black text-sky-400 group-hover:scale-105 transition-transform">Paytm</span>
                          </a>
                        </div>
                        <a
                          href={baseLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-[10px] uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-950/20 text-center cursor-pointer no-underline"
                        >
                          🚀 Open Default UPI App
                        </a>
                      </div>
                    );
                  })()}
                  
                  <div 
                    onClick={() => {
                      copyToClipboard(`RR-TXN-${selectedWithdrawal.id}`);
                      showSuccessToast('System Reference ID copied to clipboard!');
                    }}
                    className="bg-slate-950/60 hover:bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 cursor-pointer flex items-center justify-between gap-2 mt-4 select-none w-full max-w-[260px] transition-colors"
                  >
                    <span>📋 System Reference ID: <span className="text-emerald-400 font-bold">RR-TXN-{selectedWithdrawal.id}</span></span>
                    <Copy size={12} className="text-slate-500" />
                  </div>
                </div>

                {/* Right Side: Clipboard & Action Form */}
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h4 className="text-white text-xs font-bold mb-3 uppercase tracking-wider text-slate-400">Clipboard Dashboard</h4>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Target UPI ID</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={selectedWithdrawal.upiId || ''} className="bg-slate-955 border border-slate-800 text-emerald-400 text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(selectedWithdrawal.upiId); setCopiedState('upi'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'upi' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Amount (INR)</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={selectedWithdrawal.amount || ''} className="bg-slate-955 border border-slate-800 text-white text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(selectedWithdrawal.amount.toString()); setCopiedState('amount'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'amount' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 uppercase font-bold">Reference / Note</label>
                        <div className="flex items-center gap-2">
                          <input readOnly value={`Payout-${selectedWithdrawal.id}`} className="bg-slate-955 border border-slate-800 text-slate-400 text-sm font-bold py-2.5 px-3 rounded-lg w-full outline-none" />
                          <button type="button" onClick={(e) => { e.preventDefault(); copyToClipboard(`Payout-${selectedWithdrawal.id}`); setCopiedState('ref'); setTimeout(() => setCopiedState(''), 2000); }} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg border-0 cursor-pointer text-slate-300 transition-colors">
                            {copiedState === 'ref' ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-auto">
                    <form onSubmit={handlePaySubmit} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">12-Digit UTR Verification*</label>
                        <input
                          type="text"
                          required
                          value={payUtr}
                          onChange={(e) => setPayUtr(e.target.value)}
                          placeholder="Enter 12-digit UTR/TXN Ref ID..."
                          className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:font-normal placeholder:text-slate-600"
                        />
                      </div>
        
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Admin Comment (Optional)</label>
                        <textarea
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          placeholder="Add payment processing comment..."
                          className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-16 resize-none placeholder:text-slate-600"
                        />
                      </div>
        
                      <div className="flex gap-3 pt-3 border-t border-slate-800/50 mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectModal(true);
                            setRejectId(selectedWithdrawal.id);
                            setShowPayModal(false);
                          }}
                          className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                        >
                          Reject
                        </button>
                        <button
                          type="submit"
                          className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black rounded-xl transition-colors cursor-pointer border-0 shadow-lg shadow-emerald-500/20"
                        >
                          Confirm & Settle Payout
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              </div>
            </div>
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
      {selectedUserForAudit && (() => {
        const txns = selectedUserHistory.transactions || [];
        const bets = selectedUserHistory.bets || [];
        const totalWagered = bets.reduce((s, b) => s + parseFloat(b.betAmount || 0), 0);
        const totalWon = bets.reduce((s, b) => b.status === 'won' ? s + parseFloat(b.payoutAmount || 0) : s, 0);
        const netPnl = totalWon - totalWagered;
        const deposits = txns.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
        const withdrawals = txns.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] border border-slate-700/50">

            {/* ── GRADIENT HEADER ── */}
            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 px-6 pt-5 pb-14 shrink-0 overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3.5">
                  {/* User avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg shrink-0">
                    <span className="text-white font-black text-lg leading-none">
                      {(selectedUserForAudit.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-black text-base leading-none">{selectedUserForAudit.name}</h3>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-full">{selectedUserForAudit.role || 'user'}</span>
                    </div>
                    <p className="text-indigo-200 text-xs mt-1">{selectedUserForAudit.phone}</p>
                    <p className="text-indigo-300/70 text-[10px] font-mono mt-0.5">UID: {selectedUserForAudit.uid} · {selectedUserForAudit.email || 'No email'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUserForAudit(null); setSelectedUserHistory({ bets: [], transactions: [] }); }}
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer border-0 text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── STAT CARDS ROW ── */}
              <div className="flex gap-2.5 mt-4">
                {[
                  { label: 'Deposits', value: `₹${deposits.toFixed(0)}`, color: 'text-emerald-300' },
                  { label: 'Withdrawals', value: `₹${withdrawals.toFixed(0)}`, color: 'text-rose-300' },
                  { label: 'Total Wagered', value: `₹${totalWagered.toFixed(0)}`, color: 'text-blue-300' },
                  { label: 'Net P&L', value: `${netPnl >= 0 ? '+' : ''}₹${netPnl.toFixed(0)}`, color: netPnl >= 0 ? 'text-emerald-300' : 'text-rose-300' },
                ].map((s) => (
                  <div key={s.label} className="flex-1 bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-2.5 border border-white/10">
                    <p className="text-white/50 text-[9px] uppercase tracking-wider font-bold">{s.label}</p>
                    <p className={`${s.color} font-black text-sm mt-0.5`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TAB NAV (overlaps header) ── */}
            {!loadingUserHistory && (() => {
              const [auditTab, setAuditTab] = React.useState('ledger');
              return (
                <>
                  <div className="flex -mt-6 mx-5 gap-2 shrink-0 relative z-10">
                    {[
                      { id: 'ledger', label: `Ledger`, count: txns.length },
                      { id: 'wagers', label: `Wagers`, count: bets.length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setAuditTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border-0 shadow-lg ${
                          auditTab === tab.id
                            ? 'bg-white text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                        }`}
                      >
                        {tab.label}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${auditTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-700 text-slate-500'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* ── CONTENT ── */}
                  <div className="flex-1 overflow-y-auto px-5 pb-2 pt-3 scrollbar-hide">

                    {/* LEDGER TAB */}
                    {auditTab === 'ledger' && (
                      <div className="space-y-2">
                        {txns.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                            <Database size={32} className="mb-3 opacity-30" />
                            <p className="text-sm font-semibold">No transactions found</p>
                            <p className="text-xs mt-1 opacity-60">This user has no ledger activity yet.</p>
                          </div>
                        ) : (
                          txns.map((t, i) => {
                            const isCredit = parseFloat(t.amount) >= 0;
                            const typeBadgeColor = t.type === 'deposit' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50'
                              : t.type === 'withdrawal' ? 'bg-rose-900/50 text-rose-400 border-rose-800/50'
                              : t.type === 'bet' ? 'bg-blue-900/50 text-blue-400 border-blue-800/50'
                              : t.type === 'win' ? 'bg-amber-900/50 text-amber-400 border-amber-800/50'
                              : 'bg-slate-800 text-slate-400 border-slate-700';
                            return (
                              <div key={t.id || i} className="flex gap-3 group">
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center pt-1 shrink-0">
                                  <div className={`w-2.5 h-2.5 rounded-full border-2 mt-0.5 shrink-0 ${isCredit ? 'bg-emerald-500 border-emerald-400' : 'bg-rose-500 border-rose-400'}`} />
                                  {i < txns.length - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
                                </div>
                                {/* Card */}
                                <div className="flex-1 bg-slate-800/60 hover:bg-slate-800 border border-slate-750 rounded-2xl px-4 py-3 mb-2 transition-colors">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeBadgeColor}`}>
                                          {t.type}
                                        </span>
                                        <span className="text-slate-500 text-[10px]">
                                          {new Date(t.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      {t.description && (
                                        <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed truncate">{t.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className={`font-black text-sm ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isCredit ? '+' : ''}₹{parseFloat(t.amount).toFixed(2)}
                                      </p>
                                      <p className="text-slate-500 text-[10px] mt-0.5">Bal: ₹{parseFloat(t.runningBalance || t.balanceAfter || 0).toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* WAGERS TAB */}
                    {auditTab === 'wagers' && (
                      <div className="space-y-2">
                        {bets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                            <Trophy size={32} className="mb-3 opacity-30" />
                            <p className="text-sm font-semibold">No wagers placed</p>
                            <p className="text-xs mt-1 opacity-60">This user hasn't placed any bets yet.</p>
                          </div>
                        ) : (
                          bets.map((b, i) => {
                            const isWon = b.status === 'won';
                            const isLost = b.status === 'lost';
                            const isPending = !isWon && !isLost;
                            return (
                              <div key={b.id || i} className="bg-slate-800/60 hover:bg-slate-800 border border-slate-750 rounded-2xl px-4 py-3 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Game badge */}
                                      <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-900/50 text-indigo-300 border border-indigo-800/50 px-2 py-0.5 rounded-full">
                                        {b.gameName || 'Game'}
                                      </span>
                                      {/* Bet value */}
                                      <span className="text-[10px] text-slate-400">
                                        Bet: <span className="text-slate-200 font-semibold">{b.betValue}</span>
                                      </span>
                                      <span className="text-slate-600 text-[10px]">·</span>
                                      <span className="text-slate-500 text-[10px]">
                                        {new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-slate-500 text-[10px] mt-1.5 font-mono">Round {b.roundId}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-white font-black text-sm">₹{parseFloat(b.betAmount || 0).toFixed(2)}</p>
                                    <div className="mt-1">
                                      {isWon && (
                                        <span className="text-[9px] font-black uppercase bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                                          +₹{parseFloat(b.payoutAmount || 0).toFixed(2)} WON
                                        </span>
                                      )}
                                      {isLost && (
                                        <span className="text-[9px] font-black uppercase bg-slate-700/60 text-slate-500 border border-slate-600/50 px-2 py-0.5 rounded-full">
                                          LOST
                                        </span>
                                      )}
                                      {isPending && (
                                        <span className="text-[9px] font-black uppercase bg-amber-900/60 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full animate-pulse">
                                          PENDING
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Loading state */}
            {loadingUserHistory && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-xs">Loading audit trail…</p>
              </div>
            )}

            {/* ── FOOTER ── */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 shrink-0">
              <p className="text-slate-600 text-[10px]">Showing last 50 records per category</p>
              <button
                onClick={() => { setSelectedUserForAudit(null); setSelectedUserHistory({ bets: [], transactions: [] }); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300 transition-colors border-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}


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

            {(() => {
              const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
              return (
                <form onSubmit={handleUpdateComplaintSubmit} className="p-4 space-y-3.5">
                  <div>
                    <p className="text-xs font-bold text-white">Subject: {selectedComplaint.subject}</p>
                    <p className="text-[10px] text-indigo-400 font-bold mt-0.5">
                      User: {selectedComplaint.userName || 'N/A'} (UID: {selectedComplaint.userUid || 'N/A'})
                    </p>
                    {selectedComplaint.complaintType && (
                      <p className="text-[9px] text-amber-500 font-bold">
                        Type: {selectedComplaint.complaintType}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-medium">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Attachment Display */}
                  {selectedComplaint.imageUrl && (
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Attachment / Evidence</label>
                      {selectedComplaint.imageUrl.toLowerCase().endsWith('.pdf') ? (
                        <a
                          href={`${API_BASE}${selectedComplaint.imageUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-305 transition-colors no-underline"
                        >
                          <Paperclip size={12} />
                          <span>View PDF Evidence</span>
                        </a>
                      ) : (
                        <a
                          href={`${API_BASE}${selectedComplaint.imageUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 p-2 bg-slate-955 border border-slate-800 rounded-lg text-[10px] font-semibold text-indigo-400 hover:text-indigo-305 transition-colors no-underline"
                        >
                          <Paperclip size={12} />
                          <span>View Image Evidence</span>
                        </a>
                      )}
                    </div>
                  )}

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
              );
            })()}
          </div>
        </div>
      )}

      {/* ADD BANNER MODAL */}
      {showAddBannerModal && (isSuperAdmin || isAdmin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-400" />
                Add Dashboard Slide
              </h3>
              <button 
                onClick={() => setShowAddBannerModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newBannerTitle || !newBannerSubtitle || !newBannerGradient || !newBannerAction) {
                showToast('All fields are required', 'error');
                return;
              }
              try {
                await addBanner({
                  title: newBannerTitle,
                  subtitle: newBannerSubtitle,
                  gradient: newBannerGradient,
                  action: newBannerAction
                });
                showToast('Slide added successfully!', 'success');
                setShowAddBannerModal(false);
              } catch (err) {
                showToast(err.message || 'Failed to add slide', 'error');
              }
            }} className="p-4 space-y-4">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Slide Title</label>
                <input
                  type="text"
                  required
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  placeholder="e.g. MEGA VIP BONUS"
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Subtitle Description</label>
                <textarea
                  required
                  value={newBannerSubtitle}
                  onChange={(e) => setNewBannerSubtitle(e.target.value)}
                  placeholder="e.g. Deposit ₹500 or more to claim your exclusive VIP 1 reward instantly."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Gradient Theme</label>
                  <select
                    value={newBannerGradient}
                    onChange={(e) => setNewBannerGradient(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  >
                    <option value="from-indigo-650 to-purple-800">Indigo Dream</option>
                    <option value="from-emerald-500 to-teal-700">Emerald Glow</option>
                    <option value="from-pink-500 to-rose-700">Pink Rose</option>
                    <option value="from-amber-500 to-orange-700">Amber Flame</option>
                    <option value="from-blue-600 to-indigo-800">Ocean Blue</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Action Route</label>
                  <input
                    type="text"
                    required
                    value={newBannerAction}
                    onChange={(e) => setNewBannerAction(e.target.value)}
                    placeholder="e.g. /win"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-350 transition-colors border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-colors border-0 cursor-pointer"
                >
                  Create Slide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddProductModal && (isSuperAdmin || isAdmin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database size={14} className="text-pink-400" />
                Add Tech Product
              </h3>
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Selling Price (₹)*</label>
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
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Retail Price (₹)</label>
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
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Audio">Audio</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              {/* Upload section */}
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Images (Multiple)</label>
                <div 
                  onClick={() => document.getElementById('new-product-file-input').click()}
                  className="border border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-955/30 flex items-center justify-center min-h-[70px]"
                >
                  <input 
                    type="file" 
                    id="new-product-file-input" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files)
                      const validFiles = []
                      const validPreviews = []
                      for (const file of files) {
                        if (file.size > 2 * 1024 * 1024) {
                          showToast(`File ${file.name} exceeds 2MB limit.`, 'error')
                          continue
                        }
                        validFiles.push(file)
                        validPreviews.push(URL.createObjectURL(file))
                      }
                      if (validFiles.length > 0) {
                        setNewProductImageFiles(prev => [...prev, ...validFiles])
                        setNewProductImagePreviews(prev => [...prev, ...validPreviews])
                      }
                    }} 
                  />
                  {newProductImagePreviews && newProductImagePreviews.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      {newProductImagePreviews.map((prevUrl, idx) => (
                        <div key={idx} className="relative group w-12 h-12 rounded-lg border border-slate-800 bg-slate-905 overflow-hidden flex items-center justify-center shrink-0">
                          <img src={prevUrl} className="w-10 h-10 object-contain" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewProductImageFiles(prev => prev.filter((_, i) => i !== idx));
                              setNewProductImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors border-0 text-[8px] font-bold p-0 leading-none shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div 
                        onClick={(e) => { e.stopPropagation(); document.getElementById('new-product-file-input').click(); }}
                        className="w-12 h-12 rounded-lg border border-dashed border-slate-800 hover:border-slate-750 bg-slate-950/30 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                        title="Add more images"
                      >
                        <Plus size={14} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ShoppingBag size={14} className="text-slate-550 mb-0.5 animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-semibold">Select image files</span>
                      <span className="text-[8px] text-slate-655 mt-0.5">PNG, JPG, WEBP (Max 2MB, Multiple)</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Description</label>
                <textarea
                  value={newProductDesc}
                  onChange={(e) => setNewProductDesc(e.target.value)}
                  placeholder="Provide specifications, features, battery life details..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-20 resize-none"
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

      {/* EDIT PRODUCT MODAL */}
      {showEditProductModal && (isSuperAdmin || isAdmin) && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-955">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 size={14} className="text-indigo-400" />
                Edit Tech Product
              </h3>
              <button 
                onClick={() => setShowEditProductModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-0"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Title*</label>
                  <input
                    type="text"
                    required
                    value={editProductTitle}
                    onChange={(e) => setEditProductTitle(e.target.value)}
                    placeholder="e.g. AuraPods Max"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Selling Price (₹)*</label>
                  <input
                    type="number"
                    required
                    value={editProductPrice}
                    onChange={(e) => setEditProductPrice(e.target.value)}
                    placeholder="e.g. 1999"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Retail Price (₹)</label>
                  <input
                    type="number"
                    value={editProductOriginal}
                    onChange={(e) => setEditProductOriginal(e.target.value)}
                    placeholder="e.g. 2999"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={editProductStock}
                    onChange={(e) => setEditProductStock(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={editProductCategory}
                    onChange={(e) => setEditProductCategory(e.target.value)}
                    className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700"
                  >
                    <option value="Tech">Tech</option>
                    <option value="Audio">Audio</option>
                    <option value="Wearables">Wearables</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
              </div>

              {/* Upload section */}
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Replace Image Assets (Multiple)</label>
                <div 
                  onClick={() => document.getElementById('edit-product-file-input').click()}
                  className="border border-dashed border-slate-800 hover:border-slate-705 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-955/30 flex items-center justify-center min-h-[70px]"
                >
                  <input 
                    type="file" 
                    id="edit-product-file-input" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files)
                      const validFiles = []
                      const validPreviews = []
                      for (const file of files) {
                        if (file.size > 2 * 1024 * 1024) {
                          showToast(`File ${file.name} exceeds 2MB limit.`, 'error')
                          continue
                        }
                        validFiles.push(file)
                        validPreviews.push(URL.createObjectURL(file))
                      }
                      if (validFiles.length > 0) {
                        setEditProductImageFiles(prev => [...prev, ...validFiles])
                        setEditProductImagePreviews(prev => [...prev, ...validPreviews])
                      }
                    }} 
                  />
                  {editProductImagePreviews && editProductImagePreviews.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      {editProductImagePreviews.map((prevUrl, idx) => (
                        <div key={idx} className="relative group w-12 h-12 rounded-lg border border-slate-800 bg-slate-905 overflow-hidden flex items-center justify-center shrink-0">
                          <img src={prevUrl} className="w-10 h-10 object-contain" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditProductImageFiles(prev => prev.filter((_, i) => i !== idx));
                              setEditProductImagePreviews(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors border-0 text-[8px] font-bold p-0 leading-none shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div 
                        onClick={(e) => { e.stopPropagation(); document.getElementById('edit-product-file-input').click(); }}
                        className="w-12 h-12 rounded-lg border border-dashed border-slate-800 hover:border-slate-750 bg-slate-955/30 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
                        title="Add more images"
                      >
                        <Plus size={14} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ShoppingBag size={14} className="text-slate-555 mb-0.5 animate-pulse" />
                      <span className="text-[10px] text-slate-400 font-semibold">Select image files</span>
                      <span className="text-[8px] text-slate-655 mt-0.5">PNG, JPG, WEBP (Max 2MB, Multiple)</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Product Description</label>
                <textarea
                  value={editProductDesc}
                  onChange={(e) => setEditProductDesc(e.target.value)}
                  placeholder="Provide specifications, features, battery life details..."
                  className="w-full bg-slate-955 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-700 h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl text-slate-300 transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-650 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
                >
                  Save Changes
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
                { label: 'Go to Game Center Dashboard', action: () => setActiveTab('game-controls'), icon: Gamepad2, clearance: 'all' },
                { label: 'Go to Logs Console', action: () => setActiveTab('logs'), icon: Database, clearance: 'super_admin' },
                { label: 'Go to Store Configuration Settings', action: () => setActiveTab('config'), icon: Settings, clearance: 'all' },
          { label: 'Go to Env & Credentials Hub', action: () => setActiveTab('credentials'), icon: Shield, clearance: 'all' },
          { label: 'Go to Alerts & Notifications Center', action: () => setActiveTab('notifications'), icon: Bell, clearance: 'super_admin' },
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

      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-55 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-[90%] md:w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 hover:scale-[1.02] pointer-events-auto select-text animate-[fadeIn_0.3s_ease-out] ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800/80 backdrop-blur'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-400 border-amber-800/80 backdrop-blur'
                : 'bg-rose-950/90 text-rose-400 border-rose-800/80 backdrop-blur'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 flex-shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {/* ── SUPER ADMIN: SYSTEM CONFIG CONFIGURATIONS TOTP MODAL ── */}
      {showConfigTotpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl max-w-sm w-full shadow-2xl mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-500/10 p-2 rounded-xl border border-rose-500/15">
                <Shield className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Security Authorization</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Two-Factor Authentication Required</p>
              </div>
            </div>
            <p className="text-xs text-slate-350 mb-4 leading-relaxed">
              Please enter the 6-digit TOTP authorization code from your authenticator app to commit these configuration changes.
            </p>
            <div className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={configTotpCode}
                onChange={(e) => setConfigTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold bg-slate-950 border border-slate-800 focus:border-rose-500 text-white rounded-xl py-3 focus:outline-none transition-all"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfigTotpModal(false);
                    setConfigTotpCode('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-lg text-slate-300 border-0 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveEnvConfigs}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-750 text-xs text-slate-950 font-black rounded-lg border-0 cursor-pointer transition-all shadow-lg shadow-rose-500/10"
                >
                  Confirm & Commit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-fade-in mx-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Confirm Action</h4>
            <p className="text-xs text-slate-350 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-lg text-slate-300 border-0 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ isOpen: false, message: '', onConfirm: null });
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-650 hover:to-rose-650 text-xs text-slate-950 font-bold rounded-lg border-0 cursor-pointer transition-all shadow-lg shadow-rose-500/10"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
