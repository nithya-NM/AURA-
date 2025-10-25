
import React from 'react';
import { FaCarSide } from 'react-icons/fa';

const LiveMap: React.FC = () => {
  return (
    <div className="w-full h-32 md:h-40 rounded-lg bg-gray-900/50 p-2 overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 360 140">
        {/* Route path */}
        <path className="map-path" d="M20,70 Q60,30 100,70 T180,70 Q220,110 260,70 T340,70" stroke="rgb(var(--color-accent-purple))" strokeWidth="4" fill="none" strokeDasharray="8 8" />
        
        {/* Start and End points */}
        <circle cx="20" cy="70" r="6" fill="rgb(var(--color-accent-aqua))" />
        <text x="20" y="95" fill="rgb(var(--color-accent-aqua))" fontSize="12" textAnchor="middle">Start</text>
        
        <circle cx="340" cy="70" r="6" fill="rgb(var(--color-accent-red))" />
        <text x="340" y="95" fill="rgb(var(--color-accent-red))" fontSize="12" textAnchor="middle">End</text>
        
        {/* The car icon that moves along the path */}
        <foreignObject id="car" x="-12" y="-12" width="24" height="24">
            <FaCarSide className="text-white text-2xl transform -rotate-12" />
        </foreignObject>
      </svg>
    </div>
  );
};

export default LiveMap;