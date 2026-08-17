import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  Target, 
  Zap, 
  TrendingUp, 
  Clock, 
  Brain,
  CheckCircle2,
  AlertCircle,
  Activity,
  Calendar,
  MapPin,
  Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { dashboardService } from "@/lib/dashboardService";
import { TrustScoreBadge } from "@/components/attendance/TrustScoreBadge";
import { BehaviorInsightsPanel } from "@/components/attendance/BehaviorInsightsPanel";
import type { EmployeeInsightData } from "@/lib/types";

const EMPTY_INSIGHTS: EmployeeInsightData = {
  trust_score: 0,
  trust_category: "MEDIUM",
  behavior: null,
  insights: [],
  avatar_url: null,
};

export default function EmployeeInsightPanel() {
  const { data: insights, isLoading, isError, error } = useQuery({
    queryKey: ["employee-insights"],
    queryFn: () => dashboardService.getEmployeeInsights(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="h-64 bg-white/5 rounded-3xl" />
           <div className="h-64 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  const data = insights ?? EMPTY_INSIGHTS;
  const observations = Array.isArray(data.insights) ? data.insights : [];
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Your employee profile is not linked yet, so personal insights cannot be loaded.";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        icon={Brain}
        title="Personal Growth & Insights"
        subtitle="Your real-time reliability score, behavioral trends, and AI-driven career insights."
      />

      {isError && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100 flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-300" />
          <div>
            <p className="font-bold text-white">Insights are not ready yet</p>
            <p className="mt-1 text-amber-100/80">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          {/* Trust Profile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/20 rounded-3xl p-8 text-center relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Shield className="w-32 h-32" />
             </div>
             
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-6">Trust Index</h4>
             <div className="flex justify-center mb-6">
                <TrustScoreBadge 
                  score={data.trust_score || 0} 
                  category={data.trust_category || "MEDIUM"} 
                />
             </div>
             <p className="text-3xl font-black text-white tracking-tighter mb-2">
                {Math.round(data.trust_score || 0)}%
             </p>
             <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                {isError
                  ? "Link an employee profile to unlock your personal trust index."
                  : "Your reliability rating among the top 15% of the organization."}
             </p>
          </motion.div>

          {/* AI Insights Panel */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
             <div className="flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">AI Observations</h4>
             </div>
             <div className="space-y-4">
                {observations.map((insight, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 text-sm text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    {insight}
                  </motion.div>
                ))}
                {observations.length === 0 && (
                   <p className="text-xs text-slate-500 italic text-center py-4">
                      {isError
                        ? "No personal insight data is available for this account yet."
                        : "Collecting more data to provide personal insights..."}
                   </p>
                )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <BehaviorInsightsPanel summary={data.behavior} />
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Daily Pattern */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Today's Activity
                 </h4>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-white font-medium">Auto-Check In</span>
                       </div>
                       <span className="text-[10px] font-mono text-slate-500 uppercase">09:12 AM</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        className="h-full bg-primary" 
                       />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                       Session active for 5h 42m. Next sync in 18 minutes.
                    </p>
                 </div>
              </div>

              {/* Login Intelligence */}
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    Security Detail
                 </h4>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                       <span className="text-[10px] text-slate-400 uppercase tracking-widest">Device</span>
                       <span className="text-xs text-white font-bold font-mono">MAC_7F:2E:11</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                       <span className="text-[10px] text-slate-400 uppercase tracking-widest">Location Mode</span>
                       <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-bold uppercase">Authorized</span>
                       </div>
                    </div>
                    <p className="text-[9px] text-slate-500 italic mt-2">
                       Your identity is verified via Face-Capture (Selfie Required: OFF)
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
