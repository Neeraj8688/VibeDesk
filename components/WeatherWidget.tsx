import React from 'react';
import { MoodType } from '../types';
import { Sun, CloudRain, Zap, CloudFog, CloudLightning, Cloud, Wind } from 'lucide-react';

interface WeatherWidgetProps {
  mood: MoodType;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ mood }) => {
  const renderIcon = () => {
    switch (mood) {
      case MoodType.HAPPY:
        return <Sun className="w-24 h-24 text-yellow-100 animate-[spin_10s_linear_infinite]" />;
      case MoodType.SAD:
        return (
          <div className="relative">
            <CloudRain className="w-24 h-24 text-blue-200" />
            <div className="absolute top-full left-0 w-full flex justify-center space-x-2">
               {/* CSS Rain Animation simulated with layout for simplicity */}
               <div className="w-1 h-3 bg-blue-300 rounded-full animate-bounce delay-75"></div>
               <div className="w-1 h-3 bg-blue-300 rounded-full animate-bounce delay-150"></div>
               <div className="w-1 h-3 bg-blue-300 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        );
      case MoodType.STRESSED:
        return <Zap className="w-24 h-24 text-red-100 animate-pulse" />;
      case MoodType.ANGRY:
        return <CloudLightning className="w-24 h-24 text-gray-200 animate-pulse" />;
      case MoodType.TIRED:
        return <CloudFog className="w-24 h-24 text-indigo-200 animate-float" />;
      case MoodType.NEUTRAL:
      default:
        return <Cloud className="w-24 h-24 text-white animate-float" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 h-full">
      <div className="filter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] transform hover:scale-110 transition-transform duration-500 ease-out">
        {renderIcon()}
      </div>
      <h3 className="mt-4 text-white font-bold text-2xl tracking-wide uppercase drop-shadow-md">
        {mood}
      </h3>
    </div>
  );
};

export default WeatherWidget;
