import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { employeeApi } from "@/lib/employeeApi";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  Search, 
  Filter, 
  ArrowRight,
  Mail,
  UserCheck,
  Briefcase,
  X,
  Check,
  UserPlus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { CreateEmployeeModal } from "@/components/employees/CreateEmployeeModal";

const statusColors: Record<string, string> = {
  active:      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  onboarding:  "bg-amber-500/10  text-amber-500  border-amber-500/20",
  inactive:    "bg-slate-500/10   text-slate-500   border-slate-500/20",
  terminated:  "bg-red-500/10    text-red-500    border-red-500/20",
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name.split(" ").filter(Boolean).map(n => n[0]).join("").substring(0, 2).toUpperCase();
};

const STATUS_OPTIONS = ["All", "Active", "Onboarding", "Inactive", "Terminated"];

export function Employees() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canManageEmployees = hasRole(["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]);

  const { data: employees, isLoading, isError } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getEmployees,
  });

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    
    return employees.filter((emp: any) => {
      const matchesSearch = 
        emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_code?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "All" || 
        emp.status?.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-white/5 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-white/5 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Failed to load directory</h2>
        <p className="text-slate-500 max-w-sm">There was an issue connecting to the employee database. Please try again later.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader 
        icon={Users}
        title="Employee Directory"
        subtitle={`Viewing ${filteredEmployees.length} registered employees across all departments.`}
        actions={
          canManageEmployees ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all text-sm font-bold active:scale-95 shadow-lg shadow-primary/20"
            >
              <UserPlus className="w-4 h-4" />
              Add Employee
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative group flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees..." 
            className="w-full pl-12 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${statusFilter !== "All" ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
              <Filter className="w-4 h-4" />
              <span>{statusFilter === "All" ? "All Status" : statusFilter}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-white/10 p-2 rounded-xl">
            <DropdownMenuLabel className="text-[10px] font-bold text-slate-500 px-2 py-1.5 uppercase tracking-wider">Status</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {STATUS_OPTIONS.map((status) => (
              <DropdownMenuItem 
                key={status}
                onClick={() => setStatusFilter(status)}
                className="flex items-center justify-between rounded-lg px-2 py-2 mt-1 cursor-pointer focus:bg-white/10 focus:text-white"
              >
                <span className="text-sm">{status}</span>
                {statusFilter === status && <Check className="w-3.5 h-3.5" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        <AnimatePresence mode="popLayout">
          {filteredEmployees.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center"
            >
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Users className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-white font-medium text-lg">No matches found</p>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters.</p>
              <button 
                onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
                className="mt-6 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Clear all filters
              </button>
            </motion.div>
          ) : (
            filteredEmployees.map((emp: any, i: number) => (
              <motion.div
                key={emp.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i < 15 ? i * 0.05 : 0 }}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="group relative cursor-pointer bg-white/[0.04] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.06] hover:border-white/20"
              >
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center font-bold text-lg text-slate-400 group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden shrink-0">
                      {emp.avatar_url ? (
                        <img 
                          src={emp.avatar_url} 
                          alt={emp.full_name} 
                          className={emp.avatar_url === "/zipaworld_logo_light.png" 
                            ? "w-full h-full object-contain p-2" 
                            : "w-full h-full object-cover"} 
                        />
                      ) : (
                        getInitials(emp.full_name)
                      )}
                    </div>
                    
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border ${statusColors[emp.status?.toLowerCase()] || statusColors.inactive}`}>
                      {emp.status}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                      {emp.full_name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-slate-400 text-xs">
                      <Briefcase size={12} className="text-primary/70" />
                      <span>{emp.designation || "Team Member"}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      <Mail size={12} />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      <UserCheck size={12} />
                      <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{emp.employee_code}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                    VIEW PROFILE <ArrowRight size={12} />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <CreateEmployeeModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}
