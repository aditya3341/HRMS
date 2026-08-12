import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActionCenterData } from '@/lib/actionCenterApi';
import ActionCard from '@/components/approvals/ActionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket, 
  UserPlus, 
  CheckCircle2, 
  Search, 
  Activity,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';

const ActionCenter = () => {
  const { data, isLoading } = useActionCenterData();
  const [activeTab, setActiveTab] = useState("all");

  const filteredPending = data?.pending?.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "offers") return item.module === "OFFER";
    if (activeTab === "onboarding") return item.module === "ONBOARDING";
    return true;
  }) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        icon={Zap}
        title="Action Center"
        subtitle="Manage pending approvals and strategic personnel decisions."
      />

      {/* KPI STRIP */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Total Pending" 
          value={data?.summary?.total_pending || 0} 
          icon={<LayoutGrid size={18} className="text-primary" />} 
          isLoading={isLoading}
        />
        <KPICard 
          title="Offers Pending" 
          value={data?.summary?.offers || 0} 
          icon={<Rocket size={18} className="text-primary" />} 
          isLoading={isLoading}
        />
        <KPICard 
          title="Onboarding Pending" 
          value={data?.summary?.onboarding || 0} 
          icon={<UserPlus size={18} className="text-primary" />} 
          isLoading={isLoading}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Main Content Area */}
        <div className="lg:col-span-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <Tabs defaultValue="all" onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-xl border border-white/10">
              <TabsList className="bg-transparent gap-1">
                <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">All</TabsTrigger>
                <TabsTrigger value="offers" className="rounded-lg px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Offers</TabsTrigger>
                <TabsTrigger value="onboarding" className="rounded-lg px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Onboarding</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search requests..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-600 text-white"
              />
            </div>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse" />
                ))
              ) : filteredPending.length > 0 ? (
                filteredPending.map((item) => (
                  <motion.div key={item.id} variants={itemVariants} layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                    <ActionCard item={item} />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key="empty"
                  className="col-span-full py-20 flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-white">Queue Clear</h3>
                  <p className="text-slate-500 text-sm">No pending approvals require attention.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Sidebar Activity Feed */}
        <div className="lg:col-span-4 lg:border-l lg:border-white/5 lg:pl-8">
          <div className="sticky top-10">
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-primary" />
              <h2 className="text-lg font-medium text-white">Recent Activity</h2>
            </div>

            <div className="space-y-6">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : data?.recent_activity?.map((activity, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={activity.id} 
                  className="flex gap-4 group"
                >
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-[10px] font-bold ${activity.action === "approved" ? "text-emerald-400" : "text-red-400"}`}>
                      {activity.name[0]?.toUpperCase() || 'S'}
                    </div>
                    {i !== data.recent_activity.length - 1 && <div className="w-px h-full bg-white/5 my-2" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        {activity.name} <span className={activity.action === "approved" ? "text-emerald-400" : "text-red-400"}>{activity.action}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        {activity.type} workflow
                      </p>
                      <span className="text-[10px] text-slate-600 font-medium">
                        {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KpiProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  isLoading: boolean;
}

const KPICard = ({ title, value, icon, isLoading }: KpiProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.06] flex flex-col justify-between h-40"
  >
    <div className="flex justify-between items-start">
      <div className="p-3 bg-primary/10 rounded-xl">
        {icon}
      </div>
      <div className="text-right">
        <p className="text-xs text-slate-400 font-medium">{title}</p>
        <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
      <span className="text-[11px] font-medium text-emerald-500">Live</span>
    </div>
  </motion.div>
);

export default ActionCenter;
