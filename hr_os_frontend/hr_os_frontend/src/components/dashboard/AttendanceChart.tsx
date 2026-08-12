import React from "react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { motion } from "framer-motion";

interface AttendancePerformancePoint {
  x: number; // Attendance score (0-100)
  y: number; // Performance Rating (0-5)
  name: string;
}

interface ScatterPlotProps {
  data: AttendancePerformancePoint[];
  title: string;
  subtitle?: string;
}

export const AttendancePerformanceChart: React.FC<ScatterPlotProps> = ({ data, title, subtitle }) => {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <div className="mb-6">
        <h3 className="text-white font-bold">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subtitle}</p>}
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Attendance Score" 
              unit="%" 
              stroke="#64748b" 
              fontSize={10} 
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Performance Rating" 
              stroke="#64748b" 
              fontSize={10} 
              axisLine={false}
              tickLine={false}
              domain={[0, 5]}
            />
            <ZAxis type="number" range={[100, 100]} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
            />
            <Scatter name="Employees" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.x < 40 ? '#f43f5e' : entry.x < 70 ? '#f59e0b' : '#10b981'} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">High Integrity</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Monitor</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Risk Factor</span>
        </div>
      </div>
    </div>
  );
};
