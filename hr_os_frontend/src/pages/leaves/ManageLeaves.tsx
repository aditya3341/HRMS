import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Search, 
  Filter, 
  Users,
  Clock,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { getTeamLeaves, approveLeave } from "@/lib/leaveApi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
 
export default function ManageLeaves() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);
 
  const { data: leaves, isLoading } = useQuery({
    queryKey: ["manageLeaves", statusFilter],
    queryFn: () => getTeamLeaves(), // Backend handles manager/HR filtering based on role
  });

  const mutation = useMutation({
    mutationFn: ({ id, action, remarks }: { id: string, action: "APPROVED" | "REJECTED", remarks?: string }) => 
      approveLeave(id, action, remarks),
    onSuccess: (data) => {
      toast.success(`Leave request ${actionType?.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ["manageLeaves"] });
      setSelectedLeave(null);
      setRemarks("");
      setActionType(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Action failed");
    }
  });

  const handleAction = (leave: any, type: "APPROVED" | "REJECTED") => {
    setSelectedLeave(leave);
    setActionType(type);
  };

  const confirmAction = () => {
    if (!selectedLeave || !actionType) return;
    mutation.mutate({ 
      id: selectedLeave.id, 
      action: actionType, 
      remarks 
    });
  };

  const filteredLeaves = leaves?.filter(l => 
    l.employee?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === "ALL" || l.status === statusFilter)
  ) || [];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-left-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter">Review Requests</h1>
          <p className="text-muted-foreground font-medium">Approve or reject leave applications from your team.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group w-64">
              <Input 
                placeholder="Search employee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10 pl-10 focus:ring-primary transition-all group-hover:bg-white/[0.08]"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 opacity-30" />
           </div>
           
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="outline" className="h-11 rounded-xl border-white/10 bg-white/5 font-bold text-[10px] uppercase tracking-widest px-4">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {statusFilter}
                 </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl border-white/10 bg-slate-900/95 backdrop-blur-xl">
                 {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(s => (
                   <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 cursor-pointer focus:bg-primary/20">
                      {s}
                   </DropdownMenuItem>
                 ))}
              </DropdownMenuContent>
           </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Card key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />)
        ) : filteredLeaves.length === 0 ? (
          <div className="p-20 text-center space-y-4 rounded-[3rem] border border-dashed border-white/10 bg-white/[0.02]">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="w-8 h-8" />
             </div>
             <div>
                <p className="text-lg font-bold">No requests found</p>
                <p className="text-sm text-muted-foreground">Review your filters or search terms.</p>
             </div>
          </div>
        ) : (
          <AnimatePresence>
            {filteredLeaves.map((leave) => (
              <motion.div
                layout
                key={leave.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative overflow-hidden"
              >
                <Card className="p-6 rounded-[2rem] border-white/10 bg-white/[0.02] backdrop-blur-3xl hover:bg-white/[0.05] transition-all duration-500 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-6 flex-1">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-xl font-black shadow-inner">
                         {leave.employee?.full_name.charAt(0)}
                      </div>
                      
                      <div className="space-y-1">
                         <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold tracking-tight">{leave.employee?.full_name}</h3>
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-white/5 border-white/10 opacity-60">
                               {leave.leave_type?.name || 'Leave'}
                            </Badge>
                         </div>
                         <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                               <CalendarIcon className="w-3.5 h-3.5" />
                               {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                               <Clock className="w-3.5 h-3.5" />
                               {leave.days} Days
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="flex-1 max-w-md italic text-sm text-muted-foreground line-clamp-2 px-10 border-x border-white/5 hidden lg:block">
                      &ldquo;{leave.reason}&rdquo;
                   </div>

                   <div className="flex items-center gap-3">
                      {leave.status === "PENDING" ? (
                        <>
                           <Button 
                            variant="outline" 
                            onClick={() => handleAction(leave, "REJECTED")}
                            className="rounded-2xl h-12 px-6 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 transition-all font-bold uppercase tracking-widest text-[10px]"
                           >
                              <X className="w-4 h-4 mr-2" /> Reject
                           </Button>
                           <Button 
                            onClick={() => handleAction(leave, "APPROVED")}
                            className="rounded-2xl h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white transition-all font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20"
                           >
                              <Check className="w-4 h-4 mr-2" /> Approve
                           </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 px-6 h-12 rounded-2xl bg-white/5 border border-white/10">
                           <span className={`text-[10px] font-black uppercase tracking-widest ${
                              leave.status === 'APPROVED' ? 'text-emerald-500' : 
                              leave.status === 'REJECTED' ? 'text-rose-500' : 'text-amber-500'
                           }`}>
                              {leave.status}
                           </span>
                           {leave.status === 'APPROVED' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                        </div>
                      )}
                   </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
         <DialogContent className="max-w-md rounded-[2.5rem] border-white/10 bg-slate-900/90 backdrop-blur-3xl p-8 shadow-2xl">
            <DialogHeader className="space-y-4">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                  actionType === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
               }`}>
                  {actionType === 'APPROVED' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
               </div>
               <DialogTitle className="text-2xl font-black tracking-tighter text-center">
                  Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
               </DialogTitle>
               <DialogDescription className="text-center text-muted-foreground font-medium">
                  You are about to {actionType?.toLowerCase()} the {selectedLeave?.leave_type?.name} request for <strong>{selectedLeave?.employee?.full_name}</strong>.
               </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Manager Remarks (Optional)</label>
                  <Textarea 
                    placeholder="Add a note for the employee..." 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="rounded-2xl bg-white/5 border-white/10 focus:ring-primary h-24 resize-none"
                  />
               </div>
               
               {actionType === 'APPROVED' && (
                 <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-emerald-500">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-bold leading-relaxed">Approval will immediately deduct {selectedLeave?.days} days from their balance.</p>
                 </div>
               )}
            </div>

            <DialogFooter className="gap-3 sm:justify-center">
               <Button variant="ghost" onClick={() => setSelectedLeave(null)} className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px]">
                  Cancel
               </Button>
               <Button 
                onClick={confirmAction}
                disabled={mutation.isPending}
                className={`rounded-xl h-12 px-8 font-bold uppercase tracking-widest text-[10px] shadow-xl ${
                  actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                }`}
               >
                  {mutation.isPending ? "Processing..." : `Confirm ${actionType === 'APPROVED' ? 'Approve' : 'Reject'}`}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
