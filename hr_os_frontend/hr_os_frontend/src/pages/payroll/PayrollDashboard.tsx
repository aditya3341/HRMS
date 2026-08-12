import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Banknote, 
  CreditCard, 
  ChevronRight, 
  Download, 
  Play, 
  CheckCircle2, 
  History,
  Info,
  DollarSign,
  PieChart as PieIcon,
  RefreshCcw,
  TrendingDown,
  Lock,
  Unlock,
  AlertTriangle,
  FileText,
  User,
  ExternalLink,
  FileSpreadsheet
} from "lucide-react";
import { 
  usePayrollRuns, 
  usePayrollDetail, 
  usePayrollPreview, 
  useRunPayroll, 
  useUpdatePayrollStatus,
  useOverridePayroll 
} from "@/hooks/usePayroll";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import type { PayrollEntry, PayrollRunStatus } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { PayrollConfirmationModal } from "@/components/payroll/PayrollConfirmationModal";
import { PayrollSummaryCards } from "@/components/payroll/PayrollSummaryCards";
import { WarningBanner } from "@/components/payroll/WarningBanner";
import { exportPayrollExcel } from "@/lib/exportUtils";

export default function PayrollDashboard() {
    const { canManagePayroll } = useRole();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isOverrideOpen, setIsOverrideOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
    const [overrideAmount, setOverrideAmount] = useState("");
    const [overrideReason, setOverrideReason] = useState("");

    // Hooks
    const { data: runs, isLoading: isLoadingRuns } = usePayrollRuns();
    const { data: detailData, isLoading: isLoadingDetail } = usePayrollDetail(viewingId);
    
    // Unpack detail
    const currentRun = detailData?.run;
    const currentEntries = detailData?.entries || [];

    const previewMutation = usePayrollPreview();
    const runMutation = useRunPayroll();
    const statusMutation = useUpdatePayrollStatus();
    const overrideMutation = useOverridePayroll();

    const handlePreview = () => {
        previewMutation.mutate(
            { month: selectedMonth, year: selectedYear },
            { onSuccess: () => setIsPreviewOpen(true) }
        );
    };

    const handleExecuteClick = () => {
        setIsConfirmModalOpen(true);
    };

    const handleExecuteConfirm = () => {
        runMutation.mutate(
            { month: selectedMonth, year: selectedYear },
            { 
              onSuccess: () => {
                setIsConfirmModalOpen(false);
                toast.success("Payroll processed successfully");
              },
              onError: (err) => {
                setIsConfirmModalOpen(false);
              }
            }
        );
    };

    const handleStatusUpdate = (status: PayrollRunStatus) => {
        if (!viewingId) return;
        statusMutation.mutate({ runId: viewingId, status });
    };

    const handleOverrideSubmit = () => {
        if (!selectedEntry || !overrideAmount || !overrideReason) {
            toast.error("Please fill all override details");
            return;
        }
        overrideMutation.mutate({
            entryId: selectedEntry.id,
            amount: parseFloat(overrideAmount),
            reason: overrideReason
        }, {
            onSuccess: () => {
                setIsOverrideOpen(false);
                setSelectedEntry(null);
                setOverrideAmount("");
                setOverrideReason("");
            }
        });
    };

    // Anomaly Detection Logic
    const anomalies = useMemo(() => {
        const targetList = isPreviewOpen ? (previewMutation.data?.entries || []) : currentEntries;
        const result: any[] = [];
        targetList.forEach((e: PayrollEntry) => {
            if (e.lop_days > 5) {
                result.push({ type: 'high_lop', employeeName: e.employee_name, message: `⚠️ ${e.employee_name} has high LOP (${e.lop_days} days)` });
            }
            if (e.net_salary <= 0) {
                result.push({ type: 'invalid_salary', employeeName: e.employee_name, message: `⚠️ ${e.employee_name} salary is zero or invalid (₹${e.net_salary})` });
            }
            // Logic for missing attendance would ideally come from backend or complex frontend check
            // For now, these two are critical surfacing points
        });
        return result;
    }, [isPreviewOpen, previewMutation.data, currentEntries]);

    // Summaries Logic
    const summaries = useMemo(() => {
        const targetList = isPreviewOpen ? (previewMutation.data?.entries || []) : currentEntries;
        if (!targetList.length) return { totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 };
        return {
            totalEmployees: targetList.length,
            totalGross: targetList.reduce((acc, e) => acc + e.gross_salary, 0),
            totalDeductions: targetList.reduce((acc, e) => acc + e.total_deductions, 0),
            totalNet: targetList.reduce((acc, e) => acc + e.net_salary, 0),
        };
    }, [isPreviewOpen, previewMutation.data, currentEntries]);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <PageHeader 
                icon={Banknote}
                title="Payroll Control Center"
                subtitle="Execute salary disbursement cycles with attendance-sync and LOP enforcement."
            />

            <WarningBanner anomalies={anomalies} />

            {(viewingId || isPreviewOpen) && (
                <PayrollSummaryCards 
                    totalEmployees={summaries.totalEmployees}
                    totalGross={summaries.totalGross}
                    totalDeductions={summaries.totalDeductions}
                    totalNet={summaries.totalNet}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* LEFT: Run Controls & Stats */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-10">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-purple-500/20 rounded-[3rem] blur-2xl opacity-20" />
                        <Card className="relative glass-card border-white/10 rounded-[2.8rem] overflow-hidden border shadow-inner">
                            <CardContent className="p-10 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <Play size={24} className="fill-emerald-400/20" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight leading-none">Execute Cycle</h2>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Initiate Disbursement</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Month</label>
                                            <Select onValueChange={(v) => setSelectedMonth(Number(v))} defaultValue={selectedMonth.toString()}>
                                                <SelectTrigger className="h-14 rounded-2xl glass-card border-white/5 bg-white/[0.02] text-white font-bold">
                                                    <SelectValue placeholder="Select Month" />
                                                </SelectTrigger>
                                                <SelectContent className="glass-card border-white/10 bg-slate-950 text-white">
                                                    {months.map((m, i) => (
                                                        <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Year</label>
                                            <Select onValueChange={(v) => setSelectedYear(Number(v))} defaultValue={selectedYear.toString()}>
                                                <SelectTrigger className="h-14 rounded-2xl glass-card border-white/5 bg-white/[0.02] text-white font-bold">
                                                    <SelectValue placeholder="Select Year" />
                                                </SelectTrigger>
                                                <SelectContent className="glass-card border-white/10 bg-slate-950 text-white">
                                                    {[2024, 2025, 2026].map(y => (
                                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <Button 
                                            onClick={handlePreview}
                                            disabled={previewMutation.isPending}
                                            variant="outline"
                                            className="h-16 rounded-2xl border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                                        >
                                            {previewMutation.isPending ? <RefreshCcw className="animate-spin mr-2" size={18} /> : <FileText className="mr-2" size={18} />}
                                            Simulate Preview
                                        </Button>
                                        {canManagePayroll && (
                                            <Button 
                                                onClick={handleExecuteClick}
                                                disabled={runMutation.isPending}
                                                className="h-20 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black uppercase tracking-[0.25em] text-sm shadow-xl shadow-emerald-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all group/run"
                                            >
                                                {runMutation.isPending ? (
                                                    <RefreshCcw className="animate-spin mr-3" size={20} />
                                                ) : (
                                                    <CreditCard className="mr-3 group-hover/run:rotate-12 transition-transform" size={20} />
                                                )}
                                                Process Payroll
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2 p-4 bg-white/5 rounded-3xl border border-white/5">
                                    <Info size={16} className="text-amber-400 shrink-0" />
                                    <p className="text-[9px] font-medium text-slate-400 italic">Determinstic LOP logic: Absent + Rejected Leave - Overlap = LOP Days.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: "Runs This Year", val: runs?.length || 0, icon: History, color: "text-emerald-400" },
                            { label: "Avg Disbursement", val: `₹${((runs?.[0]?.total_net || 0) / 1000).toFixed(1)}k`, icon: DollarSign, color: "text-indigo-400" },
                        ].map((s, i) => (
                            <motion.div 
                                key={s.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="p-8 rounded-[2.5rem] glass-card border-white/5 flex flex-col justify-between h-40"
                            >
                                <s.icon className={s.color} size={20} />
                                <div>
                                    <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{s.val}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{s.label}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: History List */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                                <History size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Run History</h2>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 rounded-xl font-bold uppercase">
                              {runs?.length || 0} TOTAL CYCLES
                          </Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isLoadingRuns ? (
                            Array(3).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-32 w-full rounded-[2.5rem] bg-white/5 border border-white/5" />
                            ))
                        ) : runs?.map((run, i) => (
                            <motion.div 
                                key={run.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ x: 10, scale: 1.01 }}
                                onClick={() => { setViewingId(run.id); setIsPreviewOpen(false); }}
                                className={`p-8 rounded-[2.5rem] glass-card border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between ${viewingId === run.id ? 'border-primary/40 bg-white/5' : ''}`}
                            >
                                <div className="flex items-center gap-8">
                                    <div className="h-16 w-16 rounded-3xl bg-emerald-500/5 group-hover:bg-emerald-500/10 flex flex-col items-center justify-center border border-emerald-500/10 transition-colors">
                                        <span className="text-emerald-500 font-black text-xs">{months[run.month - 1].slice(0, 3)}</span>
                                        <span className="text-white font-black text-lg">{run.year}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-white/5 text-slate-400 border-white/5 text-[9px] font-black uppercase tracking-widest">
                                                SNAPSHOT ID: {run.id.slice(0, 8)}
                                            </Badge>
                                            <Badge className={`${
                                                run.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                                                run.status === 'LOCKED' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-slate-500/10 text-slate-400'
                                            } border-transparent text-[8px] font-black uppercase`}>
                                                {run.status === 'PAID' && <CheckCircle2 className="inline mr-1" size={10} />}
                                                {run.status === 'LOCKED' && <Lock className="inline mr-1" size={10} />}
                                                {run.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-baseline gap-4 mt-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-white tabular-nums tracking-tighter">₹{(run.total_net).toLocaleString()}</span>
                                            </div>
                                            <div className="h-1 w-1 rounded-full bg-white/20" />
                                            <p className="text-sm font-medium text-slate-500">Processed by Hardened Engine</p>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={24} className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PREVIEW DIALOG OR SIDEBAR */}
            <AnimatePresence>
                {(viewingId || isPreviewOpen) && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setViewingId(null); setIsPreviewOpen(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                        <motion.div 
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-4xl h-full glass-card border-l border-white/10 bg-slate-950/90 shadow-2xl p-0 flex flex-col"
                        >
                            {isLoadingDetail ? (
                                <div className="p-12 space-y-8 animate-pulse">
                                    <Skeleton className="h-12 w-48 bg-white/5" />
                                    <div className="grid grid-cols-2 gap-8">
                                        <Skeleton className="h-32 rounded-3xl bg-white/5" />
                                        <Skeleton className="h-32 rounded-3xl bg-white/5" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-12 pb-8 border-b border-white/5 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-4">
                                                <button onClick={() => { setViewingId(null); setIsPreviewOpen(false); }} className="text-slate-500 hover:text-white flex items-center gap-2 group transition-colors">
                                                    <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={16} /> 
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Back to History</span>
                                                </button>
                                                <h2 className="text-5xl font-black text-white tracking-tighter uppercase whitespace-nowrap">
                                                  {isPreviewOpen ? "PREVIEW" : "SUMMARY"} <span className="text-emerald-500">&bull;</span> {months[currentRun?.month || selectedMonth - 1]}
                                                </h2>
                                                <div className="flex gap-3">
                                                    <Badge className="bg-white/5 border-white/10 text-slate-400 px-4 py-1.5 rounded-xl font-bold">{currentRun?.year || selectedYear} CYCLE</Badge>
                                                    <Badge className={`${currentRun?.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : currentRun?.status === 'LOCKED' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'} px-4 py-1.5 rounded-xl font-bold uppercase`}>{isPreviewOpen ? 'SIMULATED' : (currentRun?.status || 'DRAFT')}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {!isPreviewOpen && currentRun && canManagePayroll && (
                                                    <>
                                                        {currentRun.status === 'DRAFT' && (
                                                            <Button onClick={() => handleStatusUpdate('LOCKED')} className="h-14 px-8 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/20 font-black uppercase tracking-widest hover:bg-amber-500/30 transition-all"><Lock className="mr-2" size={18} /> Lock</Button>
                                                        )}
                                                        {currentRun.status === 'LOCKED' && (
                                                            <Button onClick={() => handleStatusUpdate('PAID')} className="h-14 px-8 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all"><CheckCircle2 className="mr-2" size={18} /> Mark Paid</Button>
                                                        )}
                                                        <Button 
                                                          onClick={() => exportPayrollExcel(currentEntries, currentRun)}
                                                          variant="outline"
                                                          className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-slate-300 font-black uppercase tracking-widest"
                                                        >
                                                          <FileSpreadsheet className="mr-2" size={18} /> Export
                                                        </Button>
                                                    </>
                                                )}
                                                {isPreviewOpen && (
                                                  <Button 
                                                    onClick={() => exportPayrollExcel(previewMutation.data?.entries || [], { month: selectedMonth, year: selectedYear } as any)}
                                                    variant="outline"
                                                    className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-slate-300 font-black uppercase tracking-widest"
                                                  >
                                                    <FileSpreadsheet className="mr-2" size={18} /> Export Preview
                                                  </Button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="p-10 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-2 relative overflow-hidden group">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Gross Disbursement</p>
                                                <p className="text-4xl font-black text-white tracking-tighter tabular-nums">₹{summaries.totalGross.toLocaleString()}</p>
                                            </div>
                                            <div className="p-10 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 space-y-2 relative overflow-hidden group">
                                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Total Deductions</p>
                                                <p className="text-4xl font-black text-white tracking-tighter tabular-nums">₹{summaries.totalDeductions.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-12 pt-8 space-y-6">
                                        {(isPreviewOpen ? (previewMutation.data?.entries || []) : currentEntries).map((entry: PayrollEntry) => (
                                            <div key={entry.id || entry.employee_id} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 space-y-6 group hover:border-white/20 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300"><User size={24} /></div>
                                                        <div>
                                                            <p className="text-lg font-black text-white tracking-tight uppercase">{entry.employee_name || "Employee Node"}</p>
                                                            <div className="flex gap-2 mt-1">
                                                              {entry.override_reason && <Badge className="bg-amber-500/10 border-transparent text-amber-500 text-[8px] font-black uppercase">Overridden</Badge>}
                                                              {entry.lop_days > 5 && <Badge className="bg-rose-500/10 border-transparent text-rose-500 text-[8px] font-black uppercase">High LOP</Badge>}
                                                              {entry.net_salary <= 0 && <Badge className="bg-red-500/10 border-transparent text-red-500 text-[8px] font-black uppercase">Zero Salary</Badge>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-white tracking-tighter tabular-nums">₹{entry.net_salary.toLocaleString()}</p>
                                                        <div className="flex items-center gap-1.5 justify-end mt-1">
                                                            <TrendingDown size={12} className="text-rose-400" />
                                                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest whitespace-nowrap">₹{entry.total_deductions.toLocaleString()} DED.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 p-5 bg-black/20 rounded-2xl border border-white/5">
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">LOP Days</p>
                                                        <p className="text-xs font-black text-white">{entry.lop_days}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Payslip</p>
                                                        {!isPreviewOpen && (
                                                          <Link to={`/payroll/payslip/${viewingId}/${entry.employee_id || entry.id}`} className="text-primary hover:text-white transition-colors flex justify-center"><ExternalLink size={14} /></Link>
                                                        )}
                                                        {isPreviewOpen && <span className="text-slate-700 flex justify-center"><ExternalLink size={14} /></span>}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tax (v2)</p>
                                                        <p className="text-xs font-black text-white">₹{entry.fixed_deductions}</p>
                                                    </div>
                                                    <div className="flex justify-end items-center">
                                                        {canManagePayroll && !isPreviewOpen && currentRun?.status === 'DRAFT' && (
                                                            <Button onClick={() => { setSelectedEntry(entry); setOverrideAmount(entry.net_salary.toString()); setIsOverrideOpen(true); }} className="h-8 px-4 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest">Override</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <PayrollConfirmationModal 
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleExecuteConfirm}
                isLoading={runMutation.isPending}
                month={months[selectedMonth - 1]}
            />

            <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
                <DialogContent className="max-w-md glass-card border-white/10 bg-slate-950/90 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Salary Override</DialogTitle>
                        <DialogDescription className="text-slate-400">Manual adjustment for {selectedEntry?.employee_name}. This action is logged for compliance.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 my-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Net Salary</label>
                            <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><Input type="number" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} className="pl-12 h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold text-lg" /></div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mandatory Justification</label>
                            <Input placeholder="Justification..." value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-medium" />
                        </div>
                    </div>
                    <DialogFooter><Button variant="ghost" onClick={() => setIsOverrideOpen(false)} className="rounded-xl font-bold text-slate-400">Cancel</Button><Button onClick={handleOverrideSubmit} disabled={overrideMutation.isPending} className="h-12 px-8 rounded-xl bg-amber-500 text-black font-black uppercase tracking-widest">{overrideMutation.isPending ? "Applying..." : "Confirm Override"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
