import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format, differenceInDays, addDays, isWeekend, isSameDay, isWithinInterval } from "date-fns";
import { Calendar as CalendarIcon, Loader2, AlertCircle, CheckCircle2, Info, AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trackEvent } from "@/lib/analytics";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { getLeaveTypes, getMyBalances, applyLeave, getHolidays, getLeaves } from "@/lib/leaveApi";
import { cn } from "@/lib/utils";
import type { DayType, LeaveRequestCreate, LeaveRequest } from "@/lib/types";

interface LeaveFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaveFormModal({ open, onOpenChange }: LeaveFormModalProps) {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ["leaveTypes"],
    queryFn: getLeaveTypes,
  });

  const { data: balances } = useQuery({
    queryKey: ["myBalances"],
    queryFn: getMyBalances,
  });

  const { data: leaves } = useQuery<LeaveRequest[]>({
    queryKey: ["myLeaves"],
    queryFn: () => getLeaves(),
  });

  const { data: holidays } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => getHolidays(new Date().getFullYear()),
  });

  const mutation = useMutation({
    mutationFn: applyLeave,
    onSuccess: (data) => {
      toast.success("Leave application submitted successfully");
      trackEvent("leave_applied", { days: data.days, type: data.leave_type_id });
      queryClient.invalidateQueries({ queryKey: ["myLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["myBalances"] });
      onOpenChange(false);
      form.reset();
      setDateRange({ from: undefined, to: undefined });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit leave application");
    },
  });

  const form = useForm<LeaveRequestCreate>({
    defaultValues: {
      leave_type_id: "",
      start_date: "",
      end_date: "",
      day_type: "FULL_DAY" as DayType,
      reason: "",
    },
  });

  const watchLeaveType = form.watch("leave_type_id");
  const watchDayType = form.watch("day_type");

  // Calculate working days (Client-side estimation)
  const calculateEstimate = () => {
    if (!dateRange.from || !dateRange.to) return 0;
    
    // Simplistic calculation for UI feedback
    // Real logic is on backend
    let count = 0;
    let current = new Date(dateRange.from);
    const end = new Date(dateRange.to);
    
    while (current <= end) {
      const isWeekEnd = current.getDay() === 0 || current.getDay() === 6;
      const isHoliday = holidays?.some(h => isSameDay(new Date(h.date), current));
      
      if (!isWeekEnd && !isHoliday) {
        count++;
      }
      current = addDays(current, 1);
    }

    if (watchDayType !== "FULL_DAY" && count > 0) {
      return 0.5;
    }
    return count;
  };

  const estimatedDays = calculateEstimate();
  const selectedBalance = balances?.find(b => b.leave_type_id === watchLeaveType);
  const isInsufficient = selectedBalance ? selectedBalance.remaining < estimatedDays : false;

  // Local Overlap Check
  const overlappingLeave = leaves?.find(l => {
    if (l.status === "REJECTED" || l.status === "CANCELLED") return false;
    if (!dateRange.from || !dateRange.to) return false;
    
    const start = new Date(l.start_date);
    const end = new Date(l.end_date);
    const range = { start: dateRange.from, end: dateRange.to };
    
    return isWithinInterval(start, range) || isWithinInterval(end, range) || 
           isWithinInterval(dateRange.from, { start, end }) || isWithinInterval(dateRange.to, { start, end });
  });

  // Smart Alternative Suggestion
  const getAlternativeRange = () => {
    if (!overlappingLeave || !dateRange.from || !dateRange.to) return null;
    const duration = differenceInDays(dateRange.to, dateRange.from) + 1;
    let currentStart = addDays(new Date(overlappingLeave.end_date), 1);
    
    // Find next available slot (max 30 days ahead)
    for (let i = 0; i < 30; i++) {
        const potentialStart = addDays(currentStart, i);
        const potentialEnd = addDays(potentialStart, duration - 1);
        
        const hasConflict = leaves?.some(l => {
            if (l.status === "REJECTED" || l.status === "CANCELLED") return false;
            const start = new Date(l.start_date);
            const end = new Date(l.end_date);
            const range = { start: potentialStart, end: potentialEnd };
            return isWithinInterval(start, range) || isWithinInterval(end, range);
        });

        if (!hasConflict) return { from: potentialStart, to: potentialEnd };
    }
    return null;
  };

  const alternative = getAlternativeRange();

  const onSubmit = (data: LeaveRequestCreate) => {
    if (!dateRange.from || !dateRange.to) {
      toast.error("Please select a date range");
      return;
    }
    
    mutation.mutate({
      ...data,
      start_date: format(dateRange.from, "yyyy-MM-dd"),
      end_date: format(dateRange.to, "yyyy-MM-dd"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border border-white/10 shadow-2xl sm:rounded-3xl max-h-[95vh] flex flex-col">
        <div className="p-8 pb-4 border-b border-white/5 bg-white/[0.02]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Apply Leave</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
              Submit your time-off request for approval
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            {/* Leave Type */}
            <FormField
              control={form.control}
              name="leave_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl border-white/10 bg-white/[0.02]">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background/95 backdrop-blur-lg border-white/10">
                      {leaveTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id} className="focus:bg-primary/10">
                          <div className="flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-primary" />
                             {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-1 gap-4">
               <FormLabel>Select Dates</FormLabel>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button
                     variant="outline"
                     className={cn(
                       "w-full justify-start text-left font-normal rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                       !dateRange.from && "text-muted-foreground"
                     )}
                   >
                     <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                     {dateRange.from ? (
                       dateRange.to ? (
                         <>
                           {format(dateRange.from, "LLL dd, y")} -{" "}
                           {format(dateRange.to, "LLL dd, y")}
                         </>
                       ) : (
                         format(dateRange.from, "LLL dd, y")
                       )
                     ) : (
                       <span>Pick a range</span>
                     )}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0 rounded-2xl border-white/10 overflow-hidden shadow-2xl" align="start">
                   <Calendar
                     initialFocus
                     mode="range"
                     defaultMonth={dateRange.from}
                     selected={{ from: dateRange.from, to: dateRange.to }}
                     onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                     numberOfMonths={2}
                     className="bg-background"
                     disabled={(date) => {
                        // Disable weekends and holidays
                        const isWeekEnd = date.getDay() === 0 || date.getDay() === 6;
                        const isHoliday = holidays?.some(h => isSameDay(new Date(h.date), date));
                        return isWeekEnd || !!isHoliday;
                     }}
                     modifiers={{
                        holiday: (date) => !!holidays?.some(h => isSameDay(new Date(h.date), date)),
                     }}
                     modifiersStyles={{
                        holiday: { color: 'hsl(var(--primary))', fontWeight: 'bold', textDecoration: 'underline' }
                     }}
                   />
                 </PopoverContent>
               </Popover>
            </div>

            {/* Day Type (Half Day) */}
            {dateRange.from && dateRange.to && isSameDay(dateRange.from, dateRange.to) && (
               <FormField
                 control={form.control}
                 name="day_type"
                 render={({ field }) => (
                   <FormItem className="space-y-3">
                     <FormLabel>Day Configuration</FormLabel>
                     <FormControl>
                       <RadioGroup
                         onValueChange={field.onChange}
                         defaultValue={field.value}
                         className="flex gap-4"
                       >
                         <FormItem className="flex items-center space-x-2 space-y-0">
                           <FormControl>
                             <RadioGroupItem value="FULL_DAY" />
                           </FormControl>
                           <FormLabel className="font-normal cursor-pointer">Full Day</FormLabel>
                         </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                           <FormControl>
                             <RadioGroupItem value="FIRST_HALF" />
                           </FormControl>
                           <FormLabel className="font-normal cursor-pointer">First Half</FormLabel>
                         </FormItem>
                         <FormItem className="flex items-center space-x-2 space-y-0">
                           <FormControl>
                             <RadioGroupItem value="SECOND_HALF" />
                           </FormControl>
                           <FormLabel className="font-normal cursor-pointer">Second Half</FormLabel>
                         </FormItem>
                       </RadioGroup>
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Why are you taking this leave?" 
                      className="rounded-xl border-white/10 bg-white/[0.02] resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Mutation Error */}
            {mutation.isError && (
              <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-500 rounded-xl">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">Submission Failed</AlertTitle>
                <AlertDescription className="text-xs">
                  {mutation.error?.message || "An unexpected error occurred. Please try again."}
                </AlertDescription>
              </Alert>
            )}

            {/* Inline Validations */}
            {overlappingLeave && (
              <div className="space-y-3">
                <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-500 rounded-xl">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold uppercase tracking-wider">Overlap Detected</AlertTitle>
                  <AlertDescription className="text-xs">
                    You already have a {overlappingLeave.leave_type?.name} request from {format(new Date(overlappingLeave.start_date), "MMM dd")} to {format(new Date(overlappingLeave.end_date), "MMM dd")}.
                  </AlertDescription>
                </Alert>
                
                {alternative && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-all"
                    onClick={() => setDateRange(alternative)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                         <CalendarIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Suggested Alternative</p>
                        <p className="text-[11px] font-bold">
                          {format(alternative.from, "MMM d")} — {format(alternative.to, "MMM d")}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all">
                      Apply Now
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {isInsufficient && (
              <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500 rounded-xl">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">Insufficient Balance</AlertTitle>
                <AlertDescription className="text-xs">
                  Requesting {estimatedDays} days, but you only have {selectedBalance?.remaining} days available for {selectedBalance?.leave_type?.name}.
                </AlertDescription>
              </Alert>
            )}

            {/* Live Summary Preview */}
            {dateRange.from && dateRange.to && watchLeaveType && !overlappingLeave && !isInsufficient && (
              <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-primary/70">
                  <span>Leave Summary</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-0.5">
                      <p className="text-[10px] opacity-60 font-bold uppercase">Duration</p>
                      <p className="text-sm font-bold">{estimatedDays} Working Days</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-[10px] opacity-60 font-bold uppercase">Balance After</p>
                      <p className="text-sm font-bold">{(selectedBalance?.remaining || 0) - estimatedDays} Days</p>
                   </div>
                </div>

                <div className="pt-2 border-t border-primary/10 text-[10px] flex items-center gap-2 text-primary/60">
                  <Info className="w-3 h-3" />
                  Holidays and weekends are automatically excluded from calculation.
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl px-8"
                disabled={mutation.isPending || estimatedDays === 0 || isInsufficient}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Apply Now"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
