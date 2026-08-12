import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { 
  ClipboardCheck, 
  User, 
  ShieldCheck, 
  Save, 
  Send, 
  BarChart,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { 
  getReview, 
  submitSelfReview, 
  submitManagerReview, 
  getAIConfig 
} from "@/lib/performanceApi";

const PerformanceReview = () => {
  const { reviewId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<any[]>([]);

  // AI Config Fetch
  const { data: aiConfig } = useQuery({
    queryKey: ["ai-config-review"],
    queryFn: getAIConfig,
    staleTime: 60000 // Cache for 1 min
  });

  // 1. Fetch Data
  const { data: review, isLoading } = useQuery({
    queryKey: ["review", reviewId],
    queryFn: () => getReview(reviewId!),
    enabled: !!reviewId,
  });

  useEffect(() => {
    if (review && review.responses) {
      // Map goal items to current responses or initialize
      const initial = review.goal?.items?.map((goal: any) => {
        const existing = review.responses.find((r: any) => r.goal_item_id === goal.id);
        return {
          goal_item_id: goal.id,
          title: goal.title,
          weightage: goal.weightage,
          self_rating: existing?.self_rating || 0,
          self_comment: existing?.self_comment || "",
          manager_rating: existing?.manager_rating || 0,
          manager_comment: existing?.manager_comment || ""
        };
      });
      setResponses(initial || []);
    }
  }, [review]);

  // 2. Mutations
  const selfMutation = useMutation({
    mutationFn: (data: any[]) => submitSelfReview(reviewId!, data),
    onSuccess: () => {
      toast({ title: "Self Review Submitted" });
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  const managerMutation = useMutation({
    mutationFn: (data: any[]) => submitManagerReview(reviewId!, data),
    onSuccess: () => {
      toast({ title: "Manager Evaluation Submitted" });
      queryClient.invalidateQueries({ queryKey: ["review"] });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
        const resp = await api.post(`/performance/review/${reviewId}/calculate`);
        return resp;
    },
    onSuccess: () => {
        toast({ title: "Rating Calculated" });
        queryClient.invalidateQueries({ queryKey: ["review"] });
    }
  });

  // 3. Logic Helpers
  const updateResponse = (goalItemId: string, field: string, value: any) => {
    setResponses(prev => prev.map(r => r.goal_item_id === goalItemId ? { ...r, [field]: value } : r));
  };

  const currentStep = review?.current_step;
  const isEmployeeStep = currentStep === "EMPLOYEE";
  const isManagerStep = currentStep === "MANAGER";
  const isSelf = user?.user_id === review?.employee_id;
  const canSelfReview = isEmployeeStep && isSelf;
  const canManagerReview = isManagerStep && !isSelf;

  const handleSave = () => {
    if (canSelfReview) {
      selfMutation.mutate(responses.map(r => ({ goal_item_id: r.goal_item_id, self_rating: r.self_rating, self_comment: r.self_comment })));
    } else if (canManagerReview) {
      managerMutation.mutate(responses.map(r => ({ goal_item_id: r.goal_item_id, manager_rating: r.manager_rating, manager_comment: r.manager_comment })));
    }
  };

  if (isLoading) return <div>Loading review details...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <PageHeader
          icon={ClipboardCheck}
          title="Performance Evaluation"
          subtitle={`Current Phase: ${currentStep} Review`}
        />
        
        <div className="flex items-center gap-4">
           {review?.summary && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-4">
                 <div className="text-right border-r border-primary/20 pr-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Final Score</p>
                    <p className="text-2xl font-black text-primary">{review.summary.calculated_score?.toFixed(1)}</p>
                 </div>
                 <div>
                    <Badge className="bg-primary text-white mb-1">{review.summary.performance_band}</Badge>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Recommended Action</p>
                 </div>
              </div>
           )}
           <Badge variant="outline" className="px-4 py-1.5 border-white/10 text-emerald-400 bg-white/5">{review?.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
           <Card className="p-6 bg-white/[0.03] backdrop-blur-xl border-white/10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {review?.employee?.first_name[0]}{review?.employee?.last_name[0]}
                 </div>
                 <div>
                    <h4 className="font-bold text-sm">{review?.employee?.first_name} {review?.employee?.last_name}</h4>
                    <p className="text-[10px] text-muted-foreground">{review?.employee?.employee_id}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Department</Label>
                    <p className="text-xs font-medium">{review?.employee?.department || 'Operations'}</p>
                 </div>
                 <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Review Cycle</Label>
                    <p className="text-xs font-medium">{review?.cycle?.name}</p>
                 </div>
              </div>
           </Card>

           <Card className="p-6 bg-white/[0.03] border-white/10 space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                 <Info className="w-3 h-3 text-primary" />
                 Review workflow
              </h5>
              <div className="space-y-4 relative">
                 <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-white/5" />
                 {[
                    { step: 'EMPLOYEE', label: 'Self Review', icon: User },
                    { step: 'MANAGER', label: 'Manager Review', icon: ShieldCheck },
                    { step: 'HR', label: 'Final Closure', icon: CheckCircle2 }
                 ].map((s, i) => (
                    <div key={s.step} className="flex items-center gap-3 relative z-10">
                       <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                          currentStep === s.step ? 'bg-primary border-primary' : (i < 1 ? 'bg-emerald-500 border-emerald-500' : 'bg-zinc-800 border-zinc-700')
                       }`}>
                          {i < 1 && <CheckCircle2 className="w-3 h-3 text-white" />}
                       </div>
                       <span className={`text-xs font-medium ${currentStep === s.step ? 'text-white' : 'text-muted-foreground'}`}>{s.label}</span>
                    </div>
                 ))}
              </div>
           </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
           {/* AI Insight Panel (Reactive) */}
           <AnimatePresence>
              {aiConfig?.enabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent border-primary/20 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="w-24 h-24 text-primary" />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                       <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-primary" />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold flex items-center gap-2">
                             AI Insight Engine
                             <Badge className="bg-primary/20 text-primary border-none text-[9px] uppercase tracking-tighter">Live</Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground">Synthesized intelligence based on historical performance and current metrics.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                       {aiConfig.features?.summary && (
                         <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <h5 className="text-[10px] uppercase font-bold text-primary tracking-widest">Performance Synthesis</h5>
                            <p className="text-xs text-white/80 leading-relaxed italic">
                               "[AI]: This employee has shown consistent growth across technical KRAs. Their self-review alignment with manager feedback is high (92%). Recommended focus area: Strategic Leadership."
                            </p>
                         </div>
                       )}
                       {aiConfig.features?.rating_suggestion && (
                         <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <h5 className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">Inferred Target Rating</h5>
                            <div className="flex items-center gap-3">
                               <span className="text-2xl font-black text-white">4.2</span>
                               <Badge className="bg-purple-500/20 text-purple-400 border-none">B (Exceeds)</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Confidence Score: {aiConfig.confidence_threshold * 100}%</p>
                         </div>
                       )}
                    </div>
                  </Card>
                </motion.div>
              )}
           </AnimatePresence>

           {responses.map((resp, index) => (
              <motion.div 
                key={resp.goal_item_id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden bg-white/[0.03] backdrop-blur-xl border-white/10">
                   <div className="bg-white/5 px-6 py-3 flex justify-between items-center border-b border-white/5">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">Goal Item #{index+1}</span>
                      <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">{resp.weightage}% Weight</Badge>
                   </div>
                   
                   <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Side: Goal & Self Review */}
                      <div className="space-y-6">
                         <div>
                            <h4 className="text-lg font-bold mb-2">{resp.title}</h4>
                            <p className="text-sm text-muted-foreground mb-4">Weightage of this goal determines its impact on the final score.</p>
                         </div>

                         <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                            <h5 className="text-[10px] uppercase font-black text-primary tracking-widest">Self Evaluation</h5>
                            <div className="space-y-3">
                               <div className="space-y-2">
                                  <Label className="text-xs">Rating (1-5)</Label>
                                  <Select 
                                    disabled={!canSelfReview}
                                    value={resp.self_rating?.toString()}
                                    onValueChange={(val) => updateResponse(resp.goal_item_id, 'self_rating', parseInt(val))}
                                  >
                                     <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue placeholder="Rate yourself" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-zinc-900 border-white/10">
                                        {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={v.toString()}>{v} - {['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][v-1]}</SelectItem>)}
                                     </SelectContent>
                                  </Select>
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs">Comments / Achievements</Label>
                                  <Textarea 
                                    disabled={!canSelfReview}
                                    placeholder="Describe your progress..."
                                    value={resp.self_comment}
                                    onChange={(e) => updateResponse(resp.goal_item_id, 'self_comment', e.target.value)}
                                    className="bg-black/20 border-white/10 min-h-[100px]"
                                  />
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Right Side: Manager Evaluation */}
                      <div className="space-y-6">
                         <div className={`space-y-4 p-4 rounded-xl bg-amber-400/5 border ${canManagerReview ? 'border-amber-400/20' : 'border-white/5 opacity-50'}`}>
                            <h5 className="text-[10px] uppercase font-black text-amber-400 tracking-widest">Manager Evaluation</h5>
                            <div className="space-y-3">
                               <div className="space-y-2">
                                  <Label className="text-xs">Rating (1-5)</Label>
                                  <Select 
                                    disabled={!canManagerReview}
                                    value={resp.manager_rating?.toString()}
                                    onValueChange={(val) => updateResponse(resp.goal_item_id, 'manager_rating', parseInt(val))}
                                  >
                                     <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue placeholder="Rate performance" />
                                     </SelectTrigger>
                                     <SelectContent className="bg-zinc-900 border-white/10">
                                        {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={v.toString()}>{v} - {['Below Expectation', 'Minor Gaps', 'Meets Expectation', 'Exceeds Expectation', 'Outstanding'][v-1]}</SelectItem>)}
                                     </SelectContent>
                                  </Select>
                               </div>
                               <div className="space-y-2">
                                  <Label className="text-xs">Observations / Feedback</Label>
                                  <Textarea 
                                    disabled={!canManagerReview}
                                    placeholder="Provide constructive feedback..."
                                    value={resp.manager_comment}
                                    onChange={(e) => updateResponse(resp.goal_item_id, 'manager_comment', e.target.value)}
                                    className="bg-black/20 border-white/10 min-h-[100px]"
                                  />
                               </div>
                            </div>
                         </div>

                         {/* Snapshot of self review if in manager step */}
                         {isManagerStep && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                               <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Peer's View</span>
                                  <Badge className="bg-primary/20 text-primary border-none text-[9px]">{resp.self_rating || 'N/A'}</Badge>
                               </div>
                               <p className="text-xs italic text-muted-foreground line-clamp-2">"{resp.self_comment || 'No comments provided'}"</p>
                            </div>
                         )}
                      </div>
                   </div>
                </Card>
              </motion.div>
           ))}

           {/* Execution Bar */}
           <Card className="p-6 bg-white/[0.03] backdrop-blur-xl border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <AlertTriangle className="w-5 h-5 text-amber-400" />
                 <p>All ratings will be used for final weighted calculation. Ensure accuracy.</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                 {(canSelfReview || canManagerReview) && (
                    <Button onClick={handleSave} 
                            disabled={selfMutation.isPending || managerMutation.isPending}
                            className="bg-primary hover:bg-primary/90 text-white min-w-[200px] shadow-lg shadow-primary/20">
                       <Send className="w-4 h-4 mr-2" />
                       Submit Evaluation
                    </Button>
                 )}
                 {isManagerStep && !isSelf && (
                    <Button onClick={() => calculateMutation.mutate()} 
                            variant="outline"
                            className="border-primary/30 hover:bg-primary/10">
                       <BarChart className="w-4 h-4 mr-2" />
                       Preview Results
                    </Button>
                 )}
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReview;
