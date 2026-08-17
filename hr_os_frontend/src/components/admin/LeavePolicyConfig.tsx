import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Settings2, 
    ShieldCheck, 
    Calendar, 
    Clock, 
    RefreshCcw, 
    Save, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { getLeaveTypes, updateLeaveType } from "@/lib/leaveApi";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LeaveType } from "@/lib/types";

export default function LeavePolicyConfig() {
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

    const { data: leaveTypes, isLoading } = useQuery({
        queryKey: ["leaveTypes"],
        queryFn: getLeaveTypes,
    });

    const mutation = useMutation({
        mutationFn: ({ id, payload }: { id: string, payload: Partial<LeaveType> }) => 
            updateLeaveType(id, payload),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
            toast.success(`${updated.name} policy updated`);
            trackEvent("policy_updated", { leave_type: updated.name, id: updated.id });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update policy");
        }
    });

    const selectedType = leaveTypes?.find(t => t.id === selectedTypeId);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-xl font-medium text-white flex items-center gap-2">
                       <Settings2 className="w-5 h-5 text-primary" />
                       Leave Policy Engine
                   </h2>
                   <p className="text-sm text-slate-500 mt-1">Configure organizational leave rules and accrual logic.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Leave Type List */}
                <div className="lg:col-span-4 space-y-3">
                    {leaveTypes?.map((type) => (
                        <motion.div
                            key={type.id}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedTypeId(type.id)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                                selectedTypeId === type.id 
                                ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10" 
                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white tracking-tight">{type.name}</p>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase">{type.code}</p>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-transform ${selectedTypeId === type.id ? "text-primary translate-x-1" : "text-slate-700"}`} />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Configuration Panel */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {selectedType ? (
                            <motion.div
                                key={selectedType.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-8 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl space-y-8 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-32 -translate-y-32 blur-3xl pointer-events-none" />
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest text-[9px] font-black">
                                            Policy Node: {selectedType.code}
                                        </Badge>
                                        <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                                            {selectedType.name}
                                        </h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-primary" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    {/* Rules */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Hard Rules</h4>
                                        
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white">Sandwich Policy</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger><HelpCircle className="w-3 h-3 text-slate-600" /></TooltipTrigger>
                                                            <TooltipContent>Treats weekends/holidays between leaves as leave days.</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <p className="text-[10px] text-slate-500">Enable for payroll-integrated leaves.</p>
                                            </div>
                                            <Switch 
                                                checked={selectedType.sandwich_rule_enabled}
                                                onCheckedChange={(checked) => mutation.mutate({ id: selectedType.id, payload: { sandwich_rule_enabled: checked } })}
                                                disabled={mutation.isPending}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white">Carry Forward</span>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger><HelpCircle className="w-3 h-3 text-slate-600" /></TooltipTrigger>
                                                            <TooltipContent>Unused balances transfer to the next year.</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <p className="text-[10px] text-slate-500">Max limit applies per year.</p>
                                            </div>
                                            <Switch 
                                                checked={selectedType.carry_forward_enabled}
                                                onCheckedChange={(checked) => mutation.mutate({ id: selectedType.id, payload: { carry_forward_enabled: checked } })}
                                                disabled={mutation.isPending}
                                            />
                                        </div>
                                    </div>

                                    {/* Accrual */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Accrual Logic</h4>
                                        
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <RefreshCcw className="w-3 h-3" /> Accrual Rate (Days)
                                                </label>
                                                <Input 
                                                    type="number" 
                                                    step="0.5"
                                                    defaultValue={selectedType.accrual_rate}
                                                    onBlur={(e) => mutation.mutate({ id: selectedType.id, payload: { accrual_rate: parseFloat(e.target.value) } })}
                                                    className="h-12 bg-white/5 border-white/10 rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" /> Carry Forward Limit
                                                </label>
                                                <Input 
                                                    type="number" 
                                                    defaultValue={selectedType.carry_forward_limit}
                                                    onBlur={(e) => mutation.mutate({ id: selectedType.id, payload: { carry_forward_limit: parseInt(e.target.value) } })}
                                                    className="h-12 bg-white/5 border-white/10 rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-3 text-emerald-500/60 bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Logic Synchronized</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-medium">
                                        <Clock className="w-3 h-3" />
                                        Last updated: {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-6 bg-white/[0.01]">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                                    <Settings2 className="w-8 h-8 text-slate-800" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-medium text-white">Select Leave Type</h3>
                                    <p className="text-xs text-slate-500">Choose a leave type to modify its organizational policy.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
