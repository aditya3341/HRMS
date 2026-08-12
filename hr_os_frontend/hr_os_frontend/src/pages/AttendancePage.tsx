import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  LayoutGrid,
  Zap,
  Activity,
  Target
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useAttendance, useAttendanceHistory } from "@/hooks/useAttendance";
import { useAttendanceAlerts } from "@/hooks/useAttendanceAlerts";
import { attendanceApi } from "@/lib/attendanceApi";
import CheckInCard from "@/components/attendance/CheckInCard";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import AlertsPanel from "@/components/attendance/AlertsPanel";
import TeamTable from "@/components/attendance/TeamTable";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isManager = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"].includes(user?.role?.toUpperCase() ?? "");

  const { data: todayRecord, isLoading: isLoadingToday, refetch: refetchToday } = useAttendance();
  const { data: attendanceHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = useAttendanceHistory();
  const { data: alertsData, isLoading: isLoadingAlerts } = useAttendanceAlerts();

  const { 
    data: teamAttendance, 
    isLoading: isLoadingTeamAttendance,
    refetch: refetchTeam
  } = useQuery({
    queryKey: ["teamAttendance"],
    queryFn: () => attendanceApi.getTeamAttendance(),
    enabled: isManager
  });

  const handleRefresh = () => {
      refetchToday();
      refetchHistory();
      if (isManager) refetchTeam();
  };

  const stats = React.useMemo(() => {
    if (!attendanceHistory) return { present: 0, halfDay: 0, absent: 0, late: 0, avgHours: 0, productivity: 0 };
    const present = attendanceHistory.filter((r) => r.status === "PRESENT").length;
    const halfDay = attendanceHistory.filter((r) => r.status === "HALF_DAY").length;
    const absent = attendanceHistory.filter((r) => r.status === "ABSENT").length;
    const late = attendanceHistory.filter((r) => r.is_late).length;
    
    const recordsWithHours = attendanceHistory.filter((r) => r.total_hours);
    const avgHours = recordsWithHours.length > 0 
        ? recordsWithHours.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) / recordsWithHours.length 
        : 0;
    
    const productivity = Math.min(100, (avgHours / 8) * 100);

    return { present, halfDay, absent, late, avgHours: avgHours.toFixed(1), productivity: Math.round(productivity) };
  }, [attendanceHistory]);

  return (
    <div className="relative min-h-screen pb-20 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* BACKGROUND ELEMENTS */}
      <div className="mesh-bg" />
      <div className="bg-noise" />

      <div className="container max-w-7xl mx-auto px-6 pt-12 space-y-12">
        {/* HERO HEADER */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6"
        >
          <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border-white/5 w-fit">
                  <Zap size={14} className="text-amber-400 fill-amber-400/20" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">SaaS Dashboard</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-6xl font-black tracking-tighter text-white">
                    WORKFORCE <span className="gradient-text">PULSE</span>
                </h1>
                <div className="flex items-center gap-2">
                   <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
                   <p className="text-slate-400 font-medium tracking-tight">Real-time workforce intelligence and absence insights.</p>
                </div>
              </div>
          </div>
          
          <Button 
              onClick={handleRefresh}
              className="group relative px-8 h-14 glass-card border-white/10 hover:border-white/20 text-white font-black text-[11px] uppercase tracking-[0.25em] transition-all active:scale-95 overflow-hidden"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 relative z-10">
                <RefreshCcw size={16} className={`group-hover:rotate-180 transition-transform duration-700 ${isLoadingToday ? "animate-spin" : ""}`} />
                <span>Sync Pulse</span>
              </div>
          </Button>
        </motion.header>

        {/* MAIN INTERACTION ZONE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left: Check-in & Metrics */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-10">
              <CheckInCard currentAttendance={todayRecord} isLoading={isLoadingToday} />
              
              {/* INSIGHTS GRID */}
              <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Days Present", val: stats.present, icon: CheckCircle, color: "text-emerald-400" },
                    { label: "Late Count", val: stats.late, icon: Clock, color: "text-rose-400" },
                    { label: "Avg Hours", val: `${stats.avgHours}h`, icon: Activity, color: "text-indigo-400" },
                    { label: "Productivity", val: `${stats.productivity}%`, icon: Target, color: "text-purple-400" }
                  ].map((item, i) => (
                    <motion.div 
                      key={item.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      className="p-6 rounded-[2.5rem] glass-card border-white/5 glow-hover flex flex-col justify-between"
                    >
                        <item.icon className={`${item.color} mb-6`} size={24} />
                        <div>
                          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{item.val}</p>
                          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mt-1">{item.label}</p>
                        </div>
                    </motion.div>
                  ))}
              </div>

              {isManager && <AlertsPanel alerts={alertsData} isLoading={isLoadingAlerts} />}
          </div>

          {/* Right: Data Visualization */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-10">
              <AttendanceCalendar records={attendanceHistory} isLoading={isLoadingHistory} />
              
              {isManager && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                          <div className="flex items-center gap-4">
                               <div className="h-12 w-12 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-2xl">
                                  <Users size={24} className="text-indigo-400" />
                               </div>
                               <div>
                                  <h3 className="text-2xl font-black tracking-tighter text-white">TEAM VISIBILITY</h3>
                                  <div className="flex items-center gap-2">
                                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Workforce Live Monitor</p>
                                  </div>
                               </div>
                          </div>
                          <div className="px-6 py-2.5 rounded-2xl glass-card border-white/5">
                              <span className="text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase">
                                  {teamAttendance?.length || 0} TOTAL NODES
                              </span>
                          </div>
                      </div>
                      <TeamTable data={teamAttendance} isLoading={isLoadingTeamAttendance} />
                  </motion.div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
