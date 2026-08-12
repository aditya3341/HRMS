import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Target, 
  Zap, 
  Activity,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import type { BehaviorSummary } from "@/lib/types";

interface BehaviorEmployee {
  name: string;
  avg_check_in: string;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  consistency: number;
}

interface BehaviorPanelProps {
  employees: BehaviorEmployee[];
  isLoading?: boolean;
}

const TrendBadge = ({ trend }: { trend: string }) => {
  const colors = {
    IMPROVING: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    DECLINING: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    STABLE: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }[trend] || "bg-slate-500/10 text-slate-400 border-slate-500/20";

  const Icon = trend === "IMPROVING" ? TrendingUp : trend === "DECLINING" ? TrendingDown : Minus;

  return (
    <div className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${colors}`}>
      <Icon className="w-3 h-3" />
      {trend}
    </div>
  );
};

export const BehaviorPanel: React.FC<BehaviorPanelProps> = ({ employees, isLoading }) => {
  if (isLoading) {
    return <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />;
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Reliability & Behavior Trends
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Last 30 Days Analysis
        </span>
      </div>

      <div className="space-y-4">
        {employees.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">
            No behavioral data available
          </div>
        ) : employees.map((emp, i) => (
          <motion.div
            key={emp.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group hover:bg-black/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-0.5">{emp.name}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Avg Check-In: {emp.avg_check_in}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:block">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-right">Consistency</p>
                <div className="flex items-center gap-3">
                   <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${emp.consistency}%` }} />
                   </div>
                   <span className="text-xs font-mono font-bold text-white">{emp.consistency}%</span>
                </div>
              </div>
              <TrendBadge trend={emp.trend} />
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
