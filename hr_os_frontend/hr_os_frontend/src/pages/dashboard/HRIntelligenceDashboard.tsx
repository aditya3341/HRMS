import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  AlertCircle,
  Users,
  LayoutDashboard,
  Brain,
  Filter
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { dashboardService } from "@/lib/dashboardService";
import { DashboardKpiGrid } from "@/components/dashboard/KPI_Cards";
import { RiskTable } from "@/components/dashboard/RiskTable";
import { FraudHeatmap } from "@/components/dashboard/FraudHeatmap";
import { AttendancePerformanceChart } from "@/components/dashboard/AttendanceChart";

export default function HRIntelligenceDashboard() {
  const { data: intel, isLoading } = useQuery({
    queryKey: ["hr-intelligence"],
    queryFn: () => dashboardService.getHRIntelligence(),
    refetchInterval: 60_000,
  });

  const kpiStats = intel ? [
    {
      label: "Avg Trust Score",
      value: `${intel.avg_trust_score}%`,
      icon: ShieldCheck,
      trend: { value: 2.5, isPositive: true },
      color: "emerald" as const,
    },
    {
      label: "Risk Employees",
      value: intel.risk_employee_count,
      icon: ShieldAlert,
      trend: { value: 1.2, isPositive: false },
      color: "rose" as const,
    },
    {
      label: "Fraud Alerts",
      value: intel.fraud_alert_count,
      icon: AlertCircle,
      trend: { value: 0, isPositive: true },
      color: "amber" as const,
    },
    {
      label: "Active Intelligence",
      value: "Enabled",
      icon: Brain,
      color: "primary" as const,
    },
  ] : [];

  // Mock data for charts (would be from API in real scenario)
  const scatterData = [
    { x: 95, y: 4.8, name: "Ideal" },
    { x: 80, y: 4.2, name: "Good" },
    { x: 30, y: 2.1, name: "Risk" },
    { x: 55, y: 3.5, name: "Average" },
    { x: 90, y: 3.9, name: "Good" },
    { x: 20, y: 1.5, name: "Critical" },
    { x: 75, y: 4.5, name: "Good" },
  ];

  const fraudClusters = [
    { type: "IMPOSSIBLE_TRAVEL", count: 4, avg_severity: "HIGH" as const, description: "Speed anomalies exceeding 300km/h between check-ins." },
    { type: "REPEATED_LOCATION", count: 12, avg_severity: "MEDIUM" as const, description: "Multiple identical GPS coordinates detected (possible spoofing)." },
    { type: "DEVICE_SWITCH", count: 2, avg_severity: "LOW" as const, description: "Employees alternating between 3+ unique device IDs." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        icon={Shield}
        title="HR Intelligence Cockpit"
        subtitle="Global entity-wide risk signals, behavioral anomalies, and performance-integrity correlation."
        actions={
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all">
                <Filter className="w-4 h-4 text-primary" />
                Entity Filters
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Run AI Audit
             </button>
          </div>
        }
      />

      <DashboardKpiGrid cards={kpiStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <RiskTable employees={intel?.outliers || []} isLoading={isLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AttendancePerformanceChart 
              data={scatterData} 
              title="Attendance vs Performance" 
              subtitle="Corr: 0.84 (Strong Positive)"
            />
             <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-center text-center">
                 <Shield className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
                 <h4 className="text-white font-bold mb-2">Automated Risk Management</h4>
                 <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    The system has identified 4 high-risk patterns. AI recommends enabling enforced geofencing for the Sales department.
                 </p>
                 <button className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                    Enable Enforced Geofencing
                 </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <FraudHeatmap clusters={fraudClusters} />
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-3xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">AI Strategy Insight</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
               Retention risk is high for departments with declining attendance consistency. We noted a 12% correlation between "Declining Trend" and "At-Risk Reviews" in the last quarter.
            </p>
            <div className="mt-6 flex flex-col gap-2">
               <button className="w-full py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                  Generate retention Report
               </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
