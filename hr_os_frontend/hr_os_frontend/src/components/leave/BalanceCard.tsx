import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { LeaveBalance } from "@/lib/types";

interface BalanceCardProps {
  balance: LeaveBalance;
  className?: string;
}

export default function BalanceCard({ balance, className }: BalanceCardProps) {
  const usagePercentage = balance.allocated > 0 
    ? (balance.used / balance.allocated) * 100 
    : 0;

  const isNearExpiry = balance.expiry_date 
    ? differenceInDays(new Date(balance.expiry_date), new Date()) <= 30 && differenceInDays(new Date(balance.expiry_date), new Date()) >= 0
    : false;

  // Generate a subtle color based on leave name
  const getColors = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("sick")) return "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20";
    if (n.includes("casual")) return "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20";
    if (n.includes("earned") || n.includes("privilege")) return "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20";
    return "from-slate-500/20 to-slate-500/5 text-slate-400 border-slate-500/20";
  };

  const colorClasses = getColors(balance.leave_type?.name || "");

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={cn(
        "relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br backdrop-blur-sm shadow-xl shadow-black/20",
        colorClasses,
        className
      )}
    >
      {isNearExpiry && (
        <Badge className="absolute top-3 right-3 bg-amber-500/20 text-amber-500 border-amber-500/30 text-[9px] px-1.5 py-0">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expiring {format(new Date(balance.expiry_date!), "MMM dd")}
        </Badge>
      )}

      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1.5">
            {balance.leave_type?.name}
          </p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-black tracking-tighter">
              {balance.remaining}
            </h3>
            <span className="text-sm font-bold opacity-40 uppercase">Remaining</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-0.5">Allocated</p>
            <p className="text-sm font-bold">{balance.allocated}</p>
          </div>
          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-0.5">Used</p>
            <p className="text-sm font-bold">{balance.used}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase tracking-wider">
            <span>Utilization</span>
            <span>{Math.round(usagePercentage)}%</span>
          </div>
          <Progress 
            value={usagePercentage} 
            className="h-2 bg-white/5" 
            indicatorClassName={cn(
               "bg-current opacity-90 transition-all duration-1000",
               usagePercentage > 85 ? "bg-rose-500" : usagePercentage > 60 ? "bg-amber-500" : ""
            )} 
          />
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-current opacity-[0.05] blur-3xl pointer-events-none" />
    </motion.div>
  );
}
