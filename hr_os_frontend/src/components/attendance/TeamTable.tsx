import React from "react";
import { motion } from "framer-motion";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, ExternalLink, MapPin, Activity } from "lucide-react";

interface TeamTableProps {
  data?: any[];
  isLoading: boolean;
}

const TeamTable: React.FC<TeamTableProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 w-full glass-card rounded-[2rem] border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[2.8rem] glass-card border-white/5 overflow-hidden shadow-2xl"
    >
      <Table>
        <TableHeader className="bg-white/[0.02]">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="h-16 px-10 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Employee Details</TableHead>
            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Node Status</TableHead>
            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Session Start</TableHead>
            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">Accumulated Hours</TableHead>
            <TableHead className="h-16 px-10 text-right font-black text-[10px] uppercase tracking-[0.2em] text-slate-500">System Logs</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((row, idx) => (
            <motion.tr 
              key={row.employee_id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group hover:bg-white/[0.04] transition-all border-white/5"
            >
              <TableCell className="px-10 py-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-white/10 shadow-2xl ring-4 ring-white/[0.02]">
                      <AvatarFallback className="bg-indigo-500/10 text-indigo-400 font-black text-lg">
                        {row.full_name?.split(' ').map((n: any) => n[0]).join('') || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-4 border-[#0B1224] ${row.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-white tracking-tighter leading-none">{row.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-2 opacity-40">
                       <MapPin size={10} className="text-white" />
                       <p className="text-[9px] text-white font-black uppercase tracking-[0.2em]">Remote · Encrypted</p>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl w-fit border ${
                    row.status === "PRESENT" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" :
                    row.status === "HALF_DAY" ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                    "bg-rose-500/5 border-rose-500/20 text-rose-400"
                  }`}>
                   <div className={`h-2 w-2 rounded-full ${
                        row.status === "PRESENT" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                        row.status === "HALF_DAY" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                        "bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{row.status}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                   <Clock size={16} className="text-slate-600" />
                   <div>
                    <span className="text-sm font-black text-white tabular-nums">
                      {row.check_in ? new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "--:--"}
                    </span>
                    {row.is_late && (
                      <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5 animate-pulse">Late Entry Detected</p>
                    )}
                   </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-white tabular-nums tracking-tighter">
                    {row.total_hours || "0.0"}
                  </span>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">HRS</span>
                </div>
              </TableCell>
              <TableCell className="px-10 text-right">
                 <button className="h-10 w-10 glass-card border-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all ml-auto group/inspect">
                    <ExternalLink size={16} className="group-hover/inspect:scale-110 transition-transform" />
                 </button>
              </TableCell>
            </motion.tr>
          ))}
          {!data?.length && (
              <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                      <div className="space-y-4">
                        <div className="p-4 bg-white/5 w-fit rounded-full mx-auto border border-white/5">
                            <Activity size={32} className="text-slate-600" />
                        </div>
                        <p className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] italic">No active workforce segments detected for today.</p>
                      </div>
                  </TableCell>
              </TableRow>
          )}
        </TableBody>
      </Table>
    </motion.div>
  );
};

export default TeamTable;
