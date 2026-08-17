import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceCalendarProps {
  records?: any[];
  isLoading: boolean;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ records, isLoading }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayInfo = (date: Date) => {
    return records?.find(r => isSameDay(new Date(r.date || r.attendance_date), date));
  };

  const getStatusStyles = (record: any, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "opacity-10 grayscale";
    if (!record) return "bg-white/[0.02] border border-white/[0.05] text-slate-700 hover:border-white/10";
    
    switch (record.status) {
      case "PRESENT": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
      case "HALF_DAY": return "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
      case "ABSENT": return "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]";
      default: return "bg-white/[0.02] border-white/[0.05] text-slate-700";
    }
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <TooltipProvider>
      <Card className="glass-card border-white/5 rounded-[2.5rem] shadow-none overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-10 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black uppercase tracking-tighter text-white">Attendance Grid</CardTitle>
            <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Absence Network Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-black text-white uppercase tracking-[0.2em] bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-2xl glass-card border-white/5 hover:bg-white/10 text-white" 
                onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() - 1)))}
              >
                <ChevronLeft size={20} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-2xl glass-card border-white/5 hover:bg-white/10 text-white" 
                onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() + 1)))}
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-6">
          <div className="grid grid-cols-7 gap-4 mb-4">
            {weekdays.map(day => (
              <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 pb-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-4">
            {days.map((day, idx) => {
              const record = getDayInfo(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <Tooltip key={day.toString()}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.005 }}
                      whileHover={isCurrentMonth ? { y: -4, scale: 1.05 } : {}}
                      className={`relative aspect-square rounded-[1.25rem] flex flex-col items-center justify-center transition-all duration-300 cursor-default ${getStatusStyles(record, isCurrentMonth)} ${isToday(day) ? 'ring-2 ring-indigo-500/50 ring-offset-4 ring-offset-[#0B0F1A]' : ''}`}
                    >
                      <span className={`text-lg font-black tabular-nums tracking-tighter`}>
                        {format(day, "d")}
                      </span>
                      {isToday(day) && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  {isCurrentMonth && (
                    <TooltipContent className="glass-card border-white/10 bg-slate-900/90 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-2xl">
                       <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{format(day, "EEEE, MMM do")}</p>
                          <div className="flex items-center gap-3">
                             <div className={`h-2 w-2 rounded-full ${record?.status === 'PRESENT' ? 'bg-emerald-500' : record?.status === 'HALF_DAY' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                             <p className="text-sm font-bold uppercase tracking-tight">{record?.status || "NO RECORD"}</p>
                          </div>
                          {record?.check_in && (
                            <div className="pt-2 border-t border-white/5 space-y-1">
                               <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Login: <span className="text-white ml-2">{format(new Date(record.check_in), "p")}</span></p>
                               {record.check_out && <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Logout: <span className="text-white ml-2">{format(new Date(record.check_out), "p")}</span></p>}
                               {record.total_hours && <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Hours: <span className="text-indigo-400 font-black ml-2">{record.total_hours}h</span></p>}
                            </div>
                          )}
                       </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between mt-12 pt-10 border-t border-white/5">
            <div className="flex items-center gap-2 p-3 px-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 w-fit">
              <Info size={14} className="text-indigo-400" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-tight">Hover over markers for deep dive details.</p>
            </div>
            
            <div className="flex items-center gap-10">
              {[
                { label: "PRESENT", color: "bg-emerald-500" },
                { label: "HALF DAY", color: "bg-amber-500" },
                { label: "ABSENT", color: "bg-rose-500" }
              ].map(status => (
                <div key={status.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.color} shadow-lg`} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default AttendanceCalendar;
