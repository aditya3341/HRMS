import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2, XCircle, Clock, BarChart2,
  TrendingUp, AlertTriangle, Timer, Filter,
} from 'lucide-react';
import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { getApprovalAnalytics } from '@/lib/approvalApi';
import { ApprovalModule } from '@/lib/types';

// ─── Palette ─────────────────────────────────────────────────────────────────
const PIE_COLORS   = { PENDING: '#6366f1', APPROVED: '#10b981', REJECTED: '#ef4444', IGNORED: '#9ca3af' };
const MODULE_COLORS: Record<string, string> = {
  OFFER: '#6366f1', ONBOARDING: '#10b981', EMPLOYEE: '#f59e0b', LEAVE: '#3b82f6', EXPENSE: '#ec4899',
};
const LINE_COLOR = '#6366f1';
const GRID_COLOR = 'rgba(156,163,175,0.15)';

// ─── Types ────────────────────────────────────────────────────────────────────
type DateRange = '7d' | '30d' | '90d' | 'all';
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cardVariant(idx: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { delay: idx * 0.07 } },
  };
}

const DATE_RANGE_DAYS: Record<DateRange, number | null> = {
  '7d': 7, '30d': 30, '90d': 90, all: null,
};

// ─── Sub-components ───────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  idx: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon, color, idx }) => (
  <motion.div
    variants={cardVariant(idx)}
    initial="initial"
    animate="animate"
    className="bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-start gap-4"
  >
    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

interface SectionCardProps { title: string; children: React.ReactNode; className?: string }
const SectionCard: React.FC<SectionCardProps> = ({ title, children, className = '' }) => (
  <div className={`bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 ${className}`}>
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-5">{title}</h3>
    {children}
  </div>
);

// Custom dark-mode–aware recharts tooltip
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-xl px-3 py-2 shadow-xl space-y-1">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color ?? '#fff' }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ApprovalAnalytics: React.FC = () => {
  const [dateRange, setDateRange]     = useState<DateRange>('30d');
  const [moduleFilter, setModuleFilter] = useState<ApprovalModule | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['approvalAnalytics', dateRange, moduleFilter, statusFilter],
    queryFn: () => getApprovalAnalytics({
      days: DATE_RANGE_DAYS[dateRange],
      module: moduleFilter,
      status: statusFilter
    }),
  });

  const pct = (n: number, total: number) => total === 0 ? '—' : `${Math.round(n / total * 100)}%`;

  // Provide defaults if API is loading/null
  const total = kpis?.total || 0;
  const pending = kpis?.pending || 0;
  const approved = kpis?.approved || 0;
  const rejected = kpis?.rejected || 0;

  // Timelines and Charts mapping exactly to backend keys
  const timelineData = (kpis?.approvals_over_time || []).map((t: any) => ({
    date: format(parseISO(t.date), 'MMM d'),
    Pending: t.pending,
    Approved: t.approved,
    Rejected: t.rejected
  }));

  const moduleData = (kpis?.approvals_by_module || []).map((m: any) => ({
    name: m.module,
    count: m.count
  }));

  const rawPie = kpis?.status_distribution || [];
  const pieData = rawPie.length > 0
    ? rawPie.map((s: any) => ({ name: s.status, value: s.count }))
    : [];

  const allModules: string[] = ['OFFER', 'ONBOARDING', 'EMPLOYEE', 'LEAVE', 'EXPENSE'];

  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-8 w-56 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-pink-500 dark:text-pink-400 flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-pink-500" />
            Approval Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Workflow performance and SLA insights
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Date range */}
          <div className="flex bg-gray-100 dark:bg-[#1A1C20] p-1 rounded-xl">
            {(['7d','30d','90d','all'] as DateRange[]).map(r => (
              <button key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  dateRange === r
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {r === 'all' ? 'All' : r}
              </button>
            ))}
          </div>

          {/* Module */}
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="ALL">All modules</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 text-xs font-medium bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard idx={0} label="Total Requests"   value={total}    icon={<BarChart2  className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50 dark:bg-indigo-900/30" />
        <KpiCard idx={1} label="Pending"          value={pending}  icon={<Clock      className="w-5 h-5 text-amber-500"  />} color="bg-amber-50  dark:bg-amber-900/30"  sub={`${pct(pending, total)} of total`} />
        <KpiCard idx={2} label="Approval Rate"    value={pct(approved, total)} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} color="bg-emerald-50 dark:bg-emerald-900/30" sub={`${approved} approved`} />
        <KpiCard idx={3} label="Rejection Rate"   value={pct(rejected, total)} icon={<XCircle     className="w-5 h-5 text-red-500"     />} color="bg-red-50    dark:bg-red-900/30"    sub={`${rejected} rejected`} />
      </div>

      {/* ── SLA Metrics Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div variants={cardVariant(4)} initial="initial" animate="animate"
          className="bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-5"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Timer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg Approval Time</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
              {kpis?.avg_approval_hours ? (kpis.avg_approval_hours < 24 ? `${kpis.avg_approval_hours}h` : `${(kpis.avg_approval_hours / 24).toFixed(1)}d`) : '—'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From request submitted to approved</p>
          </div>
        </motion.div>

        <motion.div variants={cardVariant(5)} initial="initial" animate="animate"
          className="bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex items-center gap-5"
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">SLA Breach Rate</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">{kpis?.sla_breach_percent ?? '—'}%</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{kpis?.sla_breached_count ?? 0} requests currently overdue</p>
          </div>
        </motion.div>
      </div>

      {/* ── Charts Row 1: Timeline (full width) ─────────────────────────────── */}
      <SectionCard title="Approvals Over Time">
        {timelineData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
            No data for selected filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData} margin={{ top: 4, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Approved" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Pending"  stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Rejected" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Charts Row 2: Bar + Pie ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Bar: By module */}
        <SectionCard title="Requests by Module" className="lg:col-span-3">
          {moduleData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={moduleData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Requests" radius={[6, 6, 0, 0]}>
                  {moduleData.map((entry, idx) => (
                    <Cell key={idx} fill={MODULE_COLORS[entry.name] ?? LINE_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Pie: Status distribution */}
        <SectionCard title="Status Distribution" className="lg:col-span-2">
          {pieData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">No data</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[d.name as keyof typeof PIE_COLORS] ?? '#9ca3af' }} />
                    {d.name} <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Trend Insight ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.4 } }}
        className="flex items-center gap-3 px-5 py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl"
      >
        <TrendingUp className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          <span className="font-semibold">Insight: </span>
          {total === 0
            ? 'No approval data available for the selected period.'
            : (kpis?.sla_breached_count ?? 0) > 0
              ? `${kpis.sla_breached_count} request${kpis.sla_breached_count > 1 ? 's are' : ' is'} currently breaching SLA deadlines and may need escalation.`
              : `All active approvals are within SLA. Avg turnaround is ${kpis?.avg_approval_hours ? (kpis.avg_approval_hours < 24 ? `${kpis.avg_approval_hours}h` : `${(kpis.avg_approval_hours/24).toFixed(1)}d`) : '—'}.`}
        </p>
      </motion.div>

    </div>
  );
};

export default ApprovalAnalytics;
