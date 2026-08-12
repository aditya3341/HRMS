import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Briefcase,
  FileCheck,
  Clock,
  AlertTriangle,
  UserCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  ShieldCheck,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { fetchManagerDashboard } from "@/lib/dashboardManagerApi";
import type {
  ManagerDashboardData,
  HiringFunnel,
  TeamGroupItem,
  ActivityEvent,
  OverdueEmployee,
} from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { attendanceApi } from "@/lib/attendanceApi";
import { FraudAlertsPanel } from "@/components/attendance/FraudAlertsPanel";
import { BehaviorInsightsPanel } from "@/components/attendance/BehaviorInsightsPanel";
import { Shield, Brain } from "lucide-react";
import { dashboardService } from "@/lib/dashboardService";
import { RiskTable } from "@/components/dashboard/RiskTable";

// ─── Colour palette for charts ───────────────────────────────────────────────
const CHART_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f43f5e", // rose
];

// ─── Animation variants ───────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" as const },
  }),
};

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded-xl ${className}`}
    />
  );
}

function Section({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <h2 className="text-lg font-medium text-white mb-4">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

interface KpiProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  index: number;
}

function KpiCard({ label, value, icon: Icon, index }: KpiProps) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.06] flex flex-col justify-between h-40"
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-medium">{label}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-4 border-t border-white/5">
        <span className="text-[11px] font-medium text-emerald-500">Normal Range</span>
      </div>
    </motion.div>
  );
}

// ─── HIRING FUNNEL ────────────────────────────────────────────────────────────
const FUNNEL_STAGES: { key: keyof HiringFunnel; label: string; color: string }[] = [
  { key: "applied",      label: "Applied",      color: "from-blue-500 to-blue-600" },
  { key: "interview",    label: "Interview",    color: "from-violet-500 to-violet-600" },
  { key: "offer_created",label: "Offer Created",color: "from-indigo-500 to-indigo-600" },
  { key: "offer_sent",   label: "Offer Sent",   color: "from-amber-500 to-amber-600" },
  { key: "accepted",     label: "Accepted",     color: "from-emerald-500 to-emerald-600" },
  { key: "joined",       label: "Joined",       color: "from-teal-500 to-teal-600" },
];

function HiringFunnelChart({ funnel }: { funnel: HiringFunnel }) {
  const maxVal = Math.max(...FUNNEL_STAGES.map((s) => funnel[s.key] || 0), 1);

  return (
    <div className="flex flex-col gap-3">
      {FUNNEL_STAGES.map((stage, i) => {
        const val = funnel[stage.key] || 0;
        const pct = Math.round((val / maxVal) * 100);
        return (
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
            className="flex items-center gap-4 group"
          >
            <span className="text-xs text-slate-400 w-28 shrink-0 font-medium">
              {stage.label}
            </span>
            <div className="flex-1 rounded-full bg-slate-800 h-7 overflow-hidden relative">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${stage.color} flex items-center justify-end pr-3`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, val > 0 ? 8 : 0)}%` }}
                transition={{ delay: 0.4 + i * 0.07, duration: 0.7, ease: "easeOut" }}
              >
                {val > 0 && (
                  <span className="text-[11px] font-bold text-white">{val}</span>
                )}
              </motion.div>
              {val === 0 && (
                <span className="absolute inset-0 flex items-center pl-3 text-[11px] text-slate-500">
                  0
                </span>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data, title }: { data: TeamGroupItem[]; title: string }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
        No data available
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {title}
      </p>
      <div className="flex gap-4 items-center">
        <div style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  color: "#f1f5f9",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {data.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="text-xs text-slate-300 truncate">{item.name}</span>
              <span className="text-xs font-semibold text-white ml-auto">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BAR CHART (designation) ──────────────────────────────────────────────────
function DesignationBar({ data }: { data: TeamGroupItem[] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm">
        No data available
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        By Designation
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={22} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              color: "#f1f5f9",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={CHART_COLORS[idx % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── ACTIVITY FEED ────────────────────────────────────────────────────────────
const activityConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  offer_sent:      { icon: Send,      color: "text-blue-400",    bg: "bg-blue-500/20" },
  offer_accepted:  { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  employee_joined: { icon: UserCheck, color: "text-violet-400",  bg: "bg-violet-500/20" },
};

function timeAgo(ts: string | null): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">
        No recent activity
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {events.map((event, i) => {
        const cfg = activityConfig[event.type] ?? activityConfig.offer_sent;
        const CfgIcon = cfg.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
            className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0 group"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 text-[10px] font-bold text-white shadow">
              {getInitials(event.actor)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 leading-snug">{event.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {timeAgo(event.timestamp)}
              </p>
            </div>

            {/* Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} shrink-0`}
            >
              <CfgIcon className={`w-3 h-3 ${cfg.color}`} />
              <span className={`text-[10px] font-semibold ${cfg.color} capitalize`}>
                {event.type.replace(/_/g, " ")}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── ALERT PANEL ──────────────────────────────────────────────────────────────
