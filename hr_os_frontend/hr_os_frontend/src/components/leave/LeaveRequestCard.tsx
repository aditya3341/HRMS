import { motion } from "framer-motion";
import { format } from "date-fns";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/lib/types";

interface LeaveRequestCardProps {
  leave: LeaveRequest;
  onClick?: () => void;
  className?: string;
}

export default function LeaveRequestCard({ leave, onClick, className }: LeaveRequestCardProps) {
  const startDate = new Date(leave.start_date);
  const endDate = new Date(leave.end_date);
  const isOneDay = leave.start_date === leave.end_date;

  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.03)" }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.01] cursor-pointer transition-all",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {format(startDate, "MMM")}
          </span>
          <span className="text-lg font-bold">
            {format(startDate, "dd")}
          </span>
        </div>

        <div>
           <div className="flex items-center gap-2 mb-1">
             <h4 className="text-sm font-semibold">
               {leave.leave_type?.name}
             </h4>
             <StatusBadge status={leave.status} />
           </div>
           
           <div className="flex items-center gap-3 text-xs text-muted-foreground">
             <span className="flex items-center gap-1.5">
               <Calendar className="w-3 h-3 text-primary/70" />
               {isOneDay 
                 ? format(startDate, "EEE, MMM dd")
                 : `${format(startDate, "MMM dd")} - ${format(endDate, "MMM dd")}`
               }
             </span>
             <span className="flex items-center gap-1.5">
               <Clock className="w-3 h-3 text-primary/70" />
               {leave.days} {leave.days === 1 ? "day" : "days"} 
               {leave.day_type !== "FULL_DAY" && (
                 <span className="text-primary/70 font-medium">
                   ({leave.day_type.replace(/_/g, " ")})
                 </span>
               )}
             </span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
            Applied on
          </p>
          <p className="text-xs font-medium">
            {format(
              leave.applied_at ? new Date(leave.applied_at) : (leave.created_at ? new Date(leave.created_at) : new Date()), 
              "MMM dd, yyyy"
            )}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}
