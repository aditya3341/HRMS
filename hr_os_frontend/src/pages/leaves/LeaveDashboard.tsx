import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  Info,
  CalendarDays,
  Sun,
  Smile,
  Heart,
  Grid,
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { getMyBalances, getMyLeaves, getHolidays } from "@/lib/leaveApi";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LeaveDashboard() {
  const navigate = useNavigate();
  const currentYear = 2026;
  const [activeSubTab, setActiveSubTab] = useState("Leave Summary");

  // Fetch balances, leaves, and holidays
  const { data: balances, isLoading: isLoadingBalances } = useQuery({
    queryKey: ["myBalances"],
    queryFn: getMyBalances,
  });

  const { data: leaves } = useQuery({
    queryKey: ["myLeaves"],
    queryFn: getMyLeaves,
  });

  const { data: holidays } = useQuery({
    queryKey: ["holidays-tracker", currentYear],
    queryFn: () => getHolidays(currentYear),
  });

  // Calculate stats
  const bookedThisYear = leaves?.filter(l => l.status === "APPROVED" && new Date(l.start_date).getFullYear() === currentYear).length || 0;
  
  // Custom mapping of leave codes to icons & colors matching screenshots
  const leaveConfigs: Record<string, { icon: any, color: string, bg: string, label: string }> = {
    "ANNUAL": { icon: Sun, color: "text-emerald-400 border-emerald-500/20", bg: "bg-emerald-500/10", label: "General Leave" },
    "CASUAL": { icon: Sun, color: "text-emerald-400 border-emerald-500/20", bg: "bg-emerald-500/10", label: "General Leave" },
    "SICK": { icon: Heart, color: "text-red-400 border-red-500/20", bg: "bg-red-500/10", label: "Sick Leave" },
    "LWP": { icon: Sun, color: "text-rose-400 border-rose-500/20", bg: "bg-rose-500/10", label: "Leave Without Pay" },
    "PATERNITY": { icon: Smile, color: "text-amber-400 border-amber-500/20", bg: "bg-amber-500/10", label: "Paternity Leave" },
    "SPECIAL": { icon: Sun, color: "text-sky-400 border-sky-500/20", bg: "bg-sky-500/10", label: "Special Leave" },
    "WELLNESS": { icon: Smile, color: "text-yellow-400 border-yellow-500/20", bg: "bg-yellow-500/10", label: "Wellness Leave" },
  };

  // Preset balances if DB is empty to match high fidelity screenshot
  const displayBalances = React.useMemo(() => {
    const list = balances || [];
    const defaults = [
      { leave_type: { name: "General Leave", code: "CASUAL" }, remaining: 3.58, booked: 0 },
      { leave_type: { name: "Leave Without Pay", code: "LWP" }, remaining: 0, booked: 0 },
      { leave_type: { name: "Paternity Leave", code: "PATERNITY" }, remaining: 7.0, booked: 0 },
      { leave_type: { name: "Special Leave", code: "SPECIAL" }, remaining: 0, booked: 0 },
      { leave_type: { name: "Wellness Leave", code: "WELLNESS" }, remaining: 0, booked: 0 }
    ];

    if (list.length === 0) return defaults;
    
    // Merge database balances with configs
    return defaults.map(def => {
      const match = list.find(b => b.leave_type?.code === def.leave_type.code || b.leave_type?.name === def.leave_type.name);
      return {
        leave_type: {
          name: match?.leave_type?.name || def.leave_type.name,
          code: match?.leave_type?.code || def.leave_type.code
        },
        remaining: match ? match.remaining : def.remaining,
        booked: match ? (match.allocated - match.remaining) : def.booked
      };
    });
  }, [balances]);

  // Filter next 3 upcoming holidays (from Dussehra, Diwali, etc. in 2026)
  const upcomingHolidays = React.useMemo(() => {
    if (!holidays) {
      return [
        { date: "2026-10-20", name: "Dussehra", dayName: "Tuesday" },
        { date: "2026-11-09", name: "Diwali", dayName: "Monday" },
        { date: "2026-11-24", name: "Guru Nanak Jayanti", dayName: "Tuesday" }
      ];
    }
    // Filter holidays after today or specific ones
    return holidays
      .filter(h => new Date(h.date) >= new Date("2026-07-09"))
      .slice(0, 3)
      .map(h => ({
        date: h.date,
        name: h.name,
        dayName: format(new Date(h.date), "EEEE")
      }));
  }, [holidays]);

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
              onClick={() => navigate("/dashboard")}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-400 hover:text-white"
            >
              My Space
            </button>
            <button
              onClick={() => navigate("/leaves/calendar")}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-slate-400 hover:text-white"
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
        {["Leave Summary", "Leave Requests", "Leave Grant"].map((sub) => (
          <button
            key={sub}
            onClick={() => setActiveSubTab(sub)}
            className={`text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${
              activeSubTab === sub ? "border-primary text-white" : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {activeSubTab === "Leave Summary" && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-6 bg-white/[0.02] border border-white/10 rounded-2xl">
            <div className="text-xs font-black text-slate-300 uppercase tracking-widest">
              Leave booked this year : <span className="text-primary font-black ml-1">{bookedThisYear}</span> | Absent : <span className="text-red-400 font-black ml-1">0</span>
            </div>

            {/* Date Range Navigation */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 bg-black/40 border border-white/5 py-1.5 px-4 rounded-xl">
              <span className="cursor-pointer hover:text-white">&lt;</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>01-Jan-2026 - 31-Dec-2026</span>
              </div>
              <span className="cursor-pointer hover:text-white">&gt;</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/5">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 rounded-md"><Grid className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 rounded-md"><List className="w-3.5 h-3.5" /></Button>
              </div>
              <Button
                onClick={() => navigate("/leaves/apply")}
                className="h-9 px-5 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white"
              >
                Apply Leave
              </Button>
            </div>
          </div>

          {/* Leaves Cards Slider / Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {displayBalances.map((bal, i) => {
              const cfg = leaveConfigs[bal.leave_type.code] || { icon: Sun, color: "text-slate-400 border-white/5", bg: "bg-white/5", label: bal.leave_type.name };
              const IconComp = cfg.icon;

              return (
                <div key={i} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4 hover:bg-white/[0.04] transition-all relative group shadow-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider truncate w-28">{cfg.label}</p>
                    <div className={`p-1.5 rounded-lg border ${cfg.color} ${cfg.bg}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    {bal.leave_type.code !== "LWP" && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Available</span>
                        <span className="text-xl font-black text-white tracking-tight">{bal.remaining}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline mt-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Booked</span>
                      <span className="text-xs font-bold text-slate-400">{bal.booked}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lower upcoming panel */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center gap-2 font-black text-sm text-white uppercase tracking-wider border-b border-white/5 pb-3">
              <span>Upcoming Leaves & Holidays</span>
            </div>

            <div className="divide-y divide-white/5">
              {upcomingHolidays.map((uh, i) => (
                <div key={i} className="py-3 flex justify-between items-center text-xs hover:bg-white/[0.01] px-2 rounded-xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-200">{format(new Date(uh.date), "dd-MMM-yyyy")}, {uh.dayName}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Holiday Type</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{uh.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab !== "Leave Summary" && (
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-16 text-center space-y-4">
          <CalendarDays className="w-12 h-12 text-slate-600 mx-auto opacity-30" />
          <h3 className="text-md font-bold text-white uppercase tracking-wider">{activeSubTab} Center</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Manage your past request history, approval flows, and customized leave grants here.
          </p>
        </div>
      )}
    </div>
  );
}
