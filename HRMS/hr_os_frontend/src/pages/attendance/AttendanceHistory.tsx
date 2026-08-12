import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Calendar, Filter, FileDown, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { attendanceApi, AttendanceRecord } from "@/lib/attendanceApi";
import { PageHeader } from "@/components/PageHeader";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export default function AttendanceHistory() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: history, isLoading } = useQuery({
    queryKey: ["attendance-history", month, year],
    queryFn: () => attendanceApi.getMyHistory(month, year),
  });

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "LATE": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "HALF_DAY": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "ABSENT": return "bg-red-500/10 text-red-400 border border-red-500/20";
      default: return "bg-slate-500/10 text-slate-400";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        icon={History}
        title="Attendance History"
        subtitle="Review your past attendance records, check-in times, and working hours."
        actions={
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all">
                <FileDown className="w-4 h-4" />
                Export CSV
            </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 space-y-4">
            <div className="flex justify-between items-center bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-40 justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-lg font-bold text-white tracking-tight">{format(currentDate, "MMMM yyyy")}</span>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-4 w-px bg-white/10 mx-2" />
                    <button className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest">
                        <Filter className="w-3.5 h-3.5" />
                        Filter Status
                    </button>
                </div>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Check In</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Check Out</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Hours</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5">
                            {isLoading ? (
                                [...Array(10)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-5 h-16 bg-white/5" />
                                    </tr>
                                ))
                            ) : history && history.length > 0 ? (
                                history.map((record, i) => (
                                    <motion.tr 
                                        key={record.id || i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-white/5 rounded-xl border border-white/5 group-hover:border-primary/20 transition-colors">
                                                    <span className="text-xs font-bold text-slate-200">{format(new Date(record.date), "dd")}</span>
                                                    <span className="text-[10px] font-bold text-primary uppercase">{format(new Date(record.date), "MMM")}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white tracking-tight">{format(new Date(record.date), "EEEE")}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium">{format(new Date(record.date), "yyyy")}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-xs text-slate-400 group-hover:text-slate-200 transition-colors tracking-tight">
                                                {record.check_in ? format(new Date(record.check_in), "hh:mm a") : "--:-- --"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-mono text-xs text-slate-400 group-hover:text-slate-200 transition-colors tracking-tight">
                                                {record.check_out ? format(new Date(record.check_out), "hh:mm a") : "--:-- --"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg border border-white/5 group-hover:border-primary/20 transition-all">
                                                <span className="font-bold text-white text-xs">{record.total_hours?.toFixed(1) || "0.0"}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">h</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-primary/20 hover:text-primary rounded-lg transition-all text-slate-500">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-white/5 rounded-full border border-white/10">
                                                <History className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-medium tracking-tight">No attendance records found for this month.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className="w-full lg:w-1/4 space-y-6">
            <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    Month Summary
                </h4>
                
                <div className="space-y-4">
                    {[
                        { label: "Check-in rate", value: "98%", color: "text-emerald-400" },
                        { label: "Punctuality", value: "92%", color: "text-amber-400" },
                        { label: "Avg Shift", value: "8.2h", color: "text-blue-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="flex justify-between items-center p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                            <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-transparent border border-white/10 rounded-3xl p-6">
                <h4 className="text-sm font-bold text-white mb-2">Need help?</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-4">
                    If you believe there is a discrepancy in your attendance logs, please contact your manager or HR department.
                </p>
                <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 uppercase tracking-widest">
                    Submit Dispute
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
