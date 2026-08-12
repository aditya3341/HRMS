import React from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Smartphone, 
  Plane, 
  Clock, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FraudFlag } from "@/lib/types";
import { format } from "date-fns";

interface FraudAlertsPanelProps {
  flags?: FraudFlag[] | null;
  isLoading?: boolean;
}

const FraudIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "DEVICE_SWITCH":
      return <Smartphone className="w-4 h-4" />;
    case "IMPOSSIBLE_TRAVEL":
      return <Plane className="w-4 h-4" />;
    case "REPEATED_LOCATION":
      return <MapPin className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

export const FraudAlertsPanel: React.FC<FraudAlertsPanelProps> = ({ flags, isLoading }) => {
  if (isLoading) {
    return <div className="h-48 w-full bg-rose-500/5 rounded-3xl animate-pulse border border-rose-500/10" />;
  }

  if (!flags || flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3 opacity-50" />
        <h4 className="text-emerald-400 font-bold mb-1">Integrity Clean</h4>
        <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-bold">No fraud flags detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <AlertTriangle className="w-24 h-24 text-rose-500" />
      </div>

      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-rose-400 font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Fraud Anomalies
        </h3>
        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {flags.length} Flag{flags.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3 relative z-10">
        <AnimatePresence>
          {flags.map((flag, i) => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-black/40 border border-white/5 rounded-2xl p-4 hover:border-rose-500/30 transition-all flex items-start gap-4 shadow-lg"
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${
                flag.severity === "HIGH" ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
              }`}>
                <FraudIcon type={flag.fraud_type} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {flag.fraud_type.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {format(new Date(flag.created_at), "HH:mm, dd MMM")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {flag.details?.reason || `Irregularity detected in ${flag.fraud_type.toLowerCase()} pattern.`}
                </p>
                {flag.severity === "HIGH" && (
                  <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest text-white bg-rose-600 px-2 py-0.5 rounded-sm">
                    High Severity
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-[10px] text-slate-500 italic mt-4 relative z-10 text-center">
        🛡 Intelligent detection engine monitoring real-time integrity
      </p>
    </div>
  );
};
