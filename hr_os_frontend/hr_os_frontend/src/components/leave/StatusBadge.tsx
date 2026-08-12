import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: LeaveStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles: Record<LeaveStatus, string> = {
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    CANCELLED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 text-[11px] font-semibold rounded-full border",
        styles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
