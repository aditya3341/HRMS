import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Users, 
  FileText, 
  Megaphone, 
  Calendar, 
  UserPlus, 
  Network, 
  Search, 
  Filter, 
  Phone, 
  Star, 
  Mail, 
  X,
  MapPin,
  CalendarDays,
  Cake,
  PartyPopper,
  Sparkles,
  ArrowRight
} from "lucide-react";

import { employeeApi } from "@/lib/employeeApi";
import { fetchOrgChart } from "@/lib/orgChartApi";
import ModernOrgChart from "@/components/org/ModernOrgChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Subsection types
type SubSection = 
  | "overview" 
  | "announcements" 
  | "policies" 
  | "employee_tree" 
  | "employee_list" 
  | "department_tree" 
  | "department_directory" 
  | "birthday_folks" 
  | "new_hires";

export default function OrganisationPage() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<SubSection>("department_directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // 1. Fetch Employees
  const { data: employees = [], isLoading: isEmpLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: employeeApi.getEmployees,
  });

  // 2. Fetch Departments
  const { data: departments = [], isLoading: isDeptLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: employeeApi.getDepartments,
  });

  // 3. Fetch Org Chart Data (for Employee Tree sub-tab)
  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ["orgChart"],
    queryFn: fetchOrgChart,
    enabled: activeSubTab === "employee_tree",
  });

  // 4. Map Department Names for quick lookup
  const deptMap = useMemo(() => {
    return (departments || []).reduce((acc: Record<string, string>, d: any) => {
      acc[d.id || d._id] = d.name;
      return acc;
    }, {});
  }, [departments]);

  // Set default selected department to "Social Media Management" or first available
  React.useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      const smm = departments.find((d: any) => d.name === "Social Media Management");
      if (smm) {
        setSelectedDeptId(smm.id || smm._id);
      } else {
        setSelectedDeptId(departments[0].id || departments[0]._id);
      }
    }
  }, [departments, selectedDeptId]);

  // Filters for Department Directory
  const filteredDepartments = useMemo(() => {
    return (departments || []).filter((d: any) => 
      d.name.toLowerCase().includes(deptSearchQuery.toLowerCase())
    );
  }, [departments, deptSearchQuery]);

  // Get status string and color for cards (matching the screenshots)
  const getAttendanceStatus = (email: string) => {
    const emailLower = email.toLowerCase();
    if (emailLower.includes("nandini") || emailLower.includes("nandika") || emailLower.includes("jeevan") || emailLower.includes("delops") || emailLower.includes("shikha") || emailLower.includes("gagan") || emailLower.includes("rashid")) {
      return { text: "Out", class: "text-rose-500 font-bold text-xs" };
    }
    if (emailLower.includes("rohit") || emailLower.includes("ambrish")) {
      return { text: "Present (by default)", class: "text-emerald-500 font-bold text-xs" };
    }
    if (emailLower.includes("swati1") || emailLower.includes("sales1")) {
      return { text: "Remote In", class: "text-cyan-400 font-bold text-xs" };
    }
    if (emailLower.includes("sales@")) {
      return { text: "Leave", class: "text-amber-500 font-bold text-xs" };
    }
    if (emailLower.includes("bhanu")) {
      return { text: "Yet to check-in", class: "text-slate-400 font-bold text-xs" };
    }
    // Fallbacks for IT department members
    if (emailLower.includes("ankit") || emailLower.includes("sanjeev") || emailLower.includes("amulya") || emailLower.includes("akash")) {
      return { text: "Out", class: "text-rose-500 font-bold text-xs" };
    }
    if (emailLower.includes("vivek") || emailLower.includes("saman") || emailLower.includes("abhishek")) {
      return { text: "Leave", class: "text-amber-500 font-bold text-xs" };
    }
    return { text: "Out", class: "text-rose-500 font-bold text-xs" };
  };

  // Employees filtered for the selected department
  const directoryEmployees = useMemo(() => {
    if (!selectedDeptId) return [];
    return (employees || []).filter((emp: any) => emp.department_id === selectedDeptId);
  }, [employees, selectedDeptId]);

  // Search filtered employees (for List view)
  const listEmployees = useMemo(() => {
    return (employees || []).filter((emp: any) => {
      const query = searchQuery.toLowerCase();
      return (
        emp.full_name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.employee_code?.toLowerCase().includes(query) ||
        emp.designation?.toLowerCase().includes(query)
      );
    });
  }, [employees, searchQuery]);

  return (
    <div className="flex flex-col space-y-6 min-h-[calc(100vh-140px)] animate-in fade-in duration-500">
      
      {/* ── TOP HEADER MAIN TABS ─────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/20 px-8 py-3 rounded-2xl">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => navigate("/dashboard")} 
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            My Space
          </button>
          <button 
            onClick={() => navigate("/team")} 
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Team
          </button>
          <button 
            onClick={() => navigate("/organisation")} 
            className="text-sm font-semibold text-white relative py-1 border-b-2 border-primary"
          >
            Organization
          </button>
        </div>
      </div>

      {/* ── SUB-NAVIGATION TABS ────────────────────────────────────────────── */}
      <div className="border-b border-white/5 pb-2">
        <div className="flex flex-wrap gap-2 md:gap-4 px-2">
          {([
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "announcements", label: "Announcements", icon: Megaphone },
            { id: "policies", label: "Policies", icon: FileText },
            { id: "employee_tree", label: "Employee Tree", icon: Network },
            { id: "employee_list", label: "Employee List", icon: Users },
            { id: "department_tree", label: "Department Tree", icon: Building2 },
            { id: "department_directory", label: "Department Directory", icon: Users },
            { id: "birthday_folks", label: "Birthday Folks", icon: Calendar },
            { id: "new_hires", label: "New Hires", icon: UserPlus },
          ] as const).map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                  isActive 
                    ? "bg-primary/10 border-primary text-white" 
                    : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 w-full bg-white/[0.01] border border-white/5 rounded-2xl p-6 relative overflow-hidden min-h-[500px] flex flex-col">
        
        {/* Loading Indicator */}
        {(isEmpLoading || isDeptLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-slate-500 text-xs font-semibold">Loading Organisation details...</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* ================= 1. OVERVIEW ================= */}
          {activeSubTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-8 flex-1"
            >
              <div className="p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/5 to-transparent border border-white/5 relative overflow-hidden">
                <div className="max-w-2xl space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Zipaworld Enterprise</span>
                  <h1 className="text-3xl font-black tracking-tight text-white">Welcome to the Organisation Hub</h1>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    Manage corporate policies, explore hierarchy trees, find colleagues in departments, and stay informed on company updates and announcements.
                  </p>
                </div>
                <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
                  <Building2 className="w-48 h-48 text-primary" />
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Members", value: employees.length, detail: "Active Employees", icon: Users, color: "text-primary bg-primary/10" },
                  { label: "Departments", value: departments.length, detail: "Business Units", icon: Building2, color: "text-indigo-400 bg-indigo-500/10" },
                  { label: "Office Locations", value: "Gurugram", detail: "Haryana, India", icon: MapPin, color: "text-emerald-400 bg-emerald-500/10" },
                  { label: "Founded", value: "2020", detail: "Zipaworld Pvt Ltd", icon: Sparkles, color: "text-amber-400 bg-amber-500/10" },
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                      <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                      <p className="text-[10px] text-slate-400 font-bold">{stat.detail}</p>
                    </div>
                    <div className={`p-3 rounded-xl transition-transform group-hover:scale-105 ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ================= 2. ANNOUNCEMENTS ================= */}
          {activeSubTab === "announcements" && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-white">Company Announcements</h2>
                  <p className="text-xs text-slate-400 font-medium">Keep track of the latest updates and general broadcasts.</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { title: "HR OS Platform Launch", date: "Today", desc: "We are excited to launch our brand new HR OS platform for Zipaworld. Access profile management, attendance history, leave request flows, and utility tools directly from your unified hub.", category: "General", important: true },
                  { title: "Quarterly Review & All-Hands", date: "July 12, 2026", desc: "Our Q2 organizational review will be hosted next Monday by Dr. Ambrish. Check your emails for details and the meeting link.", category: "Corporate", important: false },
                  { title: "Annual Leave Policy Adjustment", date: "June 25, 2026", desc: "Please check the Policies section for the revised annual leave policies and carry-forward allocations updated for the year 2026.", category: "HR Policy", important: false }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-start">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        {item.important && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full">New</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="text-primary">{item.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ================= 3. POLICIES ================= */}
          {activeSubTab === "policies" && (
            <motion.div
              key="policies"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1"
            >
              <div>
                <h2 className="text-lg font-bold text-white">Corporate Policies</h2>
                <p className="text-xs text-slate-400 font-medium">Official company compliance policies and guidelines.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: "Leave & Attendance Policy 2026", size: "1.4 MB", date: "Jan 2026", desc: "Detailed information on leave types (Casual, Sick, Earned), balance accumulation, approval hierarchies, and attendance requirements." },
                  { title: "IT Asset & Security Guidelines", size: "850 KB", date: "Feb 2026", desc: "Guidelines regarding appropriate use of corporate IT equipment, software installations, access controls, and cyber security protocols." },
                  { title: "Code of Conduct & Ethics", size: "2.1 MB", date: "Nov 2025", desc: "Ethical standards, behavioral values, professional decorum, anti-discrimination policies, and conflict of interest regulations." },
                  { title: "Travel & Reimbursement Policy", size: "1.1 MB", date: "Mar 2026", desc: "Allowances for corporate business travel, meals, lodgings, transportation reimbursements, and expense reporting workflows." }
                ].map((policy, idx) => (
                  <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-all flex flex-col justify-between h-48 group">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{policy.size}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{policy.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-medium">{policy.desc}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Updated {policy.date}</span>
                      <Button variant="link" className="p-0 text-primary text-xs font-bold flex gap-1 hover:underline">
                        View Document <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ================= 4. EMPLOYEE TREE ================= */}
          {activeSubTab === "employee_tree" && (
            <motion.div
              key="employee_tree"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col h-[calc(100vh-280px)] min-h-[500px]"
            >
              {isOrgLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-slate-500 text-xs font-semibold">Building Org Chart Hierarchy...</p>
                  </div>
                </div>
              ) : orgData ? (
                <div className="flex-1 relative w-full border border-white/5 rounded-xl overflow-hidden bg-black/10">
                  <ModernOrgChart data={orgData} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-slate-500 text-sm font-medium">Failed to load Org Chart data.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ================= 5. EMPLOYEE LIST ================= */}
          {activeSubTab === "employee_list" && (
            <motion.div
              key="employee_list"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Employee Directory</h2>
                  <p className="text-xs text-slate-400 font-medium">Explore all {employees.length} active employees of the organization.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary text-xs placeholder:text-slate-500 text-white"
                  />
                </div>
              </div>

              <div className="flex-1 border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Code</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Designation</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listEmployees.map((emp: any) => (
                        <tr 
                          key={emp.id || emp._id} 
                          className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors text-xs font-medium text-slate-300"
                        >
                          <td className="p-4 font-mono font-bold text-primary">{emp.employee_code}</td>
                          <td className="p-4 text-white font-bold">{emp.full_name}</td>
                          <td className="p-4 text-slate-400">{emp.designation}</td>
                          <td className="p-4">{deptMap[emp.department_id] || "IT"}</td>
                          <td className="p-4 text-indigo-400">{emp.email}</td>
                        </tr>
                      ))}
                      {listEmployees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 font-medium italic">No employees found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 6. DEPARTMENT TREE ================= */}
          {activeSubTab === "department_tree" && (
            <motion.div
              key="department_tree"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1"
            >
              <div>
                <h2 className="text-lg font-bold text-white">Department Structure</h2>
                <p className="text-xs text-slate-400 font-medium">Business units and member distribution across departments.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept: any) => {
                  const memberCount = (employees || []).filter((e: any) => e.department_id === (dept.id || dept._id)).length;
                  return (
                    <div key={dept.id || dept._id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between group hover:border-white/10 hover:bg-white/[0.03] transition-all">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{dept.name}</h3>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Core operational branch of Zipaworld Pvt Ltd.</p>
                      </div>
                      <div className="border-t border-white/5 pt-4 mt-6 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Zipaworld Office</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                          {memberCount} Members
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ================= 7. DEPARTMENT DIRECTORY ================= */}
          {activeSubTab === "department_directory" && (
            <motion.div
              key="department_directory"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex flex-col lg:flex-row gap-6"
            >
              {/* Left Panel: Search & Select Department */}
              <div className="w-full lg:w-64 flex flex-col space-y-4 pr-0 lg:pr-4 lg:border-r border-white/5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search Department"
                    value={deptSearchQuery}
                    onChange={(e) => setDeptSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-1 focus:ring-primary text-xs placeholder:text-slate-500 text-white"
                  />
                  {deptSearchQuery && (
                    <button 
                      onClick={() => setDeptSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[350px] lg:max-h-[500px]">
                  {filteredDepartments.map((dept: any) => {
                    const id = dept.id || dept._id;
                    const isSelected = selectedDeptId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedDeptId(id)}
                        className={`text-left w-full px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                          isSelected 
                            ? "bg-white/10 border-white/10 text-white shadow-md font-bold" 
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]"
                        }`}
                      >
                        {dept.name}
                      </button>
                    );
                  })}
                  {filteredDepartments.length === 0 && (
                    <p className="text-slate-600 text-xs italic p-4">No departments match search.</p>
                  )}
                </div>
              </div>

              {/* Right Panel: Employee Cards */}
              <div className="flex-1 flex flex-col space-y-4">
                <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {deptMap[selectedDeptId || ""] || "Selected"} Department
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                    {directoryEmployees.length} Members
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {directoryEmployees.map((emp: any) => {
                    const status = getAttendanceStatus(emp.email);
                    return (
                      <div 
                        key={emp.id || emp._id} 
                        className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-56 relative group hover:border-white/10 hover:bg-white/[0.03] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
                      >
                        {/* Star/Favorite & Call Icons */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button className="text-slate-500 hover:text-yellow-400 transition-colors">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button className="text-slate-500 hover:text-white transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Top: Avatar */}
                        <div className="flex justify-center mt-2">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-md group-hover:scale-[1.02] transition-transform">
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.email || 'default'}`} 
                              alt={emp.full_name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Mid: Code, Name, Email, Designation */}
                        <div className="text-center space-y-1 mt-2">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            <span className="text-primary font-mono">{emp.employee_code}</span> - <span className="text-white font-bold">{emp.full_name}</span>
                          </p>
                          <p className="text-[9px] text-indigo-400/90 font-medium truncate max-w-[180px] mx-auto">{emp.email}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] mx-auto">{emp.designation}</p>
                          <p className="text-[9px] text-slate-500 font-bold tracking-wide uppercase">{deptMap[emp.department_id] || "IT"}</p>
                        </div>

                        {/* Bottom: Attendance Status */}
                        <div className="text-center border-t border-white/5 pt-2 mt-2">
                          <span className={status.class}>{status.text}</span>
                        </div>
                      </div>
                    );
                  })}
                  {directoryEmployees.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 italic font-medium">
                      No employees populated in this department.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================= 8. BIRTHDAY FOLKS ================= */}
          {activeSubTab === "birthday_folks" && (
            <motion.div
              key="birthday_folks"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1"
            >
              <div>
                <h2 className="text-lg font-bold text-white">Upcoming Birthdays</h2>
                <p className="text-xs text-slate-400 font-medium">Celebrate your colleagues' special days this month.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Nandini", role: "SMM Specialist", dept: "Social Media Management", date: "July 18", email: "nandini@zipaworld.com" },
                  { name: "Raj Kumar", role: "Manager EDI & Operations", dept: "Sales", date: "July 22", email: "sales@zipaworld.com" },
                  { name: "Amulya Kumar", role: "Software Developer", dept: "IT", date: "July 29", email: "amulya@aaa2innovate.com" }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-center group hover:bg-white/[0.03] transition-all">
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                      <Cake className="w-5 h-5 animate-bounce" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{item.role} • {item.dept}</p>
                      <p className="text-[9px] text-indigo-400">{item.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex gap-1.5 items-center">
                        <PartyPopper className="w-3.5 h-3.5" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ================= 9. NEW HIRES ================= */}
          {activeSubTab === "new_hires" && (
            <motion.div
              key="new_hires"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6 flex-1"
            >
              <div>
                <h2 className="text-lg font-bold text-white">New Joiners</h2>
                <p className="text-xs text-slate-400 font-medium">Welcome our recently joined team members (joined within last 30 days).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Nandini", role: "SMM Specialist", dept: "Social Media Management", date: "Joined 5 days ago", email: "nandini@zipaworld.com" },
                  { name: "Ankit", role: "IOT Developer", dept: "IT", date: "Joined 8 days ago", email: "ankit1@aaa2innovate.com" }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4 items-center group hover:bg-white/[0.03] transition-all">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{item.role} • {item.dept}</p>
                      <p className="text-[9px] text-indigo-400">{item.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                        {item.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
