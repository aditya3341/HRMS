import React from "react";
import { 
  Zap, 
  Palmtree, 
  FileText, 
  Calendar, 
  Users, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  ChevronRight,
  LifeBuoy
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface ActionItem {
  label: string;
  sub: string;
  icon: any;
  path: string;
  color: string;
}

export const SmartActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";

  const getActions = (): ActionItem[] => {
    const employeeActions: ActionItem[] = [
      { label: "Apply Leave", sub: "Personal", icon: Palmtree, path: "/leaves/apply", color: "text-emerald-400" },
      { label: "Holidays", sub: "Calendar", icon: Calendar, path: "/holidays", color: "text-primary" },
      { label: "View Payslip", sub: "Finance", icon: FileText, path: "/payroll", color: "text-amber-400" },
    ];

    const managerActions: ActionItem[] = [
      { label: "Approve Requests", sub: "Team", icon: ShieldCheck, path: "/approvals", color: "text-emerald-400" },
      { label: "Team Attendance", sub: "Monitoring", icon: Users, path: "/attendance/team", color: "text-primary" },
      { label: "Flag Risk", sub: "Intelligence", icon: AlertCircle, path: "/leaves/manage", color: "text-red-400" },
    ];

    const hrActions: ActionItem[] = [
      { label: "Run Payroll", sub: "Execution", icon: Clock, path: "/payroll", color: "text-emerald-400" },
      { label: "Policies", sub: "Management", icon: FileText, path: "/policies", color: "text-primary" },
      { label: "Hiring Funnel", sub: "Talent", icon: Users, path: "/jobs", color: "text-amber-400" },
    ];

    if (["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"].includes(role)) {
      return [...employeeActions, ...hrActions];
    }
    
    if (role === "MANAGER") {
      return [...employeeActions, ...managerActions];
    }

    return employeeActions;
  };

  const actions = getActions();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Smart Actions
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action, i) => (
          <motion.button 
            key={i} 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-start p-5 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.08] hover:border-white/20 transition-all group relative overflow-hidden"
          >
            <div className={`p-3 bg-white/5 rounded-xl mb-4 group-hover:bg-primary/20 transition-colors ${action.color}`}>
              <action.icon className="w-5 h-5 text-current" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{action.sub}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">{action.label}</span>
                <ChevronRight className="w-3 h-3 text-slate-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
