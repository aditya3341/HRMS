import React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Calendar, 
  Target,
  Zap,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import type { BehaviorSummary } from "@/lib/types";

interface BehaviorInsightsPanelProps {
  summary?: BehaviorSummary | null;
  isLoading?: boolean;
}

const TrendIcon = ({ trend }: { trend: string }) => {
  switch (trend) {
    case "IMPROVING":
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case "DECLINING":
      return <TrendingDown className="w-4 h-4 text-rose-400" />;
    default:
      return <Minus className="w-4 h-4 text-slate-400" />;
  }
};

export const BehaviorInsightsPanel: React.FC<BehaviorInsightsPanelProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return <div className="h-48 w-full bg-white/5 rounded-3xl animate-pulse" />;
  }

  if (!summary) return null;

  const stats = [
    {
      label: "Avg Check-In",
      value: summary.avg_check_in_hour ? 
        `${Math.floor(summary.avg_check_in_hour)}:${String(Math.round((summary.avg_check_in_hour % 1) * 60)).padStart(2, '0')} AM` : 
        "N/A",
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Consistency",
      value: `${Math.round(summary.consistency_score * 100)}%`,
      icon: Target,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Late Days",
      value: summary.late_count,
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Absences",
      value: summary.absent_count,
      icon: Calendar,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="space-y-6 bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Behavioral Insights
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trend</span>
          <TrendIcon trend={summary.trend} />
          <span className="text-[10px] font-bold text-white uppercase">{summary.trend}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex flex-col items-center text-center p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all hover:bg-black/30"
          >
            <div className={`p-2.5 rounded-xl ${stat.bg} mb-3 group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-sm font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
        <p className="text-xs text-slate-300 leading-relaxed">
          <span className="text-primary font-bold">Analysis:</span> {
            summary.trend === "IMPROVING" ? 
              "This employee shows a significant positive trend in attendance consistency. Highly reliable and improving." :
            summary.trend === "DECLINING" ?
              "Noticeable decline in reliability. Consistency scores are falling below avg. Monitor for burn-out or engagement issues." :
              "Consistency remains within the normal stable range. Maintaining steady reliability."
          }
        </p>
      </div>
    </div>
  );
};
