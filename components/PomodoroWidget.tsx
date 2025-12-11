import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { MoodTheme } from '../types';

interface PomodoroWidgetProps {
  theme: MoodTheme;
}

const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({ theme }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const intervalRef = useRef<number | null>(null);

  const totalTime = mode === 'work' ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const switchMode = () => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="glass-panel p-5 relative overflow-hidden flex items-center justify-between min-h-[140px]">
      <div className="flex flex-col gap-2 z-10">
        <div className="flex items-center gap-2 text-gray-500 mb-1">
           <Timer size={16} />
           <span className="text-xs font-bold uppercase tracking-wider">Focus Timer</span>
        </div>
        <h3 className="text-4xl font-bold font-mono tracking-wider tabular-nums text-gray-900">
          {formatTime(timeLeft)}
        </h3>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={toggleTimer}
            className={`p-2 rounded-xl transition-all active:scale-95 shadow-sm text-white ${isActive ? 'bg-gray-800' : theme.colors.primary}`}
          >
            {isActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button 
            onClick={resetTimer}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95"
          >
            <RotateCcw size={18} />
          </button>
          <button 
            onClick={switchMode}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium uppercase tracking-wide transition-all text-gray-600"
          >
            {mode === 'work' ? 'Break' : 'Work'}
          </button>
        </div>
      </div>

      {/* Circular Progress Visual */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" stroke="#F3F4F6" strokeWidth="6" fill="transparent" />
            <circle 
                cx="48" cy="48" r="44" 
                stroke="currentColor" 
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray={276} 
                strokeDashoffset={276 - (276 * progress) / 100}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-linear ${theme.colors.focusRing}`} 
            />
        </svg>
      </div>
    </div>
  );
};

export default React.memo(PomodoroWidget);
