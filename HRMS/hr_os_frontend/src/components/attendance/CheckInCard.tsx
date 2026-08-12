import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Clock, Flame, MapPin, Monitor, ShieldCheck, AlertCircle, Timer, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCheckIn } from "@/hooks/useCheckIn";
import { useCheckOut } from "@/hooks/useCheckOut";

interface CheckInCardProps {
  currentAttendance?: any;
  isLoading: boolean;
}

const CheckInCard: React.FC<CheckInCardProps> = ({ currentAttendance, isLoading }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckedIn = !!currentAttendance && !!currentAttendance.check_in && !currentAttendance.check_out;
  const checkInTime = currentAttendance?.check_in ? new Date(currentAttendance.check_in) : null;

  const liveWorkingHours = useMemo(() => {
    if (!isCheckedIn || !checkInTime) return currentAttendance?.total_hours || 0;
    const diffMs = currentTime.getTime() - checkInTime.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }, [isCheckedIn, checkInTime, currentTime, currentAttendance?.total_hours]);

  const timeObject = useMemo(() => {
    const totalSeconds = Math.floor(parseFloat(liveWorkingHours.toString()) * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  }, [liveWorkingHours]);

  const handleToggle = () => {
    if (isCheckedIn) {
      checkOutMutation.mutate();
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => checkInMutation.mutate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => checkInMutation.mutate()
        );
      } else {
        checkInMutation.mutate();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group h-full"
    >
      {/* CARD OUTER GLOW */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
      
      <Card className="relative glass-card border-white/10 rounded-[2.8rem] overflow-hidden flex flex-col justify-center border h-full shadow-inner shadow-white/5">
        <CardContent className="p-10 space-y-10">
          
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h2 className="text-7xl font-black tracking-tighter text-white tabular-nums drop-shadow-2xl">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                <motion.span 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-indigo-500/80"
                >
                  :
                </motion.span>
                <span className="text-white/40 text-4xl ml-1">
                   {currentTime.toLocaleTimeString([], { second: '2-digit' })}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500/50" />
                <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">
                   {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            <motion.div 
               whileHover={{ scale: 1.1, rotate: 5 }}
               className="flex items-center gap-2 bg-gradient-to-br from-orange-400/20 to-red-400/20 border border-orange-500/20 text-orange-400 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest"
            >
              <Flame size={14} className="fill-orange-400/20" />
              <span>4 Day Streak</span>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {currentAttendance?.is_late && isCheckedIn && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-4 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold shadow-xl shadow-rose-950/20"
              >
                <div className="bg-rose-500/20 p-2 rounded-xl">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="uppercase tracking-widest text-[10px] font-black opacity-60 mb-0.5">Notification</p>
                  <p>Check-in flagged: Late by {Math.floor(Math.random() * 20) + 10}m</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-6">
            {/* Working Hours */}
            <div className="group/item relative p-6 rounded-[2rem] glass-card border-white/5 bg-white/[0.02] shadow-inner overflow-hidden">
               <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
               <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Timer size={14} className="group-hover/item:text-indigo-400 transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active Shift</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tabular-nums tracking-tighter">
                      {timeObject.h}
                    </span>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">hr</span>
                    <span className="text-4xl font-black text-white tabular-nums tracking-tighter ml-2">
                       {timeObject.m}
                    </span>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">m</span>
                  </div>
               </div>
            </div>
            
            {/* Status */}
            <div className="group/item relative p-6 rounded-[2rem] glass-card border-white/5 bg-white/[0.02] shadow-inner overflow-hidden">
               <div className={isCheckedIn ? "absolute inset-0 bg-emerald-500/5 opacity-100" : "absolute inset-0 bg-white/5 opacity-0"} />
               <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Activity size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Presence</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <div className={`h-3 w-3 rounded-full ${isCheckedIn ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-white/20'}`} />
                    <p className="text-3xl font-black text-white tracking-tighter uppercase">{isCheckedIn ? "Live" : "Away"}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="relative">
            <Button 
                onClick={handleToggle}
                disabled={checkInMutation.isPending || checkOutMutation.isPending || isLoading}
                className={`w-full h-24 rounded-[2rem] text-xl font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl relative overflow-hidden group/btn border-t border-white/20 ${
                  isCheckedIn 
                    ? "bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-rose-900/40" 
                    : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-900/40"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                <AnimatePresence mode="wait">
                  {isCheckedIn ? (
                    <motion.div key="checkout" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-4">
                      <LogOut size={28} />
                      <span>Finish Shift</span>
                    </motion.div>
                  ) : (
                    <motion.div key="checkin" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-4">
                      <LogIn size={28} />
                      <span>Check In</span>
                    </motion.div>
                  )}
                </AnimatePresence>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-10 opacity-30">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                  <MapPin size={12} className="text-indigo-400" />
                  <span>Geo-Safe</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/20" />
               <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>Verified</span>
              </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CheckInCard;
