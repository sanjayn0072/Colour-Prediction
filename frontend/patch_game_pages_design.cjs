const fs = require('fs');

const sharedStyle = `      <style>{\`
        /* Custom Scrollbars */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(7, 11, 19, 0.4);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.2);
          border-radius: 8px;
        }

        /* Base Body Grid Background Override */
        .min-h-screen.bg-[#f8fafc] {
          background-color: #070b13 !important;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.04) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 40%),
            linear-gradient(to right, rgba(255, 255, 255, 0.005) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.005) 1px, transparent 1px) !important;
          background-size: auto, auto, 24px 24px, 24px 24px !important;
          color: #f1f5f9 !important;
        }

        /* Header, Navbar, Cards Overrides */
        header,
        .bg-white {
          background: rgba(15, 23, 42, 0.35) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2) !important;
          color: #fff !important;
        }

        /* Text colors */
        .text-slate-800,
        .text-slate-700,
        .text-slate-900,
        .text-slate-850 {
          color: #f8fafc !important;
        }
        .text-slate-600,
        .text-slate-500,
        .text-slate-605,
        .text-slate-505,
        .text-slate-400 {
          color: #94a3b8 !important;
        }

        /* Borders override */
        .border-slate-200,
        .border-slate-200\\/60,
        .border-slate-100,
        .border-slate-200\\/50,
        .border-slate-150 {
          border-color: rgba(255, 255, 255, 0.04) !important;
        }

        /* Standard selectors bg-slate-100 / bg-slate-50 */
        .bg-slate-100,
        .bg-slate-50,
        .bg-slate-50\\/50 {
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
        }

        /* Active buttons inside selectors */
        .bg-white.text-slate-800,
        .bg-white.text-slate-850 {
          background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%) !important;
          border: 1px solid rgba(99, 102, 241, 0.25) !important;
          color: #fff !important;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15) !important;
        }

        /* Predict Number buttons (Circular glass capsules) */
        .grid-cols-5 button {
          background: rgba(15, 23, 42, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #f1f5f9 !important;
          transition: all 0.2s ease !important;
          font-weight: 800 !important;
        }
        .grid-cols-5 button:hover {
          transform: translateY(-1px) !important;
          background: rgba(15, 23, 42, 0.6) !important;
        }

        /* Color Prediction Buttons (Emerald, Violet, Rose gradients) */
        .flex.gap-2.5 button:first-child,
        button.from-emerald-600 {
          background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2) !important;
          border: 0 !important;
          color: #fff !important;
        }
        button.from-indigo-600,
        .flex.gap-2.5 button:nth-child(2) {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2) !important;
          border: 0 !important;
          color: #fff !important;
        }
        button.from-rose-600,
        .flex.gap-2.5 button:last-child {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2) !important;
          border: 0 !important;
          color: #fff !important;
        }

        /* Locked Overlays styling override */
        .bg-white\\/75.backdrop-blur-\\[1\\.5px\\] {
          background: rgba(7, 11, 19, 0.8) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          border: 1px solid rgba(239, 68, 68, 0.1) !important;
        }
        .text-rose-600,
        .text-rose-500 {
          color: #f43f5e !important;
        }

        /* Lists and Tables */
        .border-b.border-slate-100 {
          border-bottom-color: rgba(255, 255, 255, 0.04) !important;
        }
        .bg-slate-50.border-slate-200\\/80 {
          background: rgba(15, 23, 42, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.04) !important;
        }

        /* Text glow for period timer */
        .text-2xl.font-black {
          color: #38bdf8 !important;
          text-shadow: 0 0 10px rgba(56, 189, 248, 0.3) !important;
        }

        /* Range slider inputs override */
        input[type="range"]::-webkit-slider-thumb {
          background: #6366f1 !important;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5) !important;
          border: 2px solid #fff !important;
        }
      \`}</style>
      
      {/* Background decoration glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      
      {/* Security grid lines overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b05_1px,transparent_1px),linear-gradient(to_bottom,#1e293b05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />`;

// 1. Patch DiceGame.jsx sliderGradient
const dgPath = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/DiceGame.jsx';
if (fs.existsSync(dgPath)) {
  let content = fs.readFileSync(dgPath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const oldSliderGradient = `  const sliderGradient = condition === 'over'
    ? \`linear-gradient(to right, #fee2e2 0%, #fee2e2 \${target}%, #dcfce7 \${target}%, #dcfce7 100%)\`
    : condition === 'under'
      ? \`linear-gradient(to right, #dcfce7 0%, #dcfce7 \${target}%, #fee2e2 \${target}%, #fee2e2 100%)\`
      : \`linear-gradient(to right, #fee2e2 0%, #fee2e2 \${target}%, #dcfce7 \${target}%, #dcfce7 \${target + 10}%, #fee2e2 \${target + 10}%, #fee2e2 100%)\``;

  const newSliderGradient = `  const sliderGradient = condition === 'over'
    ? \`linear-gradient(to right, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.15) \${target}%, rgba(16, 185, 129, 0.25) \${target}%, rgba(16, 185, 129, 0.25) 100%)\`
    : condition === 'under'
      ? \`linear-gradient(to right, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.25) \${target}%, rgba(244, 63, 94, 0.15) \${target}%, rgba(244, 63, 94, 0.15) 100%)\`
      : \`linear-gradient(to right, rgba(244, 63, 94, 0.15) 0%, rgba(244, 63, 94, 0.15) \${target}%, rgba(16, 185, 129, 0.25) \${target}%, rgba(16, 185, 129, 0.25) \${target + 10}%, rgba(244, 63, 94, 0.15) \${target + 10}%, rgba(244, 63, 94, 0.15) 100%)\``;

  if (content.includes(oldSliderGradient)) {
    content = content.replace(oldSliderGradient, newSliderGradient);
    console.log('DiceGame.jsx sliderGradient successfully upgraded!');
  } else {
    console.log('DiceGame sliderGradient NOT found');
  }

  fs.writeFileSync(dgPath, content);
}
