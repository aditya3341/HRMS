import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getCycles, 
  getKpas, 
  getMyGoals, 
  createOrUpdateGoals, 
  submitGoals, 
  getGoalConfig 
} from "@/lib/performanceApi";
import { PageHeader } from "@/components/PageHeader";
import { 
  Target, 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { motion, AnimatePresence } from "framer-motion";

const MyGoals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // 1. Fetch Data
  const { data: cycles } = useQuery({
    queryKey: ["performanceCycles"],
    queryFn: getCycles,
  });

  const { data: goalConfig } = useQuery({
    queryKey: ["goalConfig"],
    queryFn: getGoalConfig,
  });

  const { data: kpas } = useQuery({
    queryKey: ["kpas"],
    queryFn: getKpas,
  });

  const activeCycle = cycles?.find((c: any) => c.status === "ACTIVE");

  useEffect(() => {
    if (activeCycle && !selectedCycleId) {
      setSelectedCycleId(activeCycle.id);
    }
  }, [activeCycle]);

  const { data: existingGoals, isLoading: loadingGoals } = useQuery({
    queryKey: ["myGoals", selectedCycleId],
    queryFn: () => getMyGoals(selectedCycleId!),
    enabled: !!selectedCycleId,
  });

  useEffect(() => {
    if (existingGoals && existingGoals.items) {
      setItems(existingGoals.items);
    } else if (!loadingGoals) {
      setItems([]);
    }
  }, [existingGoals, loadingGoals]);

  // 2. Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => createOrUpdateGoals(data),
    onSuccess: () => {
      toast({ title: "Goals Saved", description: "Your goal draft has been updated." });
      queryClient.invalidateQueries({ queryKey: ["myGoals"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (goalId: string) => submitGoals(goalId),
    onSuccess: () => {
      toast({ title: "Goals Submitted", description: "Your goals have been sent for manager approval." });
      queryClient.invalidateQueries({ queryKey: ["myGoals"] });
    },
  });

  // 3. Logic
  const addGoal = () => {
    if (items.length >= (goalConfig?.max_goals || 10)) {
      toast({ title: "Limit Reached", description: `You can only have up to ${goalConfig?.max_goals} goals.`, variant: "destructive" });
      return;
    }
    setItems([...items, { title: "", description: "", weightage: 0, target_value: "", is_custom: true }]);
  };

  const removeGoal = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weightage) || 0), 0);
  const isWeightValid = Math.abs(totalWeight - (goalConfig?.weightage_total || 100)) <= (goalConfig?.weightage_tolerance || 0);
  const isCountValid = items.length >= (goalConfig?.min_goals || 3) && items.length <= (goalConfig?.max_goals || 10);
  const isLocked = existingGoals?.status === "SUBMITTED" || existingGoals?.status === "APPROVED";

  const handleSave = () => {
    if (!selectedCycleId) return;
    saveMutation.mutate({
      cycle_id: selectedCycleId,
      items: items.map(it => ({
        ...it,
        weightage: parseFloat(it.weightage) || 0,
        kpa_id: it.kpa_id || null,
        kra_id: it.kra_id || null
      }))
    });
  };

  const handleSubmit = () => {
    if (!isWeightValid || !isCountValid) {
      toast({ title: "Validation Error", description: "Please ensure total weightage is 100% and goal count is within limits.", variant: "destructive" });
      return;
    }
    if (existingGoals?.id) {
       submitMutation.mutate(existingGoals.id);
    }
  };

  if (!activeCycle && !cycles?.length) return <div>No active performance cycle found.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <PageHeader
          icon={Target}
          title="My Performance Goals"
          subtitle={activeCycle ? `Active Cycle: ${activeCycle.name}` : "Set your goals for the current period"}
        />
        
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
           <div className="px-4 py-2 border-r border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Weightage</p>
              <p className={`text-xl font-black ${isWeightValid ? 'text-emerald-400' : 'text-orange-400'}`}>
                {totalWeight}% <span className="text-xs font-normal text-muted-foreground">/ {goalConfig?.weightage_total}%</span>
              </p>
           </div>
           <div className="px-4 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Goal Count</p>
              <p className={`text-xl font-black ${isCountValid ? 'text-emerald-400' : 'text-orange-400'}`}>
                {items.length} <span className="text-xs font-normal text-muted-foreground">/ {goalConfig?.min_goals}-{goalConfig?.max_goals}</span>
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Interface */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden group bg-white/[0.03] backdrop-blur-xl border-white/10 hover:border-primary/30 transition-all duration-300">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/30 group-hover:bg-primary transition-colors" />
                  
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] uppercase tracking-widest text-primary font-bold">Goal #{index + 1}</Label>
                        <Input
                          disabled={isLocked}
                          placeholder="What do you want to achieve?"
                          value={item.title}
                          onChange={(e) => updateItem(index, "title", e.target.value)}
                          className="text-lg font-bold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto"
                        />
                      </div>
                      {!isLocked && (
                        <Button variant="ghost" size="icon" onClick={() => removeGoal(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Description</Label>
                        <Textarea
                          disabled={isLocked}
                          placeholder="Key results, milestones, or success criteria..."
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          className="bg-white/5 border-white/10 min-h-[80px] focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Weightage (%)</Label>
                              <Input
                                disabled={isLocked}
                                type="number"
                                value={item.weightage}
                                onChange={(e) => updateItem(index, "weightage", e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-primary/50"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Target Value</Label>
                              <Input
                                disabled={isLocked}
                                placeholder="e.g. 100k, 5, 100%"
                                value={item.target_value}
                                onChange={(e) => updateItem(index, "target_value", e.target.value)}
                                className="bg-white/5 border-white/10 focus:border-primary/50"
                              />
                           </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">KPA Category</Label>
                          <Select
                            disabled={isLocked}
                            value={item.kpa_id}
                            onValueChange={(val) => updateItem(index, "kpa_id", val)}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {kpas?.map((kpa: any) => (
                                <SelectItem key={kpa.id} value={kpa.id}>{kpa.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {!isLocked && (
            <div className="flex justify-center py-4">
              <Button onClick={addGoal} variant="outline" className="rounded-full border-dashed border-2 px-8 py-6 hover:bg-primary/5 group">
                <Plus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                Add Professional Goal
              </Button>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          <Card className="p-6 bg-white/[0.03] backdrop-blur-xl border-white/10 sticky top-24">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Submission Checklist
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Required Goals</span>
                 {isCountValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-orange-400" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Total Weight (100%)</span>
                 {isWeightValid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-orange-400" />}
              </div>
              <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">Mandatory Fields</span>
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleSave} 
                disabled={isLocked || saveMutation.isPending}
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Draft"}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isLocked || !isWeightValid || !isCountValid || submitMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>

            {isLocked && (
               <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
                  <p className="text-sm font-bold text-primary mb-1">Status: {existingGoals?.status}</p>
                  <p className="text-[10px] text-muted-foreground">Goals are locked and awaiting manager review.</p>
               </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MyGoals;
