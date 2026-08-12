import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  User, 
  MapPin, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Zap
} from "lucide-react";
import { useAttendanceSocket } from "@/hooks/useAttendanceSocket";

export const LiveActivityFeed: React.FC = () => {
  const token = localStorage.getItem("token");
  const { events, isConnected } = useAttendanceSocket(token);

  return (
    <div className="w-full h-[600px] bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          Live Activity
        </h4>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          {isConnected ? 'Real-time' : 'Stale'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar custom-scrollbar pr-2 pt-1 pb-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {events.length > 0 ? (
            events.map((event, i) => (
              <motion.div 
                key={event.id || i}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group p-4 bg-black/20 border border-white/5 rounded-2xl hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* LATE INDICATOR */}
                {event.alerts?.late && (
                  <div className="absolute top-0 right-0 px-2 py-1 bg-red-500/20 text-red-500 text-[8px] font-bold uppercase tracking-widest rounded-bl-lg">
                    Late
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{event.employee_name}</h5>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        {event.event}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 pl-14">
                   <MapPin className="w-3 h-3 text-slate-600" />
                   <span className="text-[10px] text-slate-500 font-medium truncate">{event.location}</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                 <Activity className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Awaiting Signal</p>
                <p className="text-[10px] text-slate-600 mt-1">No check-ins detected yet</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center justify-center">
        <button className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1 group">
          View full monitoring center
          <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );
};
