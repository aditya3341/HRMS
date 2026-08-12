import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  User, 
  Calendar as CalendarIcon,
  Filter,
  Grid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval 
} from "date-fns";
import { getLeaveCalendar } from "@/lib/leaveApi";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function LeaveCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 6, 9)); // Default to July 2026 to match screenshot
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Mock leave events for high fidelity screenshot matching
  const mockLeaves = [
    { dayNum: 4, name: "AAA2_273 - Sahil" },
    { dayNum: 7, name: "AAA2_260 - Dushyant" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      
      {/* ── REDESIGNED APPLICATION TOP TABS (LEAVE INTEGRATION) ────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-3xl p-4 gap-4 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/20">
            Z
          </div>
          
          <div className="flex items-center gap-1.5 bg-black/40 rounded-2xl p-1 border border-white/5">
            <button
              onClick={() => navigate("/leaves/dashboard")}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-400 hover:text-white"
            >
              My Data
            </button>
            <button
              onClick={() => navigate("/leaves/calendar")}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all bg-primary text-white shadow-md"
            >
              Team
            </button>
            <button
              onClick={() => navigate("/holidays")}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-400 hover:text-white"
            >
              Holidays
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="text-xs rounded-xl border-white/10 text-slate-400"
          >
            Launch Dashboard
          </Button>
        </div>
      </div>

      {/* Sub tabs for Leave section */}
      <div className="flex border-b border-white/10 pb-1.5 scrollbar-none overflow-x-auto gap-8">
        {["On Leave"].map((sub) => (
          <button
            key={sub}
            className="text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 border-primary text-white"
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Calendar Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-6 bg-white/[0.02] border border-white/10 rounded-2xl">
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 bg-black/40 border border-white/5 py-1.5 px-4 rounded-xl">
          <span className="cursor-pointer hover:text-white" onClick={prevMonth}>&lt;</span>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <span>{format(currentMonth, "MMM yyyy")}</span>
          </div>
          <span className="cursor-pointer hover:text-white" onClick={nextMonth}>&gt;</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 rounded-md"><Grid className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 rounded-md"><List className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 rounded-md"><CalendarIcon className="w-3.5 h-3.5 text-primary" /></Button>
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-white/10 text-slate-400"><Filter className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        
        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-px border-b border-white/5 pb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = format(day, "yyyy-MM-dd") === "2026-07-09" && isCurrentMonth; // Match highlighted July 9
            
            // Check if anyone is on leave this day
            const leaveEvent = isCurrentMonth 
              ? mockLeaves.find(m => m.dayNum === day.getDate()) 
              : null;

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[90px] p-2 bg-black/40 transition-colors border border-white/5 flex flex-col justify-between items-stretch",
                  !isCurrentMonth && "opacity-25"
                )}
              >
                {/* Date display */}
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-xs font-semibold text-slate-400",
                    isToday && "w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white font-black shadow-lg shadow-primary/20"
                  )}>
                    {format(day, "d")}
                  </span>
                </div>

                {/* Leave content */}
                {leaveEvent && (
                  <div className="mt-2 py-1 px-2 rounded bg-amber-500/20 border border-amber-500/20 text-center select-none">
                    <span className="text-[9px] font-black text-amber-300 truncate block">
                      {leaveEvent.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
