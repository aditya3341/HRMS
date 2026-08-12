import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, History, Plus, Info, Inbox, LayoutGrid, Users, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import BalanceCard from "@/components/leave/BalanceCard";
import LeaveHistory from "@/components/leave/LeaveHistory";
import LeaveFormModal from "@/components/leave/LeaveFormModal";
import TeamLeaveCalendar from "@/components/leave/TeamLeaveCalendar";
import { useLeaveBalances, useMyLeaves } from "@/hooks/useLeaves";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";

export default function LeaveDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isManager = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER"].includes(user?.role?.toUpperCase() ?? "");

  const { data: balances, isLoading: isLoadingBalances } = useLeaveBalances();
  const { data: leaves, isLoading: isLoadingLeaves } = useMyLeaves();

  const upcomingLeaves = leaves?.filter(l =>
    (l.status === "APPROVED" || l.status === "PENDING") &&
    new Date(l.start_date) >= new Date()
  ) || [];

  const pastLeaves = leaves?.filter(l =>
    l.status === "REJECTED" ||
    l.status === "CANCELLED" ||
    (l.status === "APPROVED" && new Date(l.start_date) < new Date())
  ) || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your time off, view balances, and track leave history.
          </p>
        </div>
        <div className="flex gap-4">
          {isManager && (
            <Button
              variant="outline"
              onClick={() => navigate("/leave/analytics")}
              className="rounded-2xl h-12 px-6 border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              View Analytics
            </Button>
          )}
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Apply Leave
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my-leaves" className="space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="my-leaves" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg text-[10px] font-black uppercase tracking-widest px-4 h-8 transition-all">
              My Leaves
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="team-calendar" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg text-[10px] font-black uppercase tracking-widest px-4 h-8 transition-all">
                <Users className="w-3 h-3 mr-2" />
                Team Calendar
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="my-leaves" className="space-y-8 mt-0 outline-none">
          {/* Balance Grid */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold opacity-70 uppercase tracking-wider">
              <Info className="w-4 h-4" />
              Leave Balances
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoadingBalances ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4 animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 bg-white/5" />
                        <Skeleton className="h-8 w-12 bg-white/5" />
                      </div>
                      <Skeleton className="h-8 w-8 rounded-lg bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-2 w-10 bg-white/5" />
                        <Skeleton className="h-2 w-10 bg-white/5" />
                      </div>
                      <Skeleton className="h-2 w-full bg-white/5" />
                    </div>
                  </div>
                ))
              ) : (
                balances?.map((balance) => (
                  <BalanceCard key={balance.id} balance={balance} />
                ))
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Upcoming & History */}
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold opacity-70 uppercase tracking-widest text-primary">
                    <CalendarIcon className="w-4 h-4" />
                    Upcoming Leaves
                  </div>
                  {upcomingLeaves.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {upcomingLeaves.length} SCHEDULED
                    </span>
                  )}
                </div>
                {isLoadingLeaves ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                  </div>
                ) : (
                  <LeaveHistory leaves={upcomingLeaves} />
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-6 text-sm font-bold opacity-70 uppercase tracking-widest">
                  <History className="w-4 h-4" />
                  Recent Activity
                </div>
                {isLoadingLeaves ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                    <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
                  </div>
                ) : (
                  <LeaveHistory leaves={pastLeaves} />
                )}
              </section>
            </div>

            {/* Right Column: Info / Calendar Summary */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
                <h3 className="text-lg font-bold mb-4">Policy Quick Links</h3>
                <ul className="space-y-3">
                  {["Leave Policy 2024", "Holiday Calendar", "Holiday List"].map((link) => (
                    <li key={link}>
                      <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                          {link}
                        </span>
                        <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all rotate-45" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Important Note</h4>
                </div>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                  All leaves must be applied at least 2 days in advance.
                  Emergency leaves require immediate manager approval.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {isManager && (
          <TabsContent value="team-calendar" className="mt-0 outline-none">
            <TeamLeaveCalendar />
          </TabsContent>
        )}
      </Tabs>

      <LeaveFormModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}

// Internal icons needed
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
