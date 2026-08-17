import { useQuery } from "@tanstack/react-query";
import { Inbox, LayoutGrid } from "lucide-react";
import { getMyLeaves } from "@/lib/leaveApi";
import ManagerLeaveApproval from "@/components/leave/ManagerLeaveApproval";
import { PageHeader } from "@/components/PageHeader";

export default function LeaveApprovals() {
  const { data: leaves, isLoading } = useQuery({
    queryKey: ["pendingLeaves"],
    queryFn: getMyLeaves,
    // Note: In a real scenario, this would be an API specifically for pending team leaves
    // For this implementation, we filter the shared leaves list
  });

  const pendingLeaves = leaves?.filter(l => l.status === "PENDING") || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        icon={Inbox}
        title="Leave Approvals"
        subtitle="Review and process pending leave requests from your team."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (
        <ManagerLeaveApproval leaves={pendingLeaves} />
      )}
    </div>
  );
}
