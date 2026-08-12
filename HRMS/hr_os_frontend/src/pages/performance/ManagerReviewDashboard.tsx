import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCycles, approveGoals, startReview, getAIConfig } from "@/lib/performanceApi";
import api from "@/lib/api"; // For generic team fetches
import { PageHeader } from "@/components/PageHeader";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  PlayCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const ManagerReviewDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // AI Config Fetch
  const { data: aiConfig } = useQuery({
    queryKey: ["ai-config-manager"],
    queryFn: getAIConfig,
  });

  // 1. Fetch Data
  const { data: cycles } = useQuery({
    queryKey: ["performanceCycles"],
    queryFn: getCycles,
  });

  const activeCycle = cycles?.find((c: any) => c.status === "ACTIVE");

  // Fetch Team Goals (Pending Approval)
  const { data: teamGoals } = useQuery({
    queryKey: ["teamGoals", activeCycle?.id],
    queryFn: async () => {
      const resp = await api.get(`/performance/team/goals?cycle_id=${activeCycle?.id}`);
      return resp;
    },
    enabled: !!activeCycle,
  });

  // Fetch Team Reviews
  const { data: teamReviews } = useQuery({
    queryKey: ["teamReviews", activeCycle?.id],
    queryFn: async () => {
      return await api.get(`/performance/team/reviews?cycle_id=${activeCycle?.id}`);
    },
    enabled: !!activeCycle,
  });

  // 2. Mutations
  const approveMutation = useMutation({
    mutationFn: (goalId: string) => approveGoals(goalId),
    onSuccess: () => {
      toast({ title: "Goals Approved" });
      queryClient.invalidateQueries({ queryKey: ["teamGoals"] });
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: (employeeId: string) => startReview(employeeId, activeCycle!.id),
    onSuccess: (data) => {
      toast({ title: "Review Started" });
      navigate(`/performance/reviews/${data.id}`);
    },
  });

  const handleApprove = (goalId: string) => {
    approveMutation.mutate(goalId);
  };

  const handleStartReview = (employeeId: string) => {
    startReviewMutation.mutate(employeeId);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        icon={Users}
        title="Team Performance Management"
        subtitle="Approve goals and conduct performance reviews for your direct reports."
      />

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="bg-white/5 border-white/10 p-1 mb-8">
          <TabsTrigger value="goals" className="px-8 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            Goal Approvals
            {teamGoals?.length > 0 && <Badge className="ml-2 bg-orange-500">{teamGoals.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="px-8 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
            Active Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-4">
          {teamGoals?.length === 0 ? (
            <Card className="p-12 text-center bg-white/[0.02] border-dashed border-white/10">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
              <p className="text-muted-foreground">All team goals are approved or none submitted yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamGoals?.map((goal: any) => (
                <Card key={goal.id} className="p-6 bg-white/[0.03] backdrop-blur-xl border-white/10 hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary">
                        {goal.employee?.first_name[0]}{goal.employee?.last_name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{goal.employee?.first_name} {goal.employee?.last_name}</h4>
                        <p className="text-xs text-muted-foreground">{goal.employee?.designation}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-orange-500/50 text-orange-400">PENDING APPROVAL</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs">
                       <span className="text-muted-foreground">Goal Count</span>
                       <span className="font-bold">{goal.items?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-muted-foreground">Total Weightage</span>
                       <span className="font-bold text-emerald-400">{goal.total_weightage}%</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                        onClick={() => handleApprove(goal.id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Goals
                    </Button>
                    <Button variant="outline" className="flex-1 bg-white/5 border-white/10">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {teamReviews?.map((review: any) => (
                <Card key={review.id} className="overflow-hidden bg-white/[0.03] backdrop-blur-xl border-white/10 group cursor-pointer hover:border-primary/50 transition-all"
                      onClick={() => navigate(`/performance/reviews/${review.id}`)}>
                   <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{review.current_step} PHASE</span>
                         </div>
                         <Badge>{review.status}</Badge>
                      </div>

                      <h4 className="text-lg font-bold mb-1">{review.employee?.first_name} {review.employee?.last_name}</h4>
                      <p className="text-xs text-muted-foreground mb-6">{review.employee?.designation}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           {aiConfig?.enabled && aiConfig?.features?.summary && (
                             <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 shadow-sm">
                               <Sparkles className="w-3 h-3" />
                               AI Summary Available
                             </Badge>
                           )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between group-hover:text-primary transition-colors">
                         <span className="text-sm font-medium">Continue Review</span>
                         <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                   </div>
                   <div className="h-1 bg-white/5 w-full">
                      <div className="h-full bg-primary" style={{ width: review.current_step === 'EMPLOYEE' ? '33%' : (review.current_step === 'MANAGER' ? '66%' : '100%') }} />
                   </div>
                </Card>
              ))}

              {/* Employees ready for review but not started */}
              {teamGoals?.filter((g: any) => g.status === 'APPROVED').map((goal: any) => (
                <Card key={goal.id} className="p-6 bg-white/[0.03] backdrop-blur-xl border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-emerald-400/10 flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-emerald-400" />
                   </div>
                   <div>
                      <h4 className="font-bold">{goal.employee?.first_name} {goal.employee?.last_name}</h4>
                      <p className="text-xs text-muted-foreground">Goals Approved. Ready for Review.</p>
                   </div>
                   <Button onClick={() => handleStartReview(goal.employee_id)} variant="outline" className="rounded-full border-primary/30 hover:bg-primary/10">
                      Start Review Process
                   </Button>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerReviewDashboard;
