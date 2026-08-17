import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Lightbulb,
  Trophy,
  ChevronRight,
  TrendingDown as StableIcon
} from "lucide-react";
import type { EmployeeInsightData } from "@/lib/types";

interface AIInsightsPanelProps {
  insights: string[];
  trend?: "IMPROVING" | "STABLE" | "DECLINING";
  loading?: boolean;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ 
  insights, 
  trend,
  loading 
}) => {
  if (loading) return (
    <div className="w-full h-48 bg-white/[0.03] border border-white/10 rounded-3xl p-6 animate-pulse" />
  );

  return (
    <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
      
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Proactive AI Insights
        </h4>
        {trend && (
           <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
              trend === "IMPROVING" ? "bg-emerald-500/10 text-emerald-400" : 
              trend === "DECLINING" ? "bg-red-500/10 text-red-400" : 
              "bg-slate-500/10 text-slate-400"
           }`}>
              {trend === "IMPROVING" && <TrendingUp className="w-3 h-3" />}
              {trend === "DECLINING" && <TrendingDown className="w-3 h-3" />}
              {trend === "STABLE" && <StableIcon className="w-3 h-3" />}
              {trend}
           </div>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {insights.length > 0 ? (
            insights.map((insight, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-primary/20 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-slate-200 leading-snug">{insight}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Optimized Advice</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors" />
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 text-slate-500">
               <Trophy className="w-8 h-8 opacity-20" />
               <p className="text-[10px] uppercase font-bold tracking-widest leading-loose">Maintaining Baseline Performance<br />Keep working towards a perfect streak!</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* PROMOTION PREDICTION MOCK (Intelligent Future) */}
      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
             </div>
             <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Career Trajectory</p>
                <p className="text-xs font-bold text-white tracking-tight">On track for promotion review (Projected Q3)</p>
             </div>
         </div>
         <div className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg font-bold uppercase tracking-widest group-hover:scale-110 transition-transform">
             89% Match
         </div>
      </div>
    </div>
  );
};
