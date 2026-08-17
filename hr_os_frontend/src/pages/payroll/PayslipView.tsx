import React from "react";
import { useParams } from "react-router-dom";
import { 
  Building2, 
  CalendarDays, 
  Clock, 
  AlertTriangle, 
  Umbrella, 
  Info,
  ChevronLeft,
  Printer,
  Download
} from "lucide-react";
import { usePayrollDetail } from "@/hooks/usePayroll";
import { useRole } from "@/hooks/useRole";
import { hasRole } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { generatePayslipPDF } from "@/lib/exportUtils";

export default function PayslipView() {
  const { runId, employeeId } = useParams();
  const { role, user } = useRole();
  const { data, isLoading } = usePayrollDetail(runId);

  const entry = data?.entries.find(e => e.employee_id === employeeId || e.id === employeeId);
  const run = data?.run;

  // Role Restriction: Employee can only see their own payslip
  const isSelf = user?.employee_id === employeeId || user?.user_id === employeeId; // employeeId might be user_id in some paths
  const isAdmin = hasRole(role, ["ADMIN", "HR", "SUPER_ADMIN", "HR_ADMIN"]);
  
  if (isLoading) return <div className="h-96 flex items-center justify-center animate-pulse text-slate-500">Generating Document...</div>;
  
  if (!entry) return <div className="h-96 flex items-center justify-center text-slate-500">Payslip record not found.</div>;

  if (!isAdmin && !isSelf) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-500 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <p className="text-xl font-black uppercase tracking-tighter text-white">Access Denied</p>
        <p className="text-sm">You do not have permission to view this payslip.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to History
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button 
            onClick={() => generatePayslipPDF(entry, run)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all font-black uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-200 rounded-3xl p-12 text-slate-900 shadow-2xl relative overflow-hidden print:p-0 print:shadow-none print:border-none"
      >
        <div className="flex justify-between items-start mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white"><Building2 className="w-8 h-8" /></div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-indigo-950">Zipaworld</h1>
                <p className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase">HR OS Hardened Payroll</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">PAYSLIP</h2>
            <div className="bg-slate-100 rounded-xl px-4 py-2 inline-block">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Cycle</p>
              <p className="text-sm font-black text-slate-900">{run ? format(new Date(run.year, run.month - 1), "MMMM yyyy") : "---"}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full mb-12" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0"><CalendarDays className="w-4 h-4" /></div>
            <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Absences</p><p className="text-xs font-black text-slate-900">{entry.absences_count || 0}</p></div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0"><Umbrella className="w-4 h-4" /></div>
            <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Leaves</p><p className="text-xs font-black text-slate-900">{entry.approved_leave_count || 0}</p></div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0"><Clock className="w-4 h-4" /></div>
            <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Half Days</p><p className="text-xs font-black text-slate-900">{entry.half_day_count || 0}</p></div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0"><Info className="w-4 h-4" /></div>
            <div><p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Overlap</p><p className="text-xs font-black text-slate-900">{entry.overlap_count || 0}</p></div>
          </div>
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0"><AlertTriangle className="w-4 h-4" /></div>
            <div><p className="text-[8px] font-black text-rose-600 uppercase tracking-wider">Net LOP</p><p className="text-xs font-black text-rose-600">{entry.lop_days || 0} Days</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-3">Earnings</h4>
            <div className="space-y-4 bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-600">Fixed Gross Salary</span><span className="font-black text-slate-900 text-base">₹{entry.gross_salary.toLocaleString()}</span></div>
              <div className="h-px bg-slate-200 w-full my-2" />
              <div className="flex justify-between items-center text-sm pt-2"><span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Total Component</span><span className="font-black text-emerald-600 text-lg">₹{entry.gross_salary.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-red-500 pl-3">Deductions</h4>
            <div className="space-y-4 bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-600">LOP Adjustment ({entry.lop_days} days)</span><span className="font-black text-slate-900 text-base">-₹{entry.lop_deduction.toLocaleString()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-600">Attendance Penalty</span><span className="font-black text-slate-900 text-base">-₹{entry.attendance_deduction.toLocaleString()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="font-bold text-slate-600">Statutory Deductions (v2)</span><span className="font-black text-slate-900 text-base">-₹{entry.fixed_deductions.toLocaleString()}</span></div>
              {entry.override_reason && <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-xs italic">"{entry.override_reason}"</div>}
              <div className="h-px bg-slate-200 w-full my-2" />
              <div className="flex justify-between items-center text-sm pt-2"><span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Total Deductions</span><span className="font-black text-red-600 text-lg">₹{entry.total_deductions.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-950 rounded-3xl p-8 flex justify-between items-center shadow-2xl">
          <div><h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Net Pay (Take Home)</h5><p className="text-3xl font-black text-white tracking-tighter">₹{entry.net_salary.toLocaleString()}</p></div>
          <div className="text-right">
             <p className="text-xs font-bold text-indigo-400 mb-1">Status</p>
             <p className="text-sm font-black text-white uppercase tracking-widest">{run?.status === 'PAID' ? 'DISBURSED' : 'PROCESSED'}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
