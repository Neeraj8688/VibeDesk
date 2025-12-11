import React, { useState } from 'react';
import { Sparkles, Send, MessageSquare } from 'lucide-react';
import { getCoachAdvice } from '../services/geminiService';
import { MoodType, Task, MoodTheme } from '../types';

interface VibeCoachProps {
  mood: MoodType;
  tasks: Task[];
  theme: MoodTheme;
}

const VibeCoach: React.FC<VibeCoachProps> = ({ mood, tasks, theme }) => {
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState<{ insight: string; tips: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Derive dynamic styles
  const primaryColor = theme.colors.palette[0]; // e.g., #Hex
  const secondaryColor = theme.colors.palette[1];

  const handleGetAdvice = async () => {
    setLoading(true);
    const result = await getCoachAdvice(
      mood, 
      tasks.filter(t => !t.completed).map(t => t.title),
      question
    );
    setAdvice(result);
    setLoading(false);
  };

  return (
    <div 
      className="glass-panel p-5 flex flex-col gap-4 relative overflow-hidden transition-colors duration-500"
      style={{
        background: `linear-gradient(135deg, white 0%, ${secondaryColor}20 100%)`
      }}
    >
      <div className="flex items-center gap-2 mb-1 z-10" style={{ color: primaryColor }}>
        <Sparkles size={18} />
        <h3 className="font-extrabold text-sm uppercase tracking-wide">VibeCoach</h3>
      </div>

      <div className="z-10 flex flex-col gap-3">
        {advice ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm font-bold text-gray-800 mb-3">"{advice.insight}"</p>
            <ul className="space-y-1.5">
              {advice.tips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                  {tip}
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setAdvice(null)} 
              className="mt-3 text-[10px] underline hover:opacity-80 transition-opacity"
              style={{ color: primaryColor }}
            >
              Ask another question
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <input 
                type="text" 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full glass-input pr-10 pl-4 py-3 text-sm transition-all"
                style={{ borderColor: 'transparent' }}
                onKeyDown={(e) => e.key === 'Enter' && handleGetAdvice()}
              />
              <MessageSquare className="absolute right-3 top-3.5 text-gray-400" size={16} />
            </div>
            
            <button 
              onClick={handleGetAdvice}
              disabled={loading}
              style={{ 
                background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` 
              }}
              className="w-full py-3 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 hover:brightness-110"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Get Advice <Send size={14} /></>
              )}
            </button>
          </>
        )}
      </div>

      {/* Decorative BG element */}
      <div 
        className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: primaryColor }}
      ></div>
    </div>
  );
};

export default VibeCoach;
