const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/LegacyAdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Locate the beginning of the return statement in LegacyAdminDashboard
const oldReturnStart = `  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">`;

const newReturnStart = `  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row relative overflow-hidden">
      <style>{\`
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
          background-color: #070b13 !important;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 40%),
            linear-gradient(to right, rgba(255, 255, 255, 0.006) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.006) 1px, transparent 1px) !important;
          background-size: auto, auto, 24px 24px, 24px 24px !important;
        }

        /* Glassmorphism Cards Overrides */
        .bg-slate-900\\/40.backdrop-blur-md,
        .bg-slate-900\\/40.backdrop-blur-xl {
          background: rgba(15, 23, 42, 0.3) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2) !important;
          border-radius: 24px !important;
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
        span.bg-amber-500\\/10,
        span.text-amber-400 {
          background: rgba(245, 158, 11, 0.06) !important;
          border: 1px solid rgba(245, 158, 11, 0.15) !important;
          color: #f59e0b !important;
          text-shadow: 0 0 8px rgba(245, 158, 11, 0.25) !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em !important;
        }
        span.bg-emerald-500\\/10,
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
        .flex-1.p-4.lg\\:p-8 > div > div.bg-slate-900 {
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
          border-radius: 28px !important;
          overflow: hidden;
        }
      \`}</style>
      
      {/* Background decoration glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      
      {/* Security grid lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b05_1px,transparent_1px),linear-gradient(to_bottom,#1e293b05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />`;

if (content.includes(oldReturnStart)) {
  content = content.replace(oldReturnStart, newReturnStart);
  console.log('Styles and overlays successfully patched!');
} else {
  console.log('oldReturnStart NOT found');
}

fs.writeFileSync(path, content);
console.log('LegacyAdminDashboard.jsx styling patched.');
