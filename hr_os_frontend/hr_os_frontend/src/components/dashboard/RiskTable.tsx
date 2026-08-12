import React from "react";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";
import { TrustScoreBadge } from "@/components/attendance/TrustScoreBadge";

interface RiskEmployee {
  name: string;
  score: number;
  category: "HIGH" | "MEDIUM" | "LOW";
  fraud_flags: number;
}

interface RiskTableProps {
  employees: RiskEmployee[];
  isLoading?: boolean;
}

export const RiskTable: React.FC<RiskTableProps> = ({ employees, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-64 bg-white/5 rounded-3xl animate-pulse border border-white/10" />
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 className="text-white font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          Intelligence Alert Center
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Showing Top Outliers
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Trust Index</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Anomalies</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Risk Level</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                  No risk outliers detected
                </td>
              </tr>
            ) : employees.map((emp, i) => (
              <motion.tr
                key={emp.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-white/5 hover:bg-white/[0.05] transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 p-0.5">
                      <div className="w-full h-full bg-slate-900 rounded-[7px] flex items-center justify-center text-[10px] font-bold text-white">
                        {emp.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{emp.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <TrustScoreBadge score={emp.score} category={emp.category} />
                </td>
                <td className="px-6 py-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-xs font-bold ${
                    emp.fraud_flags > 0 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    <AlertTriangle className="w-3 h-3" />
                    {emp.fraud_flags}
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full ${
                       emp.category === "LOW" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : 
                       emp.category === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"
                     }`} />
                     <span className={`text-[10px] font-black uppercase tracking-widest ${
                       emp.category === "LOW" ? "text-rose-400" : 
                       emp.category === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                     }`}>
                       {emp.category === "LOW" ? "Critical Risk" : 
                        emp.category === "MEDIUM" ? "Under Monitor" : "Optimal"}
                     </span>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-500 hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
