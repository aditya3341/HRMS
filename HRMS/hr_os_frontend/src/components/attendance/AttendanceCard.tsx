import React from "react";
import { motion } from "framer-motion";
import {
  Calendar, CheckCircle2, Clock, Fingerprint, Info, TrendingUp, TrendingDown
} from "lucide-react";
import { useAttendanceModeConfig, useTodaySummary, useAttendanceHistory } from "@/hooks/useAttendance";
import { format } from "date-fns";
import { AttendanceTrendChart } from "@/components/dashboard/AttendanceTrendChart";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/attendanceApi";
import { toast } from "sonner";

export const AttendanceCard: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: modeCfg, isLoading: isModeLoading } = useAttendanceModeConfig();
  const { data: summary, isLoading: isSummaryLoading } = useTodaySummary();
  const { data: history } = useAttendanceHistory();

  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today-summary"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-recent"] });
      toast.success("Checked in successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to check in");
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today-summary"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-recent"] });
      toast.success("Checked out successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to check out");
    }
  });

  const isLoading = isModeLoading || isSummaryLoading;
  const isBiometricMode = modeCfg?.mode === "BIOMETRIC";

  if (isLoading) {
    return <div className="w-full h-48 bg-white/5 animate-pulse rounded-3xl border border-white/10" />;
  }

  const hasData = summary && (summary.first_check_in || summary.last_check_out);
  
  // Calculate Weekly Trend (last 7 recorded days)
  const weeklyHours = (history || [])
    .slice(0, 7)
    .reverse()
    .map(day => day.total_hours || 0);
  
  const currentAvg = weeklyHours.slice(-3).reduce((a, b) => a + b, 0) / 3 || 0;
  const prevAvg = weeklyHours.slice(0, 3).reduce((a, b) => a + b, 0) / 3 || 0;
  const isImproving = currentAvg >= prevAvg;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden group bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all hover:bg-white/[0.05]"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity" />
      
      <div className="flex flex-wrap 2xl:flex-nowrap gap-6 items-center relative z-10">
        {/* Section 1: Header & Status */}
        <div className="space-y-4 min-w-[280px] flex-1">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">{format(new Date(), "EEEE, MMM do")}</span>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white tracking-tight">Today's Attendance</h2>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isBiometricMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isBiometricMode ? <Fingerprint className="w-3.5 h-3.5" /> : null} 
                {isBiometricMode ? 'Biometric Sync' : 'Manual Mode'}
              </span>
              {hasData && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Weekly Trend */}
        <div className="flex items-center gap-6 px-6 py-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-md justify-between">
            <div className="shrink-0">
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5">Weekly Trend</p>
               <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isImproving ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                     {isImproving ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight">{isImproving ? 'Improving' : 'Declining'}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Consistency</p>
                  </div>
               </div>
            </div>
            <div className="flex-1 max-w-[120px]">
              <AttendanceTrendChart data={weeklyHours.length > 0 ? weeklyHours : [0,0,0,0,0,0,0]} />
            </div>
        </div>

        {/* Section 3: Punch Times / Web Check-In Actions */}
        {isBiometricMode ? (
          !hasData ? (
            <div className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                <Info className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">Syncing data...</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Awaiting biometric punch</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between xl:justify-end gap-6 bg-black/40 rounded-3xl px-6 py-4 border border-white/5 shadow-inner">
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">In</p>
                <p className="text-lg font-mono font-bold text-white">
                  {summary.first_check_in ? format(new Date(summary.first_check_in), "hh:mm a") : "--:--"}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Out</p>
                <p className="text-lg font-mono font-bold text-white">
                  {summary.last_check_out ? format(new Date(summary.last_check_out), "hh:mm a") : "--:--"}
                </p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total</p>
                <div className="flex items-baseline justify-center gap-1">
                  <p className="text-xl font-mono font-black text-primary tracking-tighter">
                    {summary.total_hours?.toFixed(1) || "0.0"}
                  </p>
                  <span className="text-[9px] font-bold text-primary/60 uppercase">h</span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-6 bg-black/40 rounded-3xl px-6 py-4 border border-white/5 shadow-inner">
            {summary?.first_check_in && (
              <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">In</p>
                <p className="text-sm font-mono font-bold text-white">
                  {format(new Date(summary.first_check_in), "hh:mm a")}
                </p>
              </div>
            )}
            
            {summary?.last_check_out && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Out</p>
                  <p className="text-sm font-mono font-bold text-white">
                    {format(new Date(summary.last_check_out), "hh:mm a")}
                  </p>
                </div>
              </>
            )}

            {summary?.first_check_in && summary?.last_check_out && (
              <>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Total</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="text-lg font-mono font-black text-primary tracking-tighter">
                      {summary.total_hours?.toFixed(1) || "0.0"}
                    </p>
                    <span className="text-[9px] font-bold text-primary/60 uppercase">h</span>
                  </div>
                </div>
              </>
            )}

            {/* Manual actions */}
            {!summary?.first_check_in && (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50"
              >
                {checkInMutation.isPending ? "Checking In..." : "Check In"}
              </button>
            )}

            {summary?.first_check_in && !summary?.last_check_out && (
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50"
              >
                {checkOutMutation.isPending ? "Checking Out..." : "Check Out"}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
