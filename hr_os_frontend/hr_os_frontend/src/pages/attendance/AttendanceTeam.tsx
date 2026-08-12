import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Search, Filter, Mail, Phone, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { attendanceApi } from "@/lib/attendanceApi";
import { PageHeader } from "@/components/PageHeader";
import { format } from "date-fns";

export default function AttendanceTeam() {
  const { data: team, isLoading } = useQuery({
    queryKey: ["attendance-team"],
    queryFn: attendanceApi.getTeamAttendance,
    refetchInterval: 30000, // Refresh every 30s
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
      case "LATE": return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
      case "HALF_DAY": return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
      case "ABSENT": return "text-red-400 bg-red-500/10 border border-red-500/20";
      default: return "text-slate-400 bg-slate-500/10";
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        icon={Users}
        title="Team Attendance"
        subtitle="Real-time status of your direct reports for today."
        actions={
            <div className="flex items-center gap-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search employee..." 
                        className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all w-64"
                    />
                </div>
                <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                    <Filter className="w-4 h-4" />
                </button>
            </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
            [...Array(8)].map((_, i) => (
                <div key={i} className="h-56 bg-white/5 border border-white/10 rounded-3xl animate-pulse" />
            ))
        ) : team && team.length > 0 ? (
            team.map((emp, i) => (
                <motion.div
                    key={emp.employee_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group relative overflow-hidden"
                >
                    {/* Background Status Glow */}
                    <div className={`absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full blur-3xl opacity-10 ${
                        emp.status === 'PRESENT' ? 'bg-emerald-500' :
                        emp.status === 'LATE' ? 'bg-amber-500' :
                        emp.status === 'HALF_DAY' ? 'bg-blue-500' :
                        'bg-red-500'
                    }`} />

                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {getInitials(emp.full_name || "??")}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${getStatusColor(emp.status)}`}>
                            {emp.status}
                        </span>
                    </div>

                    <div className="space-y-1 mb-6">
                        <h4 className="text-white font-bold tracking-tight">{emp.full_name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Direct Report</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-2xl p-4 border border-white/5 mb-6">
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Check In</p>
                            <p className="text-xs font-mono text-white/80">{emp.check_in ? format(new Date(emp.check_in), "hh:mm a") : "--:--"}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Check Out</p>
                            <p className="text-xs font-mono text-white/80">{emp.check_out ? format(new Date(emp.check_out), "hh:mm a") : "--:--"}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white hover:bg-primary/20 hover:border-primary/30 transition-all flex items-center justify-center gap-2">
                            <Mail className="w-3 h-3" />
                            Email
                        </button>
                        <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-primary/20 hover:border-primary/30 transition-all">
                            <Phone className="w-3 h-3" />
                        </button>
                    </div>
                </motion.div>
            ))
        ) : (
            <div className="col-span-full py-20 bg-white/[0.02] border border-white/10 border-dashed rounded-3xl flex flex-col items-center gap-4">
                <div className="p-5 bg-white/5 rounded-full">
                    <Users className="w-10 h-10 text-slate-600" />
                </div>
                <div className="text-center">
                    <h5 className="text-white font-bold tracking-tight">No Team Data</h5>
                    <p className="text-xs text-slate-500 font-medium mt-1">No employees assigned to your reporting line have checked in today.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
