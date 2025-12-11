import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { MoodType, MoodTheme } from '../types';
import { Activity } from 'lucide-react';

interface MoodFlowChartProps {
  uid: string;
  theme: MoodTheme;
}

const MOOD_VALUES: Record<string, number> = {
  [MoodType.HAPPY]: 3,
  [MoodType.NEUTRAL]: 2,
  [MoodType.TIRED]: 1.5,
  [MoodType.STRESSED]: 1,
  [MoodType.SAD]: 0.5,
  [MoodType.ANGRY]: 0,
};

const MoodFlowChart: React.FC<MoodFlowChartProps> = ({ uid, theme }) => {
  const [data, setData] = useState<any[]>([]);
  const [insight, setInsight] = useState("Analyzing mood patterns...");

  // Use the primary palette color or fallback to indigo
  const chartColor = theme?.colors?.palette?.[0] || "#6366f1";

  useEffect(() => {
    // Listen to last 24h
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const q = query(
      collection(db, 'users', uid, 'moodEntries'),
      where('createdAt', '>=', Timestamp.fromDate(yesterday)),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const rawData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          mood: d.mood,
          value: MOOD_VALUES[d.mood] ?? 2,
          date: d.createdAt.toDate()
        };
      });

      // Transform for Chart
      const chartData = rawData.map(item => ({
        time: item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: item.value,
        mood: item.mood,
        hour: item.date.getHours()
      }));

      setData(chartData);

      // Generate Insight
      if (chartData.length > 0) {
        const periods = { morning: [] as number[], afternoon: [] as number[], evening: [] as number[] };
        
        rawData.forEach(item => {
          const h = item.date.getHours();
          if (h >= 5 && h < 12) periods.morning.push(item.value);
          else if (h >= 12 && h < 18) periods.afternoon.push(item.value);
          else periods.evening.push(item.value);
        });

        const getAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : -1;
        const avgs = {
          Morning: getAvg(periods.morning),
          Afternoon: getAvg(periods.afternoon),
          Evening: getAvg(periods.evening)
        };

        const bestTime = Object.entries(avgs).reduce((a, b) => a[1] > b[1] ? a : b);
        
        if (bestTime[1] === -1) {
            setInsight("Not enough data yet.");
        } else {
            setInsight(`Mood typically highest in the ${bestTime[0]}.`);
        }
      } else {
        setInsight("No mood entries in last 24h.");
      }
    });

    return () => unsubscribe();
  }, [uid]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 p-2 rounded-lg shadow-xl text-xs z-50">
          <p className="font-bold text-gray-900">{label}</p>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 rounded-full" style={{ background: chartColor }}></div>
             <p className="font-bold text-sm" style={{ color: chartColor }}>{payload[0].payload.mood}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
       <div className="flex-1 w-full min-h-[140px]">
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
                <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.05}/>
                </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="time" 
              hide={false} 
              interval="preserveStartEnd"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
                domain={[0, 3.5]} 
                hide={false} 
                tick={{ fontSize: 9, fill: '#cbd5e1' }}
                axisLine={false}
                tickLine={false}
                width={30}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorFlow)" 
                animationDuration={1500}
                activeDot={{ r: 6, strokeWidth: 0, fill: chartColor }}
            />
            </AreaChart>
        </ResponsiveContainer>
       </div>
       <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
          <Activity size={14} style={{ color: chartColor }} />
          <span className="font-medium truncate">{insight}</span>
       </div>
    </div>
  );
};

export default MoodFlowChart;
