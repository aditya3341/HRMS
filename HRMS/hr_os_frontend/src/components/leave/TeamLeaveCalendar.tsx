import React, { useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWithinInterval
} from "date-fns";
import { ChevronLeft, ChevronRight, Info, Users, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getLeaves } from "@/lib/leaveApi";

export default function TeamLeaveCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["teamLeaves", currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: () => getLeaves(), // Backend expanded to show team leaves for managers
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Filter approved/pending leaves for this month
  const activeLeaves = leaves.filter(l => l.status === "APPROVED" || l.status === "PENDING");

  return (
    <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">
               <Users className="w-5 h-5" />
             </div>
             <h2 className="text-2xl font-black tracking-tighter uppercase">{format(currentDate, "MMMM yyyy")}</h2>
          </div>
          <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase opacity-60">Team Availability Dashboard</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/5 bg-white/5 p-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl h-10 w-10 hover:bg-white/5">
              <ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-white" />
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl h-10 w-10 hover:bg-white/5">
              <ChevronRight className="w-5 h-5 text-muted-foreground hover:text-white" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="rounded-xl border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest">
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-white/5 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-white/5">
            {day}
          </div>
        ))}
        
        {isLoading ? (
          Array(35).fill(0).map((_, i) => (
             <div key={i} className="min-h-[140px] p-2 bg-background/20 relative border-r border-b border-white/5 animate-pulse">
                <Skeleton className="h-4 w-6 bg-white/5 rounded" />
             </div>
          ))
        ) : (
          calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            const isSunday = day.getDay() === 0;
            const isSecondSaturday = day.getDay() === 6 && day.getDate() >= 8 && day.getDate() <= 14;
            const isWeekendHoliday = isSunday || isSecondSaturday;
            
            // Find leaves overlapping with this day
            const leavesOnDay = activeLeaves.filter(l => {
              const start = new Date(l.start_date);
              const end = new Date(l.end_date);
              return isWithinInterval(day, { start, end });
            });

            const isHighAbsence = leavesOnDay.length >= 3;

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[140px] p-2 bg-white/[0.01] transition-all duration-300 relative border-r border-b border-white/5 group",
                  !isCurrentMonth && "opacity-20 pointer-events-none grayscale",
                  isToday && "bg-primary/[0.03]",
                  isHighAbsence && "bg-rose-500/[0.02]",
                  isWeekendHoliday && "bg-blue-500/[0.02] border-blue-500/20"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={cn(
                    "text-xs font-black p-1",
                    isToday && "w-7 h-7 flex items-center justify-center rounded-xl bg-primary text-white shadow-xl shadow-primary/30",
                    isWeekendHoliday && !isToday && "text-blue-400 opacity-90"
                  )}>
                    {format(day, "d")}
                  </span>
                  
                  {isWeekendHoliday && (
                    <span className="text-[7px] font-black text-blue-400/50 uppercase tracking-widest mr-1">Holiday</span>
                  )}

                  {isHighAbsence && (
                    <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-none scale-75 p-1">
                      <AlertTriangle className="w-3 h-3" />
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 overflow-hidden">
                  <AnimatePresence mode="popLayout">
                    {leavesOnDay.slice(0, 4).map((l, idx) => (
                      <TooltipProvider key={l.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                "text-[10px] px-2 py-1.5 rounded-lg truncate cursor-pointer font-bold border-l-2 shadow-sm transition-all hover:translate-x-1",
                                l.status === "PENDING" ? "bg-amber-500/10 border-amber-500 text-amber-500 hover:bg-amber-500/20" : "bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500/20"
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{l.employee?.full_name || "Employee"}</span>
                              </div>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-background/95 border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl max-w-xs">
                             <div className="space-y-2">
                               <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                   <Users className="w-3 h-3" />
                                 </div>
                                 <p className="text-xs font-bold">{l.employee?.full_name}</p>
                               </div>
                               <div className="space-y-1">
                                 <p className="text-[10px] font-bold text-muted-foreground uppercase">{l.leave_type?.name}</p>
                                 <p className="text-[10px] opacity-70 italic line-clamp-2">"{l.reason}"</p>
                               </div>
                               <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                                 <span className="text-[9px] font-bold opacity-60 uppercase">{l.days} Days Applied</span>
                                 <Badge className={cn("text-[9px] px-1.5 py-0 border-none", l.status === "PENDING" ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500")}>
                                     {l.status}
                                 </Badge>
                               </div>
                             </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </AnimatePresence>
                  {leavesOnDay.length > 4 && (
                    <div className="text-[9px] font-bold opacity-40 px-2 py-1 uppercase tracking-widest">+ {leavesOnDay.length - 4} more</div>
                  )}
                </div>

                {isHighAbsence && (
                   <div className="absolute bottom-1 right-2 text-[8px] font-black text-rose-500/40 uppercase tracking-tighter">
                     Critical Absence
                   </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6 justify-center md:justify-start">
         <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Approved Leave</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Pending Review</span>
         </div>
         <div className="flex items-center gap-2">
           <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-bold uppercase tracking-widest">
             High Absence Day
           </div>
         </div>
      </div>
    </div>
  );
}
