import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, Clock, FileCheck, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import type { APIResponse } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      return await api.get<any>("/dashboard/stats");
    },
  });

  const stats = [
    { label: "Active Employees", value: statsData?.active_employees?.toString() || "0", icon: Users },
    { label: "Open Positions", value: statsData?.open_positions?.toString() || "0", icon: Briefcase },
    { label: "New Applications", value: statsData?.new_applications?.toString() || "0", icon: FileCheck },
    { label: "Retention Rate", value: statsData?.retention_rate || "100%", icon: Clock },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Snapshot of your organization's current metrics and tasks."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className="group bg-white/[0.04] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.06] flex flex-col justify-between h-40"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-primary/10 rounded-xl">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
              <span className="text-[11px] font-medium text-emerald-500">Healthy</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-medium text-white">Quick Actions</h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Post Job", icon: Briefcase, path: "/jobs" },
            { label: "Add Employee", icon: Users, path: "/onboarding" },
            { label: "Review Apps", icon: FileCheck, path: "/applications" },
            { label: "Run Payroll", icon: Clock, path: "/payroll" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-4 p-5 bg-white/[0.04] border border-white/10 rounded-2xl hover:bg-white/[0.08] transition-all group"
            >
              <div className="p-3 rounded-xl bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                <action.icon className="w-5 h-5 text-slate-400 group-hover:text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}