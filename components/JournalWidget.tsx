import React from 'react';
import { motion } from 'framer-motion';
import { PenLine } from 'lucide-react';

const MotionDiv = motion.div as any;

interface JournalWidgetProps {
  summary: string | null;
}

const JournalWidget: React.FC<JournalWidgetProps> = ({ summary }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-gray-500">
        <PenLine size={18} />
        <h3 className="font-semibold text-sm uppercase tracking-wide">Daily Journal AI</h3>
      </div>
      
      <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 overflow-y-auto no-scrollbar relative">
        {summary ? (
          <MotionDiv 
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="text-gray-700 leading-relaxed italic font-medium"
          >
            "{summary}"
          </MotionDiv>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center gap-2">
            <p className="text-sm">No analysis yet.</p>
            <p className="text-xs">Express yourself to get an AI summary.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalWidget;