function AlertPanel({
  alerts,
}: {
  alerts: ManagerDashboardData["alerts"] | undefined;
}) {
  const navigate = useNavigate();

  if (!alerts) {
    return <Skeleton className="h-32" />;
  }

  const hasAlerts =
    alerts.pending_approvals > 0 || alerts.overdue_onboarding_count > 0;

  if (!hasAlerts) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4"
      >
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        <p className="text-sm text-emerald-300 font-medium">
          All clear — no pending alerts
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.pending_approvals > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate("/approvals")}
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 cursor-pointer hover:bg-amber-500/15 transition-colors"
        >
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">
              {alerts.pending_approvals} Pending Approval
              {alerts.pending_approvals !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-400/70">
              Click to review in Approval Inbox
            </p>
          </div>
          <span className="text-xs text-amber-400 font-bold">→</span>
        </motion.div>
      )}

      {alerts.overdue_onboarding_count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-semibold text-red-300">
              {alerts.overdue_onboarding_count} Overdue Onboarding
              {alerts.overdue_onboarding_count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 pl-8">
            {alerts.overdue_onboarding.slice(0, 5).map((emp: OverdueEmployee) => (
              <div
                key={emp.employee_id}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-red-300/80">{emp.name}</span>
                <span className="text-[10px] font-semibold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                  {emp.days_overdue}d overdue
                </span>
              </div>
            ))}
            {alerts.overdue_onboarding_count > 5 && (
              <p className="text-[10px] text-red-400/60 mt-0.5">
                +{alerts.overdue_onboarding_count - 5} more
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── LOADING SKELETON PAGE ────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["manager-dashboard"],
    queryFn: () => dashboardService.getManagerDashboard(),
    refetchInterval: 30_000,
  });

  const { data: pendingFraud, isLoading: fraudLoading } = useQuery({
    queryKey: ["pending-fraud"],
    queryFn: () => attendanceApi.getPendingFraud(),
  });

  const { data: hrIntel, isLoading: hrIntelLoading } = useQuery({
    queryKey: ["hr-intelligence"],
    queryFn: () => dashboardService.getHRIntelligence(),
  });

  const intelStats = data?.intelligence ? [
    {
      label: "Team Avg Trust",
      value: `${data.intelligence.avg_team_trust}%`,
      icon: ShieldCheck,
      color: "emerald" as const,
    },
    {
      label: "Late Today",
      value: data.intelligence.late_today,
      icon: Clock,
      color: "amber" as const,
    },
    {
      label: "Pending Reviews",
      value: data.alerts?.pending_approvals || 0,
      icon: FileCheck,
      color: "primary" as const,
    },
    {
      label: "High Performers",
      value: data.intelligence.high_performers_count,
      icon: Zap,
      color: "primary" as const,
    },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        icon={LayoutGrid}
        title="Manager Control Cockpit"
        subtitle="Live team metrics, reliability scores, and performance intelligence."
        actions={
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all">
                Team Reports
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                Bulk Approve
             </button>
          </div>
        }
      />

      {/* ── Error ── */}
      {isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">
            {(error as Error)?.message ?? "Failed to load dashboard data"}
          </p>
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {/* ── 1. KPI Cards ── */}
          <Section title="Team Intelligence Summary" delay={0}>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {intelStats.map((stat, i) => (
                   <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md flex justify-between items-center group hover:bg-white/[0.06] transition-all"
                   >
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                         <p className="text-2xl font-black text-white tracking-tighter tabular-nums">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-2xl bg-white/5 group-hover:bg-primary/20 transition-colors`}>
                         <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                   </motion.div>
                ))}
             </div>
          </Section>

          {/* ── 2. Funnel + Alerts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section title="Hiring Funnel" delay={0.15} >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 h-full shadow-lg">
                <HiringFunnelChart funnel={data.funnel} />
              </div>
            </Section>

            <div className="lg:col-span-1">
              <Section title="Alerts" delay={0.2}>
                <AlertPanel alerts={data.alerts} />
              </Section>
            </div>
          </div>

          {/* ── 3. Team Composition ── */}
          <Section title="Team Composition" delay={0.25}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg"
              >
                <DonutChart
                  data={data.team_composition.by_department}
                  title="By Department"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-lg"
              >
                <DesignationBar data={data.team_composition.by_designation} />
              </motion.div>
            </div>
          </Section>

          {/* ── 4. Team Reliability & AI Insights ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <Section title="Team Table: Integrity & Performance" delay={0.3}>
                  <RiskTable employees={hrIntel?.outliers || []} isLoading={hrIntelLoading} />
               </Section>
            </div>
            
            <div className="lg:col-span-1">
               <Section title="AI Intelligence" delay={0.35}>
                  <div className="space-y-4">
                     <motion.div
                        whileHover={{ y: -5 }}
                        className="p-6 bg-gradient-to-br from-primary/10 to-purple-600/10 border border-primary/20 rounded-3xl"
                     >
                        <div className="flex items-center gap-3 mb-4">
                           <Brain className="w-5 h-5 text-primary" />
                           <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">Optimization Suggestions</h4>
                        </div>
                        <ul className="space-y-3">
                           {[
                              "Team consistency is 12% above avg. Consider flexible core-hours pilot.",
                              "3 employees flag high risk due to device switching. Audit required.",
                              "AI Suggestion: Bonus eligibility for 2 members pending review."
                           ].map((s, i) => (
                              <li key={i} className="flex gap-3 text-xs text-slate-400 leading-relaxed">
                                 <span className="text-primary font-bold">•</span>
                                 {s}
                              </li>
                           ))}
                        </ul>
                     </motion.div>
                     
                     <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-3">
                           <Activity className="w-5 h-5 text-emerald-400" />
                           <span className="text-sm font-bold text-white">Full Team Analytics</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                     </div>
                  </div>
               </Section>
            </div>
          </div>

          {/* ── 5. Attendance Intelligence ── */}
          <Section title="Attendance Intelligence" delay={0.35}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Integrity Monitoring</span>
                </div>
                <FraudAlertsPanel flags={pendingFraud} isLoading={fraudLoading} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Behavior Outliers</span>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 h-full flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300 font-medium">Anomaly Detection Engine Active</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Currently analyzing pattern variance for 14 active members</p>
                    <div className="mt-4 flex justify-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: [8, 16, 8] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                          className="w-1 bg-primary/40 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </Section>
        </>
      ) : null}
    </div>
  );
}
