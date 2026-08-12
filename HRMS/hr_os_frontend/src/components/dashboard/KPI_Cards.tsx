import React from "react";
import { 
  LucideIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Shield, 
  Activity, 
  AlertCircle,
  Users
} from "lucide-react";
import { motion } from "framer-motion";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "primary" | "rose" | "amber" | "emerald";
}

const colorMap = {
  primary: "from-primary/20 to-purple-600/20 text-primary border-primary/20",
  rose: "from-rose-500/20 to-pink-600/20 text-rose-400 border-rose-500/20",
  amber: "from-amber-500/20 to-orange-600/20 text-amber-400 border-amber-500/20",
  emerald: "from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/20",
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, trend, color }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden bg-gradient-to-br ${colorMap[color]} border rounded-3xl p-6 backdrop-blur-md transition-all group shadow-xl`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
        <Icon className="w-16 h-16" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
              trend.isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{label}</h4>
          <p className="text-3xl font-black text-white tracking-tighter tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const DashboardKpiGrid: React.FC<{ cards: KpiCardProps[] }> = ({ cards }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <KpiCard key={i} {...card} />
      ))}
    </div>
  );
};
