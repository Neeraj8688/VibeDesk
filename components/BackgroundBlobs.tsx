import React from 'react';

interface BackgroundBlobsProps {
  palette: string[];
}

const BackgroundBlobs: React.FC<BackgroundBlobsProps> = ({ palette }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 
         OPTIMIZATION: 
         Using CSS classes defined in index.html (animate-blob-slow) instead of 
         Framer Motion's 'animate' prop. This moves calculation to the CSS engine, 
         preventing React re-render lag.
      */}

      {/* Blob 1: Top Left */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob-slow"
        style={{ backgroundColor: palette[0], transition: 'background-color 2s ease' }}
      />

      {/* Blob 2: Bottom Right */}
      <div
        className="absolute -bottom-[10%] -right-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob-medium"
        style={{ backgroundColor: palette[1], transition: 'background-color 2s ease' }}
      />

      {/* Blob 3: Center/Dynamic */}
      <div
        className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob-spin"
        style={{ backgroundColor: palette[2], transition: 'background-color 2s ease' }}
      />
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-soft-light"></div>
    </div>
  );
};

export default React.memo(BackgroundBlobs);
