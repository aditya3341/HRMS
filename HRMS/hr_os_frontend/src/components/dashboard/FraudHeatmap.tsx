import React from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Smartphone, 
  Plane, 
  Clock, 
  ShieldAlert,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

interface FraudCluster {
  type: string;
  count: number;
  avg_severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
}

interface FraudHeatmapProps {
  clusters: FraudCluster[];
  isLoading?: boolean;
}

const FraudIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "DEVICE_SWITCH":
      return <Smartphone className="w-5 h-5 text-amber-400" />;
    case "IMPOSSIBLE_TRAVEL":
      return <Plane className="w-5 h-5 text-rose-400" />;
    case "REPEATED_LOCATION":
      return <MapPin className="w-5 h-5 text-rose-500" />;
    default:
      return <ShieldAlert className="w-5 h-5 text-amber-500" />;
  }
};

export const FraudHeatmap: React.FC<FraudHeatmapProps> = ({ clusters, isLoading }) => {
  if (isLoading) {
    return <div className="h-48 bg-white/5 rounded-3xl animate-pulse" />;
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          Fraud Signature Heatmap
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Global Risk Patterns
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {clusters.length === 0 ? (
          <div className="col-span-3 text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">
            No intelligence signals detected
          </div>
        ) : clusters.map((cluster, i) => (
          <motion.div
            key={cluster.type}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 bg-black/20 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-all group group-hover:bg-black/40"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                <FraudIcon type={cluster.type} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                  {cluster.type.replace(/_/g, ' ')}
                </h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                  Active Signals
                </p>
              </div>
              <span className={`text-xl font-black tabular-nums transition-colors ${
                cluster.avg_severity === "HIGH" ? "text-rose-500" : "text-amber-500"
              }`}>
                {cluster.count}
              </span>
            </div>
            
            <p className="text-[10px] text-slate-400 mb-4 line-clamp-2 h-8">
              {cluster.description}
            </p>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    cluster.avg_severity === "HIGH" ? "bg-rose-500" : "bg-amber-500"
                  }`} 
                  style={{ width: `${Math.min(100, cluster.count * 10)}%` }} 
                />
              </div>
            </div>

            <button className="w-full py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              View Specifics
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
