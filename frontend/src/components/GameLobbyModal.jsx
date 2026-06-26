import { X, Flame, Zap, Star, Bomb, Rocket, Play, Lock, Gamepad2 } from 'lucide-react'

export default function GameLobbyModal({ isOpen, onClose, onNavigate, activeGameId }) {
  if (!isOpen) return null

  const games = [
    {
      id: 'game',
      title: 'Colour Prediction',
      desc: 'Predict colors & numbers to win up to 9x rewards.',
      tag: 'HOT',
      tagBg: 'bg-rose-500',
      activePlayers: '12.4K',
      icon: Flame,
      iconColor: 'text-rose-500 bg-rose-50 border-rose-100',
      gradient: 'from-rose-500/5 via-purple-500/5 to-indigo-500/5 hover:border-rose-300',
      active: true
    },
    {
      id: 'diceGame',
      title: 'Dice Pro',
      desc: 'Predict targets over/under for custom multipliers.',
      tag: 'TRENDING',
      tagBg: 'bg-amber-500',
      activePlayers: '8.1K',
      icon: Zap,
      iconColor: 'text-amber-500 bg-amber-50 border-amber-100',
      gradient: 'from-amber-500/5 via-yellow-500/5 to-orange-500/5 hover:border-amber-300',
      active: true
    },
    {
      id: 'spinWheel',
      title: 'Lucky Wheel',
      desc: 'Spin the wheel to win cash prizes, gold, and vouchers.',
      tag: 'BONUS',
      tagBg: 'bg-indigo-500',
      activePlayers: '4.3K',
      icon: Star,
      iconColor: 'text-indigo-500 bg-indigo-50 border-indigo-100',
      gradient: 'from-indigo-500/5 via-sky-500/5 to-blue-500/5 hover:border-indigo-300',
      active: true
    },
    {
      id: 'mines',
      title: 'Mines (v1.2)',
      desc: 'Dodge hidden bombs on the grid to multiply stake.',
      tag: 'COMING SOON',
      tagBg: 'bg-slate-400',
      activePlayers: '0',
      icon: Bomb,
      iconColor: 'text-slate-400 bg-slate-50 border-slate-100',
      gradient: 'from-slate-100 to-slate-200/50 opacity-60',
      active: false
    },
    {
      id: 'crash',
      title: 'Crash Rocket (v1.2)',
      desc: 'Cash out before the rocket flies away to lock payouts.',
      tag: 'COMING SOON',
      tagBg: 'bg-slate-400',
      activePlayers: '0',
      icon: Rocket,
      iconColor: 'text-slate-400 bg-slate-50 border-slate-100',
      gradient: 'from-slate-100 to-slate-200/50 opacity-60',
      active: false
    }
  ]

  const handleGameClick = (gameId) => {
    onNavigate?.(gameId)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[6px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] p-5 w-full max-w-sm shadow-2xl relative border border-slate-100 animate-[scaleUp_0.18s_ease-out] flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm text-slate-600"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner">
            <Gamepad2 size={18} className="text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Game Arena</h3>
            <p className="text-[10px] text-slate-400 font-medium">Select a game to start playing</p>
          </div>
        </div>

        {/* Games List (Scrollable if viewport is small) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {games.map((game) => {
            const Icon = game.icon
            const isActiveGame = activeGameId === game.id
            return (
              <div
                key={game.id}
                onClick={() => game.active && !isActiveGame && handleGameClick(game.id)}
                className={`border rounded-2xl p-3 shadow-sm transition-all relative overflow-hidden bg-gradient-to-br ${game.gradient} border-slate-200/60 flex items-center justify-between ${
                  game.active && !isActiveGame
                    ? 'cursor-pointer active:scale-[0.98]' 
                    : isActiveGame 
                    ? 'border-indigo-400/60 bg-indigo-50/20 cursor-default ring-2 ring-indigo-500/10'
                    : 'select-none pointer-events-none'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  {/* Icon Badge */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${game.iconColor}`}>
                    <Icon size={20} />
                  </div>
                  
                  {/* Details */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-800 text-xs">{game.title}</h4>
                      {isActiveGame ? (
                        <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      ) : (
                        <span className={`text-[7px] font-black text-white px-1.5 py-0.5 rounded-full ${game.tagBg} uppercase tracking-wider`}>
                          {game.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug truncate">{game.desc}</p>
                    {game.active && (
                      <span className="text-[9px] text-slate-400 font-bold block">
                        🟢 {game.activePlayers} online
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                  {isActiveGame ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/10 border border-emerald-400/50">
                      <Play size={10} className="text-white fill-white ml-0.5" />
                    </div>
                  ) : game.active ? (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/10 flex items-center justify-center border border-indigo-500/50">
                      <Play size={10} className="text-white fill-white ml-0.5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                      <Lock size={10} className="text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer info */}
        <p className="text-[9px] text-slate-400 text-center mt-3 pt-2 border-t border-slate-100">
          🔒 Certified Provably Fair RNG System
        </p>
      </div>
    </div>
  )
}
