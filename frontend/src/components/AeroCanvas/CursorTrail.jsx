import React, { useEffect, useState } from 'react';

const CursorTrail = () => {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPoints((prev) => [...prev.slice(-15), { x: e.clientX, y: e.clientY, id: Date.now() }]);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000] overflow-hidden">
      <svg className="w-full h-full">
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {points.length > 1 && (
          <path
            d={`M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="opacity-50"
          />
        )}
      </svg>
    </div>
  );
};

export default CursorTrail;
