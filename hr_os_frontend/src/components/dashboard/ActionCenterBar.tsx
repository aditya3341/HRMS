import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  AlertTriangle,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ApprovalRequestResponse, Notification } from "@/lib/types";

interface ActionCenterBarProps {
  approvals: ApprovalRequestResponse[];
  notifications: Notification[];
}

export const ActionCenterBar: React.FC<ActionCenterBarProps> = ({ 
  approvals, 
  notifications 
}) => {
  const navigate = useNavigate();

  // Logic for critical alerts (e.g., overdue onboarding, high-priority approvals, or recently failed biometric)
  const criticalCount = approvals.filter(a => a.priority === "HIGH").length;
  const pendingNotificationCount = notifications.filter(n => !n.read).length;

  if (approvals.length === 0 && pendingNotificationCount === 0) {
    return (
      <div className="w-full relative z-20 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 px-6 py-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl backdrop-blur-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest leading-none mb-1">System Health</p>
            <h4 className="text-sm font-bold text-slate-400 tracking-tight">All clear! You're completely up to date with your HR tasks.</h4>
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
            Perfect Sync
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full relative z-20 mb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4"
      >
        {/* CRITICAL / HIGH PRIORITY ITEM */}
        {criticalCount > 0 && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate("/approvals")}
            className="flex-1 min-w-[300px] bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer group hover:bg-red-500/15 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-red-500/70 font-bold uppercase tracking-widest">Critical Attention</p>
                <h4 className="text-sm font-bold text-red-400">
                  {criticalCount} high-priority approval{criticalCount > 1 ? 's' : ''} pending
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/50 group-hover:translate-x-1 transition-all" />
          </motion.div>
        )}

        {/* PENDING APPROVALS SUMMARY */}
        {approvals.length > 0 && criticalCount === 0 && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate("/approvals")}
            className="flex-1 min-w-[300px] bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer group hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-widest">Approvals</p>
                <h4 className="text-sm font-bold text-amber-400">
                  {approvals.length} request{approvals.length > 1 ? 's' : ''} awaiting your review
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500/50 group-hover:translate-x-1 transition-all" />
          </motion.div>
        )}

        {/* ALERTS / NOTIFICATIONS */}
        {pendingNotificationCount > 0 && (
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate("/action-center")}
            className="flex-1 min-w-[300px] bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer group hover:bg-primary/15 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-primary/70 font-bold uppercase tracking-widest">Alerts & Messages</p>
                <h4 className="text-sm font-bold text-slate-200">
                  {pendingNotificationCount} unread update{pendingNotificationCount > 1 ? 's' : ''} in stream
                </h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/50 group-hover:translate-x-1 transition-all" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
