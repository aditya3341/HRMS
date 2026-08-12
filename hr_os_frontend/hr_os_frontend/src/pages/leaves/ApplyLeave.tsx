import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getLeaveTypes, getMyBalances, applyLeave } from "@/lib/leaveApi";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DayType } from "@/lib/types";

const formSchema = z.object({
  leave_type_id: z.string().min(1, "Please select a leave type"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  day_type: z.enum(["FULL_DAY", "FIRST_HALF", "SECOND_HALF"]),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export default function ApplyLeave() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [computedDays, setComputedDays] = useState(0);

  const { data: leaveTypes } = useQuery({
    queryKey: ["leaveTypes"],
    queryFn: getLeaveTypes,
  });

  const { data: balances } = useQuery({
    queryKey: ["myBalances"],
    queryFn: getMyBalances,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      day_type: "FULL_DAY",
      reason: "",
    },
  });

  const mutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: () => {
      toast.success("Leave application submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["myLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveStats"] });
      queryClient.invalidateQueries({ queryKey: ["myBalances"] });
      navigate("/leaves/dashboard");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit application");
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutation.mutate(values as any);
  };

  // Watch for date changes to show estimated days
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");
  const leaveTypeId = form.watch("leave_type_id");
  
  const selectedBalance = balances?.find(b => b.leave_type_id === leaveTypeId);

  React.useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setComputedDays(diffDays > 0 ? diffDays : 0);
    }
  }, [startDate, endDate]);

  const isLowBalance = selectedBalance && computedDays > selectedBalance.remaining;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="group text-muted-foreground hover:text-foreground -ml-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Form (2 units) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter">New Application</h1>
            <p className="text-muted-foreground font-medium">Complete the form below to request time off.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="p-8 rounded-[2rem] border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Leave Type */}
                  <FormField
                    control={form.control}
                    name="leave_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Leave Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 transition-all focus:ring-primary focus:border-primary">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10 bg-slate-900/90 backdrop-blur-xl">
                            {leaveTypes?.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="focus:bg-primary/20 transition-colors">
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Day Type */}
                  <FormField
                    control={form.control}
                    name="day_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Duration Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-white/5 border-white/10 transition-all focus:ring-primary focus:border-primary">
                              <SelectValue placeholder="Full Day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl border-white/10 bg-slate-900/90 backdrop-blur-xl">
                            <SelectItem value="FULL_DAY">Full Day</SelectItem>
                            <SelectItem value="FIRST_HALF">First Half (Morning)</SelectItem>
                            <SelectItem value="SECOND_HALF">Second Half (Afternoon)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Start Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="date" {...field} className="h-12 rounded-xl bg-white/5 border-white/10 focus:ring-primary transition-all pr-10" />
                            <Calendar className="absolute right-3 top-3.5 w-5 h-5 opacity-20 pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* End Date */}
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">End Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="date" {...field} className="h-12 rounded-xl bg-white/5 border-white/10 focus:ring-primary transition-all pr-10" />
                            <Calendar className="absolute right-3 top-3.5 w-5 h-5 opacity-20 pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reason */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Reason / Description</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="Why are you taking this leave? (e.g., Family vacation, Medical checkup)" 
                            className="min-h-[120px] rounded-2xl bg-white/5 border-white/10 focus:ring-primary transition-all resize-none p-4"
                            {...field} 
                          />
                          <FileText className="absolute right-4 bottom-4 w-5 h-5 opacity-20 pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[10px] opacity-40">Minimum 5 characters required for approval.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={mutation.isPending || isLowBalance}
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/20"
                >
                  {mutation.isPending ? "Submitting..." : (
                    <>
                      Submit Application
                      <Send className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </Card>
            </form>
          </Form>
        </div>

        {/* Right: Summary & Balance (1 unit) */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
             {startDate && endDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <Clock className="w-12 h-12 text-primary opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700" />
                  </div>
                  
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-8">Computation</h3>
                  <div className="space-y-6">
                     <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter text-primary">{computedDays}</span>
                        <span className="text-sm font-bold opacity-40 uppercase">Total Days</span>
                     </div>

                     <div className="space-y-4 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Start</span>
                           <span className="text-sm font-bold">{new Date(startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-40">End</span>
                           <span className="text-sm font-bold">{new Date(endDate).toLocaleDateString()}</span>
                        </div>
                     </div>

                     {isLowBalance ? (
                       <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-rose-500 items-start">
                          <AlertCircle className="w-5 h-5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Insufficient Balance</p>
                            <p className="text-[10px] opacity-70">You only have {selectedBalance?.remaining} days remaining.</p>
                          </div>
                       </div>
                     ) : (
                       <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-emerald-500 items-start">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold">Balance Validated</p>
                            <p className="text-[10px] opacity-70">Approval will deduct {computedDays} days.</p>
                          </div>
                       </div>
                     )}
                  </div>
                </motion.div>
             )}
          </AnimatePresence>

          <Card className="p-8 rounded-[2rem] border-white/10 bg-white/[0.02] backdrop-blur-2xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center gap-2">
               <HelpCircle className="w-3 h-3" /> FAQs
            </h3>
            <div className="space-y-4">
               <div className="space-y-1">
                  <p className="text-xs font-bold">What is a Sandwich Rule?</p>
                  <p className="text-[10px] text-muted-foreground">Holidays between leave days are counted as leave.</p>
               </div>
               <div className="space-y-1">
                  <p className="text-xs font-bold">Can I cancel later?</p>
                  <p className="text-[10px] text-muted-foreground">Yes, until the leave start date occurs.</p>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
