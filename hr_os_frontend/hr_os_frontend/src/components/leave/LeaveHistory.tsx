import React, { memo } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import LeaveRequestCard from "./LeaveRequestCard";
import type { LeaveRequest } from "@/lib/types";

interface LeaveHistoryProps {
  leaves: LeaveRequest[];
  onLeaveClick?: (leave: LeaveRequest) => void;
}

const LeaveHistory = memo(({ leaves, onLeaveClick }: LeaveHistoryProps) => {
  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01] transition-colors hover:bg-white/[0.02]">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 shadow-xl border border-white/5">
          <Calendar className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-bold mb-2">No records found</h3>
        <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
          Your leave requests and history will be automatically archived here.
        </p>
      </div>
    );
  }

  // Use content-visibility: auto for native "virtualization" feel on long lists
  return (
    <div className="space-y-2 overflow-y-auto max-h-[800px] scrollbar-hide py-2" style={{ contentVisibility: 'auto' } as any}>
      {leaves.map((leave, index) => (
        <motion.div
          key={leave.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index < 10 ? index * 0.05 : 0, // Only stagger first 10 for performance
            duration: 0.3 
          }}
        >
          <LeaveRequestCard leave={leave} onClick={() => onLeaveClick?.(leave)} />
        </motion.div>
      ))}
    </div>
  );
});

export default LeaveHistory;
