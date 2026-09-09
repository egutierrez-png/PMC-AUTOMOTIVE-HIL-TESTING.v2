import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-500',
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg text-white font-medium transition-opacity animate-fade-in-out ${colors[type]}`}
    >
      <span>{message}</span>
    </div>
  );
}
