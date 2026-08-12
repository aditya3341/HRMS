import React from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Calendar, 
  ChevronRight, 
  Filter, 
  Info,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OverviewCards from "@/components/analytics/OverviewCards";
import LeaveTrendsChart from "@/components/analytics/LeaveTrendsChart";
import LeaveDistributionChart from "@/components/analytics/LeaveDistributionChart";
import DepartmentBarChart from "@/components/analytics/DepartmentBarChart";
import SmartInsights from "@/components/analytics/SmartInsights";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLeaveOverview,
  getLeaveTrends,
  getLeaveDistribution,
  getLeaveByDepartment,
  getLeaveInsights,
} from "@/lib/analyticsApi";

const LeaveAnalyticsPage: React.FC = () => {
  // Data Queries
  const overviewQuery = useQuery({ queryKey: ["leave-overview"], queryFn: getLeaveOverview });
  const trendsQuery = useQuery({ queryKey: ["leave-trends"], queryFn: getLeaveTrends });
  const distributionQuery = useQuery({ queryKey: ["leave-distribution"], queryFn: getLeaveDistribution });
  const departmentQuery = useQuery({ queryKey: ["leave-department"], queryFn: getLeaveByDepartment });
  const insightsQuery = useQuery({ queryKey: ["leave-insights"], queryFn: getLeaveInsights });

  const isAnyLoading = 
    overviewQuery.isLoading || 
    trendsQuery.isLoading || 
    distributionQuery.isLoading || 
    departmentQuery.isLoading || 
    insightsQuery.isLoading;

  const handleRefresh = () => {
    overviewQuery.refetch();
    trendsQuery.refetch();
    distributionQuery.refetch();
    departmentQuery.refetch();
    insightsQuery.refetch();
  };

  return (
    <div className="min-h-screen pb-12 space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          icon={BarChart3}
          title="Leave Analytics"
          subtitle="Advanced intelligence and workforce absence insights."
        />
        
        <div className="flex items-center gap-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-sm">
          <Select defaultValue="90d">
            <SelectTrigger className="w-[140px] border-none bg-transparent focus:ring-0">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last 1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60"
            onClick={handleRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
            <Filter size={16} />
            <span>Advanced Filters</span>
          </Button>
        </div>
      </div>

      {/* KPI OVERVIEW */}
      <OverviewCards data={overviewQuery.data} isLoading={overviewQuery.isLoading} />

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <LeaveTrendsChart data={trendsQuery.data} isLoading={trendsQuery.isLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <LeaveDistributionChart data={distributionQuery.data} isLoading={distributionQuery.isLoading} />
            <DepartmentBarChart data={departmentQuery.data} isLoading={departmentQuery.isLoading} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <SmartInsights data={insightsQuery.data} isLoading={insightsQuery.isLoading} />
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="flex items-center gap-2 p-4 rounded-xl bg-indigo-50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 text-sm">
        <Info size={16} />
        <p>Data is synced in real-time with the central employee management system. Last sync: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default LeaveAnalyticsPage;
