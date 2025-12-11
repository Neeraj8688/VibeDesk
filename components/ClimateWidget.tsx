import React from 'react';
import { MoodType, MoodTheme } from '../types';
import { Sun, CloudRain, Zap, CloudFog, Moon, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface ClimateWidgetProps {
  mood: MoodType;
  weather: string;
  theme: MoodTheme;
}

const ClimateWidget: React.FC<ClimateWidgetProps> = ({ mood, weather, theme }) => {
  
  const getIcon = () => {
    switch (weather) {
      case 'Sun': return <Sun className="w-48 h-48 text-amber-400" strokeWidth={1} />;
      case 'Rain': return <CloudRain className="w-48 h-48 text-indigo-400" strokeWidth={1} />;
      case 'Storm': return <Zap className="w-48 h-48 text-rose-500" strokeWidth={1} />;
      case 'Fog': return <CloudFog className="w-48 h-48 text-cyan-400" strokeWidth={1} />;
      case 'Moon': return <Moon className="w-48 h-48 text-violet-400" strokeWidth={1} />;
      default: return <Cloud className="w-48 h-48 text-slate-400" strokeWidth={1} />;
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden bg-white">
      <AnimatePresence mode='wait'>
        <MotionDiv 
            key="climate-gradient"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-white/60 pointer-events-none"
        />
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <MotionDiv
          key={`icon-${weather}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileInView={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          viewport={{ once: false, amount: 0.3 }}
          className="z-10 relative mb-6"
        >
          <div className="animate-[float-slow_6s_ease-in-out_infinite]">
              {getIcon()}
          </div>
        </MotionDiv>
      </AnimatePresence>
      
      <MotionDiv 
        key="climate-text"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        viewport={{ once: false, amount: 0.3 }}
        className="text-center z-10"
      >
        <h2 className="text-4xl font-bold text-[#111111] tracking-tight font-outfit mb-2">{mood}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${theme.colors.primary}`}></span>
            <p className="text-[#444444] text-xs font-bold uppercase tracking-widest">{weather}</p>
        </div>
      </MotionDiv>
    </div>
  );
};

export default ClimateWidget;
