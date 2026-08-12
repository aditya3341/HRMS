import React from "react";
import { Shield, ShieldAlert, ShieldCheck, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreBadgeProps {
  score: number;
  category: "HIGH" | "MEDIUM" | "LOW";
}

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({ score, category }) => {
  const config = {
    HIGH: {
      icon: ShieldCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "Trusted",
    },
    MEDIUM: {
      icon: Shield,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      label: "Monitor",
    },
    LOW: {
      icon: ShieldAlert,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      label: "Risk",
    },
  }[category];

  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${config.bg} ${config.border} cursor-help group transition-all hover:scale-105`}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
            <div className="flex flex-col items-start">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs font-bold text-white leading-none">
                Score: {score}
              </span>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 border-white/10 text-white p-3 max-w-[200px]">
          <div className="space-y-2">
            <p className="font-bold text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Trust Score
            </p>
            <p className="text-xs text-slate-400">
              Computed based on attendance consistency, on-time ratio, and regularization history.
            </p>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${score > 70 ? 'bg-emerald-500' : score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
