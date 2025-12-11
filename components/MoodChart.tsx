import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MoodLog, MoodType } from '../types';
import { MOOD_GRAPH_SCORES } from '../constants';

interface MoodChartProps {
  logs: MoodLog[];
}

const MoodChart: React.FC<MoodChartProps> = ({ logs }) => {
  const recentLogs = logs.slice(-24);
  
  const data = recentLogs.length > 0 ? recentLogs.map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: log.focusScore || MOOD_GRAPH_SCORES[log.mood] || 60,
    mood: log.mood,
    label: log.mood
  })) : [
    { time: 'Start', value: 60, mood: MoodType.NEUTRAL, label: 'Neutral' },
    { time: 'Now', value: 60, mood: MoodType.NEUTRAL, label: 'Neutral' }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 p-3 rounded-xl text-xs text-gray-800 shadow-lg">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-gray-500">{payload[0].payload.mood}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[120px] text-xs font-sans">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#9CA3AF" 
            tick={{ fill: '#9CA3AF', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#F59E0B" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorMood)" 
            animationDuration={1000}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(MoodChart);
