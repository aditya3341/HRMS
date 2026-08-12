import React from "react";
import { format } from "date-fns";
import { CheckCircle2, CircleDashed, FileText, UserCheck, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/lib/types";

interface LeaveActivityTimelineProps {
  leave: LeaveRequest;
}

export default function LeaveActivityTimeline({ leave }: LeaveActivityTimelineProps) {
  const steps = [
    {
      title: "Leave Applied",
      description: `Request submitted for ${leave.days} days of ${leave.leave_type?.name}`,
      time: leave.applied_at || leave.created_at,
      icon: FileText,
      status: "completed",
    },
    {
      title: "Manager Review",
      description: leave.status === "PENDING" ? "Waiting for manager approval" : `Reviewed by ${leave.approved_by || "Manager"}`,
      time: leave.reviewed_at,
      icon: UserCheck,
      status: leave.status === "PENDING" ? "current" : "completed",
    },
    {
      title: leave.status === "REJECTED" ? "Request Rejected" : "Request Approved",
      description: leave.manager_note || (leave.status === "APPROVED" ? "Leave has been credited to your schedule" : "Review finalized"),
      time: leave.reviewed_at,
      icon: leave.status === "REJECTED" ? XCircle : CheckCircle2,
      status: leave.status === "PENDING" ? "upcoming" : "completed",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Activity Timeline</h4>
      </div>
      
      <div className="relative space-y-8 left-1.5 border-l border-white/5 pl-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;
          const isActive = step.status === "current";
          const isCompleted = step.status === "completed";

          return (
            <div key={idx} className="relative">
              <div className={cn(
                "absolute -left-[31px] top-0 w-3 h-3 rounded-full border-2 bg-background z-10 transition-all duration-500",
                isCompleted ? "border-emerald-500 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : 
                isActive ? "border-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "border-white/10"
              )} />
              
              <div className="space-y-1.5 -top-1 relative">
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-[11px] font-bold tracking-tight",
                    isCompleted ? "text-emerald-500" : isActive ? "text-primary text-sm font-black" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.time && (
                    <span className="text-[9px] font-black opacity-30 uppercase">
                      {format(new Date(step.time), "MMM d, HH:mm")}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
