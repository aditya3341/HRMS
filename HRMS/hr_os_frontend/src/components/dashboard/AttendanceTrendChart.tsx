import React from "react";
import { motion } from "framer-motion";

interface AttendanceTrendChartProps {
  data: number[]; // Hours per day
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 9); // Baseline 9 hours
  const width = 100;
  const height = 30;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * step;
    const y = height - (val / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="w-24 h-8 relative group/chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(var(--primary-rgb), 0.5)" />
            <stop offset="100%" stopColor="rgba(var(--primary-rgb), 0)" />
          </linearGradient>
        </defs>
        
        {/* Area */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          d={`M 0 ${height} L ${points} L ${width} ${height} Z`}
          fill="url(#sparkline-gradient)"
          className="transition-all duration-700"
        />
        
        {/* Line */}
        <motion.polyline
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-primary transition-all duration-700"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Interaction point */}
        <motion.circle 
          cx={width}
          cy={height - (data[data.length - 1] / max) * height}
          r="3"
          className="fill-primary shadow-lg shadow-primary/50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        />
      </svg>
    </div>
  );
};
