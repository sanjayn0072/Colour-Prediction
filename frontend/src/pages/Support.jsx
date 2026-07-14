import { useState, useEffect, useRef } from 'react'
import { translateError } from '../utils/errorTranslator'
import { 
  ArrowLeft, HelpCircle, MessageSquare, Mail, 
  Send, Sparkles, AlertCircle, Trash2, CheckCircle2, Upload, Paperclip, X, Clock
} from 'lucide-react'
import { askGemini } from '../services/gemini'

const generateMsgId = (offset = 0) => `msg-${Date.now() + offset}`

const SUGGESTIONS = [
  "How do I deposit money?",
  "Withdrawal rules & limits",
  "How to play Colour Prediction?",
  "Dice Pro Game rules",
  "VIP Club bonuses & cashback",
  "Refer & Earn program"
]

export default function Support({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'email'
  
  // Chatbot states
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your RRClub Support Assistant. 🤖\n\nI can help you with questions about deposits, withdrawals, VIP club tiers, game rules, and tech shop purchases.\n\n*Note: I will only answer questions related to RRClub!*`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  // Email form states
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [refId, setRefId] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const fileInputRef = useRef(null)

  // Toast message
  const [toast, setToast] = useState(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const showToast = (msg, type = 'success') => {
    const finalMsg = type === 'error' ? translateError(msg) : msg;
    setToast({ msg: finalMsg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Handle clear chat history
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Hello! I am your RRClub Support Assistant. 🤖\n\nI can help you with questions about deposits, withdrawals, VIP club tiers, game rules, and tech shop purchases.\n\n*Note: I will only answer questions related to RRClub!*`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ])
      showToast('Chat history cleared!')
    }
  }

  // Handle sending chat message
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage
    if (!text.trim() || isTyping) return

    if (!textToSend) {
      setInputMessage('')
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: generateMsgId(),
      sender: 'user',
      text: text,
      timestamp
    }

    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    try {
      // Gather chat history (excluding welcome message, formatted for API)
      const apiHistory = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6) // Only send the last 6 messages to save context token usage
        .map(m => ({
          sender: m.sender,
          text: m.text
        }))

      const response = await askGemini(text, apiHistory)
      
      const botMsg = {
        id: generateMsgId(1),
        sender: 'assistant',
        text: response,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      console.error(err)
      const errorMsg = {
        id: generateMsgId(2),
        sender: 'assistant',
        text: '⚠️ Sorry, I encountered an error. Please check your internet connection or API key and try again.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const getWordCount = (str) => {
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const subjectWords = getWordCount(subject);
  const descWords = getWordCount(description);
  const isSubjectInvalid = subjectWords > 30;
  const isDescInvalid = descWords > 250;
  const isRefIdInvalid = refId.length > 20 || (refId.length > 0 && !/^[a-zA-Z0-9]+$/.test(refId));
  const isFormInvalid = isSubjectInvalid || isDescInvalid || isRefIdInvalid;

  // Handle email form submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim() || isFormInvalid) return

    setSendingEmail(true)
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`

    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('description', description.trim());
      if (refId.trim()) {
        formData.append('refId', refId.trim());
      }
      if (attachment) {
        formData.append('screenshot', attachment);
      }

      const response = await fetch(`${API_BASE}/api/support/complaint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit complaint');
      }
      setEmailSuccess(true)
      showToast('Support ticket sent successfully!')
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error submitting ticket', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be under 5MB', 'error')
        return
      }
      setAttachment(file)
    }
  }

  const handleResetEmailForm = () => {
    setSubject('')
    setDescription('')
    setRefId('')
    setAttachment(null)
    setEmailSuccess(false)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20 relative select-none">
      {/* ── Toast Message ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[90%] ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-600'
        } text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[slideDown_0.3s_ease-out]`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span className="flex-1 font-medium">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="cursor-pointer"><X size={12} /></button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-4 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => onNavigate?.('home')} 
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm cursor-pointer border-0 outline-none"
        >
          <ArrowLeft size={18} className="text-slate-650" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <HelpCircle size={16} className="text-primary animate-pulse" /> Support Center
          </h1>
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">2 Channels Available</p>
        </div>
        <div className="w-9 h-9" />
      </header>

      {/* ── Tab Selector ── */}
      <div className="px-4 pt-4">
        <div className="flex bg-slate-100 border border-slate-200/50 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
              activeTab === 'chat'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            <MessageSquare size={14} className={activeTab === 'chat' ? 'text-primary' : 'text-slate-400'} />
            Live AI Chat
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-0 outline-none ${
              activeTab === 'email'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 bg-transparent'
            }`}
          >
            <Mail size={14} className={activeTab === 'email' ? 'text-primary' : 'text-slate-400'} />
            Email Ticket
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">

        {/* ── CHAT TAB CONTENT ── */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col space-y-3 min-h-[50vh] relative">
            
            {/* Live Chat Support info card */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                  <MessageSquare size={14} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-800">
                    Live Chat Support
                  </p>
                  <p className="text-[8px] text-slate-400 font-medium">
                    Our AI assistant is ready to help you
                  </p>
                </div>
              </div>
              <button 
                onClick={handleClearChat}
                title="Clear chat history"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 transition-colors cursor-pointer bg-white"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm flex flex-col justify-between overflow-hidden min-h-[350px]">
              
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user'
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] ${
                        isUser ? 'ml-auto' : 'mr-auto'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                        isUser 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-slate-400 font-semibold mt-1 px-1">
                        {msg.timestamp}
                      </span>
                    </div>
                  )
                })}

                {/* Assistant Typing Indicator */}
                {isTyping && (
                  <div className="flex flex-col items-start max-w-[85%] mr-auto">
                    <div className="bg-slate-50 text-slate-800 border border-slate-100 p-3.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[8px] text-slate-400 font-semibold mt-1 px-1">Thinking...</span>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions quick chips */}
              {messages.length <= 1 && !isTyping && (
                <div className="border-t border-slate-100 pt-3 mt-3 shrink-0">
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
                    <Sparkles size={10} className="text-primary" /> Click to ask immediately:
                  </p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug)}
                        className="shrink-0 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-[10px] text-slate-650 hover:bg-indigo-50/40 hover:text-primary hover:border-primary/30 transition-all cursor-pointer font-medium"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input form */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-1 flex items-center gap-1 shadow-sm shrink-0">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask support about games or payments..."
                disabled={isTyping}
                className="flex-1 bg-transparent px-3 py-2.5 text-xs text-slate-800 outline-none border-0 placeholder:text-slate-400"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isTyping}
                className="w-10 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── EMAIL TAB CONTENT ── */}
        {activeTab === 'email' && (
          <div className="flex-1 flex flex-col space-y-4 animate-[fadeIn_0.15s_ease-out]">
            
            {/* Email Support Header Info */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 border border-blue-100 flex items-center justify-center shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs">Email Ticket Portal</h3>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Send your ticket. Response delivered within{' '}
                  <span className="font-bold text-slate-700 flex inline-items items-center gap-0.5 bg-blue-50 border border-blue-100/50 px-1 py-0.5 rounded font-mono">
                    <Clock size={10} /> 2 hours
                  </span>.
                </p>
              </div>
            </div>

            {/* Ticket portal success view */}
            {emailSuccess ? (
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 py-8 animate-[scaleUp_0.18s_ease-out]">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 text-sm">Ticket Received!</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    Your request has been submitted. A reference notification was sent to your registered email account.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full max-w-xs text-left text-[11px] text-slate-600 space-y-1">
                  <p>• <strong>Contact:</strong> coloursupport@gmail.com</p>
                  <p>• <strong>Subject:</strong> {subject}</p>
                  <p>• <strong>Status:</strong> Assigned (Pending review)</p>
                  {refId && <p>• <strong>Ref ID:</strong> {refId}</p>}
                  {attachment && <p>• <strong>Attachment:</strong> {attachment.name}</p>}
                </div>
                <button
                  onClick={handleResetEmailForm}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-primary/95 transition-all border-0 outline-none"
                >
                  Create New Ticket
                </button>
              </div>
            ) : (
              /* Ticket creation form */
              <form onSubmit={handleEmailSubmit} className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[400px]">
                <div className="space-y-3">
                  
                  {/* Subject input */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Subject</label>
                      <span className={`text-[9px] font-bold ${isSubjectInvalid ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                        {subjectWords} / 30 words
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Deposit not credited / Withdrawal pending"
                      className={`w-full px-3 py-2 bg-slate-50 border ${isSubjectInvalid ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 transition-all`}
                    />
                    {isSubjectInvalid && (
                      <p className="text-[9px] text-red-500 font-bold mt-1">⚠️ Subject must not exceed 30 words.</p>
                    )}
                  </div>

                  {/* Period/Order ID reference */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Order / Game Period ID (Optional)</label>
                      <span className={`text-[9px] font-bold ${isRefIdInvalid ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                        {refId.length} / 20 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={refId}
                      onChange={(e) => setRefId(e.target.value)}
                      placeholder="e.g. TRX-90812 / Period #1002"
                      className={`w-full px-3 py-2 bg-slate-50 border ${isRefIdInvalid ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-xl text-xs text-slate-850 focus:outline-none focus:ring-2 transition-all font-mono`}
                    />
                    {isRefIdInvalid && (
                      <p className="text-[9px] text-red-500 font-bold mt-1">⚠️ Order ID must be alphanumeric and max 20 characters.</p>
                    )}
                  </div>

                  {/* Description text area */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-bold text-slate-455 uppercase tracking-wider block">Description of Issue</label>
                      <span className={`text-[9px] font-bold ${isDescInvalid ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                        {descWords} / 250 words
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please provide details (payment method used, amount, date, error messages, etc.)"
                      className={`w-full px-3 py-2.5 bg-slate-50 border ${isDescInvalid ? 'border-red-500 focus:ring-red-200 focus:border-red-500' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 transition-all resize-none`}
                    />
                    {isDescInvalid && (
                      <p className="text-[9px] text-red-500 font-bold mt-1">⚠️ Description must not exceed 250 words.</p>
                    )}
                  </div>

                  {/* File Upload mock component */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1 block">Screenshot / Payment Receipt (Optional)</label>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="hidden"
                    />
                    
                    {attachment ? (
                      <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip size={14} className="text-emerald-600 shrink-0" />
                          <span className="text-[10px] text-emerald-800 font-semibold truncate">{attachment.name}</span>
                          <span className="text-[8px] text-slate-400 shrink-0">({(attachment.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setAttachment(null)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-slate-500"
                      >
                        <Upload size={16} />
                        <span className="text-[10px] font-bold">Upload Receipt (Max 5MB)</span>
                        <span className="text-[8px] text-slate-400">Supports JPG, PNG, PDF</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={sendingEmail || !subject.trim() || !description.trim() || isFormInvalid}
                  className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 border-0 outline-none"
                >
                  {sendingEmail ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Ticket...
                    </>
                  ) : (
                    'Submit Support Ticket'
                  )}
                </button>

              </form>
            )}

            {/* Email link fallback */}
            <p className="text-[10px] text-slate-400 text-center font-medium">
              Having issues? You can also email us directly at{' '}
              <a href="mailto:coloursupport@gmail.com" className="text-primary font-bold hover:underline">
                coloursupport@gmail.com
              </a>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
