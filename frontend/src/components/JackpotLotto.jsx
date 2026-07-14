import React, { useState, useEffect, useRef } from 'react';

export default function JackpotLotto() {
  const [displayJackpot, setDisplayJackpot] = useState(() => {
    const saved = localStorage.getItem('jackpot_amount');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val < 1000000) {
        return val;
      }
    }
    return 115200.85; // Starting value under 1,000,000
  });

  const jackpotRef = useRef(displayJackpot);
  const animationFrameIdRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Generate pseudo-random integer between 5 and 100 inclusive
      const increment = Math.floor(Math.random() * (100 - 5 + 1)) + 5;
      const prevVal = jackpotRef.current;
      let targetVal = prevVal + increment;

      // 2. Reset back to 0 if threshold reached or exceeded
      if (targetVal >= 1000000) {
        targetVal = 0;
      }

      jackpotRef.current = targetVal;
      localStorage.setItem('jackpot_amount', targetVal.toString());

      if (targetVal === 0) {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        setDisplayJackpot(0);
      } else {
        const duration = 1500; // Animate over 1.5 seconds, leaving 0.5s pause
        const startTime = performance.now();

        const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Smooth ease-out quadratic transition
          const easeProgress = progress * (2 - progress);
          const currentDisplay = prevVal + (targetVal - prevVal) * easeProgress;
          setDisplayJackpot(currentDisplay);

          if (progress < 1) {
            animationFrameIdRef.current = requestAnimationFrame(animate);
          }
        };

        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  return (
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
            ₹{displayJackpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
