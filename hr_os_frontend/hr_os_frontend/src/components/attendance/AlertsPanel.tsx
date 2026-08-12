import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, User, TrendingDown, ChevronRight, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertsPanelProps {
  alerts?: any;
  isLoading: boolean;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, isLoading }) => {
  const lateEmployees = alerts?.late_employees || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      <div className="absolute -inset-1 bg-rose-500/10 rounded-[2.5rem] blur-xl" />
      
      <Card className="relative glass-card border-rose-500/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-rose-950/20">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 text-rose-500">
              <ShieldAlert size={28} className="fill-rose-500/10" />
              WORKFORCE ALERTS
            </CardTitle>
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-6">
          {isLoading ? (
            Array(2).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-3xl glass-card border-white/5">
                <Skeleton className="h-12 w-12 rounded-2xl bg-white/5" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24 bg-white/5" />
                  <Skeleton className="h-2 w-16 bg-white/5" />
                </div>
              </div>
            ))
          ) : lateEmployees.length > 0 ? (
            <div className="space-y-4">
               <div className="p-5 bg-rose-500/5 rounded-3xl border border-rose-500/10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400/80 leading-relaxed">
                      CRITICAL BIOMETRIC DRIFT DETECTED: {lateEmployees.length} NODES EXHIBITING RECURRING LATE PATTERNS.
                  </p>
               </div>
               
               <div className="space-y-3">
                 {lateEmployees.map((emp: any, idx: number) => (
                   <motion.div 
                     key={emp.name}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.1 }}
                     whileHover={{ x: 5, scale: 1.02 }}
                     className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer group"
                   >
                     <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-900/40 flex items-center justify-center text-rose-500 font-bold border border-rose-500/20 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-shadow">
                         <User size={24} />
                       </div>
                       <div>
                         <p className="text-lg font-black text-white tracking-tight">{emp.name}</p>
                         <div className="flex items-center gap-1.5 mt-1">
                            <AlertTriangle size={12} className="text-rose-500" />
                            <p className="text-[10px] font-black text-rose-500/80 uppercase tracking-widest">{emp.late_count} VIOLATIONS</p>
                         </div>
                       </div>
                     </div>
                     <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={18} />
                     </div>
                   </motion.div>
                 ))}
               </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center space-y-4"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/10">
                  <Activity size={32} />
              </div>
              <div>
                <p className="text-xl font-black text-white uppercase tracking-tighter">ALL CLEAR</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Zero critical alerts today.</p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AlertsPanel;
