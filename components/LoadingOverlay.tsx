import React from 'react';

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Analyzing Image Structure..." }) => {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center px-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
      <p className="text-indigo-900 font-medium animate-pulse">{message}</p>
    </div>
  );
};