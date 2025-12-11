import React from 'react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const TiltCard: React.FC<TiltCardProps> = ({ children, className = "", delay = 0 }) => {
  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: delay 
      }}
      viewport={{ once: false, amount: 0.1 }}
      className={`glass-panel hover-lift ${className}`}
    >
      {children}
    </MotionDiv>
  );
};

export default TiltCard;
