import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Check, X, Calendar, User, MessageSquare, PieChart, Clock, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { approveLeave, getEmployeeBalances, getLeaves } from "@/lib/leaveApi";
import { trackEvent } from "@/lib/analytics";
import type { LeaveRequest, LeaveBalance } from "@/lib/types";
import LeaveActivityTimeline from "./LeaveActivityTimeline";

interface ManagerLeaveApprovalProps {
  leaves: LeaveRequest[];
}

function RequestorInsights({ employeeId }: { employeeId: string }) {
  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ["employeeBalances", employeeId],
    queryFn: () => getEmployeeBalances(employeeId),
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["employeeHistory", employeeId],
    queryFn: () => getLeaves(employeeId),
  });

  const recentLeaves = history?.filter(l => l.status === "APPROVED").slice(0, 3) || [];

  if (loadingBalances || loadingHistory) {
    return <div className="space-y-2 mt-4">
      <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
    </div>;
  }

  return (
    <div className="mt-4 space-y-4 pt-4 border-t border-white/5">
      {/* Balances */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <PieChart className="w-3 h-3" /> Requester Balances
        </p>
        <div className="flex flex-wrap gap-2">
          {balances?.map(b => (
            <div key={b.id} className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-medium">
              <span className="opacity-60 mr-1">{b.leave_type?.code}:</span>
              {b.remaining}
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Recent History
        </p>
        <div className="space-y-1.5">
          {recentLeaves.length > 0 ? (
            recentLeaves.map(l => (
              <div key={l.id} className="flex justify-between items-center text-[10px] p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span>{l.leave_type?.name}</span>
                <span className="opacity-60">{format(new Date(l.start_date), "MMM dd")} ({l.days}d)</span>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-muted-foreground italic">No recent approved leaves</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagerLeaveApproval({ leaves }: ManagerLeaveApprovalProps) {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED") => {
    setProcessingId(id);
    try {
      await approveLeave(id, action);
      trackEvent(action === "APPROVED" ? "leave_approved" : "leave_rejected", { leave_id: id });
      toast.success(`Leave ${action.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ["pendingLeaves"] });
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
        <Check className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-sm font-semibold mb-1">Queue is empty</h3>
        <p className="text-xs text-muted-foreground">
          No pending leave requests to review.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {leaves.map((leave, index) => (
        <motion.div
          key={leave.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="overflow-hidden border-white/10 bg-white/[0.02] backdrop-blur-md rounded-2xl flex flex-col h-full">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {leave.employee_id.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Employee ID: {leave.employee_id.split('-')[0]}</h4>
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Requested {format(
                        leave.applied_at ? new Date(leave.applied_at) : (leave.created_at ? new Date(leave.created_at) : new Date()), 
                        "MMM dd"
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {leave.leave_type?.name}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(leave.start_date), "MMM dd")} - {format(new Date(leave.end_date), "MMM dd")}
                    <span className="text-muted-foreground ml-1">({leave.days} {leave.days === 1 ? 'day' : 'days'})</span>
                  </span>
                </div>
                {leave.reason && (
                  <div className="flex items-start gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/5 italic text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    "{leave.reason}"
                  </div>
                )}
              </div>

              <div className="mt-6 mb-6">
                <LeaveActivityTimeline leave={leave} />
              </div>

              <RequestorInsights employeeId={leave.employee_id} />
            </div>

            <div className="grid grid-cols-2 border-t border-white/5">
              <Button
                variant="ghost"
                className="rounded-none h-12 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 border-r border-white/5"
                onClick={() => handleAction(leave.id, "REJECTED")}
                disabled={!!processingId}
              >
                {processingId === leave.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                Reject
              </Button>
              <Button
                variant="ghost"
                className="rounded-none h-12 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                onClick={() => handleAction(leave.id, "APPROVED")}
                disabled={!!processingId}
              >
                {processingId === leave.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
