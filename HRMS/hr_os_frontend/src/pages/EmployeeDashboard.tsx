import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  LayoutDashboard,
  Palmtree,
  Calendar,
  Zap,
  ChevronRight,
  ShieldCheck,
  Search,
  Bell,
  Plus,
  Activity,
  Brain,
  LayoutGrid,
  Gift,
  UserPlus,
  CalendarCheck,
  DollarSign,
  Monitor,
  LifeBuoy,
  MessagesSquare,
  Inbox,
  BarChart3,
  Users,
  Network,
  Sparkles,
  Target,
  Settings,
  Clock,
  Info,
  Send,
  Building,
  Plane,
  FolderClosed,
  CheckSquare,
  Smile,
  FileText,
  Edit2,
  Trash2,
  Phone,
  Star
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// HOOKS & SERVICES
import { useDashboardAggregator } from "@/hooks/useDashboardAggregator";
import { useAuth } from "@/contexts/AuthContext";
import { useLeaveBalances } from "@/hooks/useLeaves";
import { useMyPayslips } from "@/hooks/usePayroll";
import { useTodaySummary, useAttendanceHistory, useAttendanceModeConfig } from "@/hooks/useAttendance";
import { attendanceApi } from "@/lib/attendanceApi";
import { employeeApi } from "@/lib/employeeApi";
import { getHolidays } from "@/lib/leaveApi";
import { toast } from "sonner";
import api from "@/lib/api";

// SHADCN COMPONENTS
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateEmployeeModal } from "@/components/employees/CreateEmployeeModal";
import ModernOrgChart from "@/components/org/ModernOrgChart";

interface FeedPost {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  timestamp: string;
  likes: number;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Dynamic Tab State
  const [activeTab, setActiveTab] = useState<"my-space" | "team" | "organization">("my-space");
  const [activeSubTab, setActiveSubTab] = useState<string>("overview");
  const [activeOverviewTab, setActiveOverviewTab] = useState<string>("activities");
  const [activeTeamTab, setActiveTeamTab] = useState<string>("wall");
  const [activeOrgTab, setActiveOrgTab] = useState<string>("services");

  // Selection states for directory/tree
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("07"); // Defaults to July

  // Refs and state for Department Tree visualization lines
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const deptRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const empRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [paths, setPaths] = useState<string[]>([]);

  // Edit Department / Role Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<any>(null);
  const [newDeptId, setNewDeptId] = useState("");
  const [newRole, setNewRole] = useState("");

  // Add Employee Modal State
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Local Post/Composer State for Department Wall
  const [postContent, setPostContent] = useState("");
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);

  // Fetch Dashboard Aggregated Data
  const { 
    profile, 
    pendingApprovals, 
    notifications, 
    loading: aggregatorLoading 
  } = useDashboardAggregator();
  
  // Fetch Directory & Lookup Data
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.getEmployees(),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => employeeApi.getDepartments(),
  });

  const { data: orgData } = useQuery({
    queryKey: ["orgChartData"],
    queryFn: async () => {
      const res: any = await api.get("/org-chart/");
      return res.data || res;
    }
  });

  const { data: leaves } = useLeaveBalances();
  const { data: todaySummary } = useTodaySummary();
  const { data: attendanceMode } = useAttendanceModeConfig();
  const { data: history } = useAttendanceHistory();
  
  const { data: holidays } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => getHolidays(new Date().getFullYear()),
  });

  // Check HR/Admin role
  const isHRorAdmin = useMemo(() => {
    const r = (user?.role || "").toUpperCase();
    return ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "HR"].includes(r);
  }, [user]);

  // Check-In and Check-Out Mutations
  const checkInMutation = useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today-summary"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-recent"] });
      toast.success("Checked in successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to check in");
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: () => attendanceApi.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today-summary"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-recent"] });
      toast.success("Checked out successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to check out");
    }
  });

  // Update employee department/role mutation
  const updateEmpMutation = useMutation({
    mutationFn: async (payload: { userId: string; department_id: string; role: string }) => {
      // 1. Update department
      await api.patch(`/admin/users/${payload.userId}/department`, { department_id: payload.department_id });
      // 2. Update role
      await api.patch(`/admin/users/${payload.userId}/role`, { role: payload.role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["orgChartData"] });
      setIsEditOpen(false);
      toast.success("Employee details updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update employee details.");
    }
  });

  // Real-time Check-in Elapsed Session Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (todaySummary?.first_check_in && !todaySummary?.last_check_out) {
      const startTime = new Date(todaySummary.first_check_in).getTime();
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((now - startTime) / 1000));
        setElapsedSeconds(diff);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else if (todaySummary?.first_check_in && todaySummary?.last_check_out) {
      const start = new Date(todaySummary.first_check_in).getTime();
      const end = new Date(todaySummary.last_check_out).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((end - start) / 1000)));
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [todaySummary]);

  const formattedTimer = useMemo(() => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    return `${String(hrs).padStart(2, "0")} : ${String(mins).padStart(2, "0")} : ${String(secs).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Sync / seed Department Wall posts on mount
  useEffect(() => {
    const saved = localStorage.getItem("dept_wall_feeds");
    if (saved) {
      setFeedPosts(JSON.parse(saved));
    } else {
      const initial = [
        {
          id: "1",
          authorName: "Reet",
          authorEmail: "reet@zipaworld.com",
          content: "Welcome Harjas Singh to the legal team! Excited to have you onboard.",
          timestamp: format(subDays(new Date(), 1), "dd MMM yyyy, hh:mm a"),
          likes: 5
        },
        {
          id: "2",
          authorName: "Sanjeev",
          authorEmail: "sanjeev@company.com",
          content: "Reminder: The quarterly roadmap sync is scheduled for this Friday at 3:00 PM. Please ensure your KPIs are updated.",
          timestamp: format(subDays(new Date(), 2), "dd MMM yyyy, hh:mm a"),
          likes: 12
        }
      ];
      setFeedPosts(initial);
      localStorage.setItem("dept_wall_feeds", JSON.stringify(initial));
    }
  }, []);

  // Post message to department
  const handlePostMessage = () => {
    if (!postContent.trim()) return;
    const authorName = user?.email?.split("@")[0].replace(".", " ") || "User";
    const cleanAuthor = authorName.charAt(0).toUpperCase() + authorName.slice(1);
    
    const newPost: FeedPost = {
      id: String(Date.now()),
      authorName: cleanAuthor,
      authorEmail: user?.email || "",
      content: postContent.trim(),
      timestamp: format(new Date(), "dd MMM yyyy, hh:mm a"),
      likes: 0
    };

    const updated = [newPost, ...feedPosts];
    setFeedPosts(updated);
    localStorage.setItem("dept_wall_feeds", JSON.stringify(updated));
    setPostContent("");
    toast.success("Post shared successfully on the Department Wall!");
  };

  // Helper: Get user's first name capitalization
  const displayName = useMemo(() => {
    if (!user?.email) return "User";
    const namePart = user.email.split("@")[0].split(".")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }, [user]);

  // Helper: Filter new hires (joined within last 30 days, or slice last 3)
  const newHires = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return employees.slice(-3).reverse();
  }, [employees]);

  // Helper: Calculate dynamic week array for the timeline
  const weekDays = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    return Array.from({ length: 7 }).map((_, i) => {
      const dateObj = addDays(start, i);
      const formattedDate = format(dateObj, "yyyy-MM-dd");
      const dayName = format(dateObj, "EEE");
      const dayNum = format(dateObj, "dd");
      const isToday = format(today, "yyyy-MM-dd") === formattedDate;
      const isWeekend = i === 0 || i === 6;
      
      const log = (history || []).find((h: any) => h.date === formattedDate);

      return {
        date: dateObj,
        formattedDate,
        dayName,
        dayNum,
        isToday,
        isWeekend,
        log
      };
    });
  }, [history]);

  // Statistics summaries for Team Space
  const teamStats = useMemo(() => {
    const totalStrength = employees?.length || 22;
    const yetToCheckIn = Math.max(1, Math.round(totalStrength * 0.22));
    const out = totalStrength - yetToCheckIn;
    return { totalStrength, yetToCheckIn, out };
  }, [employees]);

  // Dynamic lists and departments counts
  const processedDepartments = useMemo(() => {
    const list = departments || [];
    const emps = employees || [];
    return list.map((d: any) => {
      const count = emps.filter((e: any) => e.department === d.name || e.department_id === d.id).length;
      return {
        ...d,
        name: d.name,
        count
      };
    });
  }, [departments, employees]);

  // Current active department for list/directory search
  const activeDept = useMemo(() => {
    if (!departments) return null;
    let deptDoc = null;
    if (selectedDeptId) {
      deptDoc = departments.find((d: any) => d.id === selectedDeptId) || departments[0];
    } else {
      deptDoc = departments[0];
    }
    if (!deptDoc) return null;
    return {
      ...deptDoc,
      name: deptDoc.name
    };
  }, [departments, selectedDeptId]);

  // Filter employees for the active department in directory
  const filteredDeptEmployees = useMemo(() => {
    const emps = employees || [];
    const dept = activeDept;
    if (!dept) return [];
    return emps.filter((e: any) => e.department === dept.name || e.department_id === dept.id);
  }, [employees, activeDept]);

  // Filtered list of departments matching search
  const searchedDepts = useMemo(() => {
    const list = processedDepartments || [];
    if (!deptSearchQuery.trim()) return list;
    return list.filter((d: any) => d.name.toLowerCase().includes(deptSearchQuery.toLowerCase()));
  }, [processedDepartments, deptSearchQuery]);

  // Recalculate Department Tree connector lines
  const recalculatePaths = () => {
    if (!treeContainerRef.current) return;
    const containerRect = treeContainerRef.current.getBoundingClientRect();
    const activeId = selectedDeptId || departments?.[0]?.id;
    if (!activeId) return;

    const deptEl = deptRefs.current[activeId];
    if (!deptEl) return;

    const deptRect = deptEl.getBoundingClientRect();
    const startX = deptRect.right - containerRect.left;
    const startY = deptRect.top + deptRect.height / 2 - containerRect.top;

    const newPaths: string[] = [];
    filteredDeptEmployees.forEach((emp: any, index: number) => {
      // Check if grid has 2 columns (breakpoint sm is 640px)
      const isTwoCol = window.innerWidth >= 640;
      const shouldConnect = !isTwoCol || index % 2 === 0;
      if (!shouldConnect) return;

      const empEl = empRefs.current[emp.id];
      if (empEl) {
        const empRect = empEl.getBoundingClientRect();
        const endX = empRect.left - containerRect.left;
        const endY = empRect.top + empRect.height / 2 - containerRect.top;

        // Draw dynamic orthogonal line: H to midX, V to endY, H to endX
        const midX = endX - 20;
        const path = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
        newPaths.push(path);
      }
    });

    setPaths(newPaths);
  };

  useEffect(() => {
    if (activeSubTab === "department-tree") {
      const timer1 = setTimeout(recalculatePaths, 50);
      const timer2 = setTimeout(recalculatePaths, 300);
      const timer3 = setTimeout(recalculatePaths, 1000);

      window.addEventListener("resize", recalculatePaths);
      window.addEventListener("scroll", recalculatePaths, true);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        window.removeEventListener("resize", recalculatePaths);
        window.removeEventListener("scroll", recalculatePaths, true);
      };
    }
  }, [activeSubTab, selectedDeptId, filteredDeptEmployees]);

  // Mock birthdays based on selected month (July defaults)
  const mockBirthdays = useMemo(() => {
    if (selectedMonth !== "07") return [];
    return [
      { id: "1", name: "Akash", code: "AAA2_265", email: "akash1@aaa2innovate.com", designation: "Lead Backend Developer", department: "IT", date: "1 Jul" },
      { id: "2", name: "Jeewan", code: "ZW_040", email: "delops1@zipaworld.com", designation: "Assistant Manager (Domestic)", department: "Operation", date: "5 Jul" },
      { id: "3", name: "Shruti", code: "ZW_084", email: "accounts4@zipaworld.com", designation: "Account Executive", department: "Finance", date: "20 Jul" }
    ];
  }, [selectedMonth]);

  // Trigger editing details of target employee
  const handleStartEdit = (emp: any) => {
    if (!isHRorAdmin) return;
    
    // Resolve user ID
    api.get(`/employees/${emp.id}`).then((res: any) => {
      if (res && res.success) {
        setTargetEmployee(emp);
        setNewDeptId(emp.department_id || "");
        setNewRole(res.data?.role || "EMPLOYEE");
        setIsEditOpen(true);
      }
    }).catch(() => {
      // Fallback
      setTargetEmployee(emp);
      setNewDeptId(emp.department_id || "");
      setNewRole("EMPLOYEE");
      setIsEditOpen(true);
    });
  };

  // Submit employee department/role updates
  const handleSaveEdit = () => {
    if (!targetEmployee) return;
    
    // Resolve correct user_id
    // Usually mapping exists inside employees list
    api.get(`/employees/${targetEmployee.id}/profile`).then((res: any) => {
      const uid = res?.data?.basic?.user_id;
      if (!uid) {
        toast.error("User ID not mapped. Cannot assign department.");
        return;
      }
      updateEmpMutation.mutate({
        userId: uid,
        department_id: newDeptId,
        role: newRole
      });
    }).catch(() => {
      toast.error("Failed to retrieve system user ID for update.");
    });
  };

  // Sync active sub-tabs when active tab shifts
  const handleMainTabChange = (tab: "my-space" | "team" | "organization") => {
    setActiveTab(tab);
    if (tab === "my-space") setActiveSubTab("overview");
    else if (tab === "team") setActiveSubTab("team-space");
    else if (tab === "organization") setActiveSubTab("overview");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      
      {/* ── REDESIGNED APPLICATION TOP HEADER ─────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between border border-white/10 bg-white/[0.02] backdrop-blur-xl rounded-3xl p-4 gap-4 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/20">
            Z
          </div>
          
          <div className="flex items-center gap-1.5 bg-black/40 rounded-2xl p-1 border border-white/5">
            <button
              onClick={() => handleMainTabChange("my-space")}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === "my-space" ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              My Space
            </button>
            <button
              onClick={() => handleMainTabChange("team")}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === "team" ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Team
            </button>
            <button
              onClick={() => handleMainTabChange("organization")}
              className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === "organization" ? "bg-primary text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Organization
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/leaves/apply")}
            className="w-9 h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-primary"
            title="Quick Apply Leave"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <div className="relative hidden sm:block w-48 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input 
              placeholder="Search..."
              className="pl-9 h-9 bg-black/40 border-white/10 text-xs rounded-xl focus:border-primary/50 text-white"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/action-center")}
            className="relative w-9 h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-slate-400"
          >
            <Bell className="w-4 h-4" />
            {notifications && notifications.length > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center shadow-lg animate-pulse">
                {notifications.length}
              </span>
            ) : (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </Button>

          <Avatar 
            onClick={() => navigate(`/employees/${user?.employee_id || user?.user_id}`)}
            className="w-9 h-9 border border-white/15 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <AvatarImage src={user?.avatar_url || "/zipaworld_logo_light.png"} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{user?.email?.[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* ── SUB TAB NAVIGATION ──────────────────────────────────── */}
      <div className="flex border-b border-white/10 pb-1.5 scrollbar-none overflow-x-auto gap-8">
        {activeTab === "my-space" && (
          <>
            {["overview", "dashboard", "calendar"].map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                className={`text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${
                  activeSubTab === sub ? "border-primary text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {sub}
              </button>
            ))}
          </>
        )}
        {activeTab === "team" && (
          <>
            {["team-space", "department", "peers", "approvals"].map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                className={`text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${
                  activeSubTab === sub ? "border-primary text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {sub.replace("-", " ")}
              </button>
            ))}
          </>
        )}
        {activeTab === "organization" && (
          <>
            {["overview", "announcements", "policies", "employee-tree", "employee-list", "department-tree", "department-directory", "birthday-folks"].map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                className={`text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all border-b-2 whitespace-nowrap ${
                  activeSubTab === sub ? "border-primary text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                {sub.replace("-", " ")}
              </button>
            ))}
          </>
        )}
      </div>

      {/* ── ACTIVE SPACE SWITCHER ─────────────────────────────── */}
      <div className="mt-6">
        
        {/* ========================================================================= */}
        {/* TAB 1: MY SPACE                                                           */}
        {/* ========================================================================= */}
        {activeTab === "my-space" && (
          <>
            {/* SUB-TAB 1.1: OVERVIEW */}
            {activeSubTab === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="relative h-44 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                  <img 
                    src={user?.banner_url || profile?.banner_url || "/default_banner.jpg"} 
                    alt="Profile banner" 
                    className="w-full h-full object-cover opacity-85" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column Profile info */}
                  <div className="lg:col-span-4 space-y-6 -mt-20 relative z-10">
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center space-y-4 shadow-2xl">
                      <div className="relative w-28 h-28 mx-auto -mt-16">
                        <Avatar className="w-28 h-28 border-4 border-background shadow-2xl bg-slate-900 p-1">
                          <AvatarImage src={user?.avatar_url || "/zipaworld_logo_light.png"} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{user?.email?.[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight">{displayName}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{profile?.employee_code || "ZW_021"} - Devops Engineer</p>
                      </div>

                      <div className="py-4 px-4 bg-black/40 border border-white/5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                            todaySummary?.first_check_in && !todaySummary?.last_check_out ? "bg-emerald-500" : "bg-red-500"
                          }`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            todaySummary?.first_check_in && !todaySummary?.last_check_out ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {todaySummary?.first_check_in && !todaySummary?.last_check_out ? "Office In" : "Out"}
                          </span>
                        </div>

                        <div className="text-2xl font-mono font-bold text-white tracking-widest bg-black/50 py-2 rounded-xl border border-white/5">
                          {formattedTimer}
                        </div>

                        {!todaySummary?.first_check_in ? (
                          <button
                            onClick={() => checkInMutation.mutate()}
                            disabled={checkInMutation.isPending}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            Check-in
                          </button>
                        ) : !todaySummary?.last_check_out ? (
                          <button
                            onClick={() => checkOutMutation.mutate()}
                            disabled={checkOutMutation.isPending}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                          >
                            Check-out
                          </button>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider py-1.5 bg-white/5 rounded-xl">
                            Attendance logged
                          </div>
                        )}
                      </div>

                      <div className="text-left border-t border-white/5 pt-4 space-y-2">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Reporting To</p>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-white/5">
                            <AvatarFallback className="text-[10px] font-bold">SM</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-bold text-white">Sanjeev Kumar</p>
                            <p className="text-[9px] text-emerald-400 font-bold uppercase">Live Availability In</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Activities */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="flex border-b border-white/5 pb-1 gap-6">
                      {["activities", "feeds", "profile", "leave", "attendance"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setActiveOverviewTab(t)}
                          className={`text-xs font-black uppercase tracking-wider pb-2 transition-all border-b-2 ${
                            activeOverviewTab === t ? "border-primary text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {activeOverviewTab === "activities" && (
                      <div className="space-y-6">
                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6 shadow-xl">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div>
                              <h4 className="text-sm font-black text-white uppercase tracking-wider">Work Schedule</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Logged attendance summary for the current week</p>
                            </div>
                            <Clock className="w-4 h-4 text-primary" />
                          </div>

                          <div className="grid grid-cols-7 gap-3">
                            {weekDays.map((wd) => (
                              <div 
                                key={wd.formattedDate} 
                                className={`p-3 rounded-2xl text-center border transition-all ${
                                  wd.isToday 
                                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/5" 
                                    : "bg-black/30 border-white/5 hover:border-white/10"
                                }`}
                              >
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{wd.dayName}</p>
                                <p className="text-lg font-black text-white mt-1 tracking-tight">{wd.dayNum}</p>
                                
                                <div className="mt-3">
                                  {wd.isWeekend ? (
                                    <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase">Wknd</span>
                                  ) : wd.log ? (
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase">In</span>
                                      <p className="text-[8px] font-mono text-slate-500 mt-1 font-bold">{wd.log.total_hours?.toFixed(1) || "9.0"}h</p>
                                    </div>
                                  ) : wd.isToday && todaySummary?.first_check_in ? (
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase">In</span>
                                      <p className="text-[8px] font-mono text-slate-500 mt-1 font-bold">Active</p>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] font-black text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-md uppercase">Abst</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-4 shadow-xl">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Upcoming Holidays</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {holidays && holidays.slice(0, 3).map((h: any, i: number) => (
                              <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-1">
                                <p className="text-[10px] text-primary font-black uppercase tracking-wider">{h.name}</p>
                                <p className="text-xs font-bold text-slate-200">{format(new Date(h.date), "dd MMM yyyy")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 1.2: DASHBOARD */}
            {activeSubTab === "dashboard" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-500">
                <div className="space-y-8">
                  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-xl text-center">
                    <Gift className="w-10 h-10 text-primary mx-auto opacity-40 mb-2" />
                    <p className="text-sm font-bold text-slate-400">No birthdays today</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TEAM                                                               */}
        {/* ========================================================================= */}
        {activeTab === "team" && (
          <>
            {activeSubTab === "team-space" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">Team strength</span>
                      <span className="font-bold text-white">{teamStats.totalStrength}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ORGANIZATION                                                       */}
        {/* ========================================================================= */}
        {activeTab === "organization" && (
          <>
            {/* SUB-TAB 3.1: OVERVIEW */}
            {activeSubTab === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="relative h-44 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                  <img 
                    src="/default_banner.jpg" 
                    alt="Zipaworld banner" 
                    className="w-full h-full object-cover opacity-85" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-4 space-y-6 -mt-20 relative z-10">
                    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-primary/20 border-2 border-background">
                        Z
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Zipaworld Innovation Pvt Ltd</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Uttar Pradesh, India</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Services widgets */}
                      <div onClick={() => navigate("/leaves/dashboard")} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-primary/20 transition-all cursor-pointer">
                        <Palmtree className="w-5 h-5 text-sky-400" />
                        <span className="text-xs font-black text-white">Leave Tracker</span>
                      </div>
                      <div onClick={() => navigate("/attendance/dashboard")} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-primary/20 transition-all cursor-pointer">
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span className="text-xs font-black text-white">Time Tracker</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3.2: EMPLOYEE TREE (OR CHART) */}
            {activeSubTab === "employee-tree" && (
              <div className="h-[550px] bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  {isHRorAdmin && (
                    <Button onClick={() => setIsAddEmployeeOpen(true)} className="bg-primary text-white text-xs h-9 rounded-xl px-4 uppercase tracking-wider font-bold">
                      Add Employee
                    </Button>
                  )}
                </div>
                {orgData ? (
                  <ModernOrgChart data={orgData} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    Building hierarchical organization tree...
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3.3: EMPLOYEE LIST */}
            {activeSubTab === "employee-list" && (
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-500">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">All Active Employees</h3>
                  {isHRorAdmin && (
                    <Button onClick={() => setIsAddEmployeeOpen(true)} className="bg-primary text-white text-xs h-9 rounded-xl px-4 uppercase tracking-wider font-bold gap-2">
                      <UserPlus className="w-4 h-4" /> Add Employee
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/[0.03] text-slate-400 font-black uppercase tracking-wider border-b border-white/5">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Designation</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {employees?.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{emp.employee_code}</td>
                          <td className="py-3 px-4 font-bold text-slate-200">{emp.full_name}</td>
                          <td className="py-3 px-4 text-slate-400">{emp.email}</td>
                          <td className="py-3 px-4 text-slate-300">{emp.department || "Unassigned"}</td>
                          <td className="py-3 px-4 text-slate-400">{emp.designation || "Staff"}</td>
                          <td className="py-3 px-4 text-right">
                            {isHRorAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(emp)}
                                className="h-8 w-8 text-slate-400 hover:text-white"
                                title="Reassign Department / Role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 3.4: DEPARTMENT TREE */}
            {activeSubTab === "department-tree" && (
              <div ref={treeContainerRef} className="relative grid grid-cols-1 md:grid-cols-12 gap-12 items-start animate-in fade-in duration-500">
                {/* SVG Connector Lines Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block z-0">
                  {paths.map((p, i) => (
                    <path
                      key={i}
                      d={p}
                      fill="none"
                      stroke="#3b82f6" // Vibrant primary theme blue
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-70"
                    />
                  ))}
                </svg>

                {/* Left departments list */}
                <div className="md:col-span-4 space-y-4 relative z-10">
                  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 pb-2">Departments Hierarchy</p>
                    <div className="space-y-2">
                      {processedDepartments?.map((d: any) => {
                        const isActive = selectedDeptId === d.id || (!selectedDeptId && departments?.[0]?.id === d.id);
                        return (
                          <div
                            key={d.id}
                            ref={(el) => {
                              deptRefs.current[d.id] = el;
                            }}
                            onClick={() => setSelectedDeptId(d.id)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border relative z-10 ${
                              isActive
                                ? "bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                : "bg-black/30 border-white/5 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs uppercase">{d.name[0]}</span>
                              <span className="text-xs font-bold">{d.name}</span>
                            </div>
                            <span className={`text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center ${
                              isActive
                                ? "bg-primary text-white"
                                : "bg-white/5 text-slate-400"
                            }`}>{d.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right members grid */}
                <div className="md:col-span-8 bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 relative z-10">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{activeDept?.name || "Department"} Members</h3>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{filteredDeptEmployees.length} Total</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDeptEmployees.length === 0 ? (
                      <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
                        No employees currently assigned to this department.
                      </div>
                    ) : (
                      filteredDeptEmployees.map((emp: any, index: number) => (
                        <div
                          key={emp.id}
                          ref={(el) => {
                            empRefs.current[emp.id] = el;
                          }}
                          className="p-4 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-black/50 transition-all relative z-10"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border border-white/5">
                              <AvatarFallback className="text-xs font-bold">{emp.full_name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-white">{emp.full_name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{emp.designation || "Staff"}</p>
                            </div>
                          </div>
                          {isHRorAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(emp)}
                              className="h-8 w-8 text-slate-500 hover:text-white relative z-20"
                              title="Reassign Department"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3.5: DEPARTMENT DIRECTORY */}
            {activeSubTab === "department-directory" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                
                {/* Left Search Sidebar */}
                <div className="md:col-span-3 space-y-4">
                  <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <Input
                        placeholder="Search Department"
                        value={deptSearchQuery}
                        onChange={(e) => setDeptSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-black/40 border-white/5 text-xs text-white rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      {searchedDepts.map((d: any) => (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDeptId(d.id)}
                          className={`p-2.5 rounded-xl cursor-pointer text-xs font-semibold truncate transition-all ${
                            (selectedDeptId === d.id || (!selectedDeptId && departments?.[0]?.id === d.id))
                              ? "bg-primary text-white"
                              : "text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Cards grid */}
                <div className="md:col-span-9 space-y-4">
                  <div className="flex justify-between items-center py-2 px-6 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <span className="text-xs font-black text-white uppercase tracking-wider">{activeDept?.name || "Department"}</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{filteredDeptEmployees.length} Members</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDeptEmployees.length === 0 ? (
                      <div className="col-span-3 py-16 text-center text-slate-500 text-xs font-medium">
                        No employees found.
                      </div>
                    ) : (
                      filteredDeptEmployees.map((emp: any) => (
                        <div key={emp.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-center space-y-4 hover:bg-white/[0.03] transition-all shadow-md relative group">
                          {/* Top right quick actions */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Star className="w-3.5 h-3.5 text-slate-500 hover:text-amber-400 cursor-pointer" />
                            <Phone className="w-3.5 h-3.5 text-slate-500 hover:text-emerald-400 cursor-pointer" />
                            {isHRorAdmin && (
                              <Edit2 
                                onClick={() => handleStartEdit(emp)}
                                className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer" 
                                title="Reassign Department"
                              />
                            )}
                          </div>

                          <Avatar className="w-16 h-16 mx-auto border border-white/10 shadow-lg">
                            <AvatarFallback className="text-sm font-bold">{emp.full_name[0]}</AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <p className="text-xs font-black text-white">{emp.employee_code} - {emp.full_name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 truncate">{emp.designation || "Staff"}</p>
                            <p className="text-[9px] text-slate-600 truncate mt-1">{emp.email}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wide mt-0.5">{activeDept?.name}</p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-[9px] font-black uppercase text-red-400 tracking-wider">Yet to check-in</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* SUB-TAB 3.6: BIRTHDAY FOLKS */}
            {activeSubTab === "birthday-folks" && (
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-40 bg-black/40 border-white/5 text-xs text-white rounded-xl">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-white border-white/10">
                        <SelectItem value="01">January</SelectItem>
                        <SelectItem value="02">February</SelectItem>
                        <SelectItem value="03">March</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">June</SelectItem>
                        <SelectItem value="07">July</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 bg-black/40 border border-white/5 py-1.5 px-4 rounded-xl">
                    <span>&lt;</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span>{format(new Date(2026, Number(selectedMonth) - 1, 9), "MMM - yyyy")}</span>
                    </div>
                    <span>&gt;</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockBirthdays.length === 0 ? (
                    <div className="col-span-3 py-16 text-center text-slate-500 text-xs">
                      No birthday folks found in this month.
                    </div>
                  ) : (
                    mockBirthdays.map((b) => (
                      <div key={b.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.04] transition-all flex items-center gap-4 shadow-lg relative">
                        {/* Birthday Badge */}
                        <div className="absolute top-3 left-3 bg-primary/25 border border-primary/20 rounded-lg px-2 py-0.5 text-center text-primary font-black uppercase text-[9px] tracking-wider">
                          {b.date}
                        </div>

                        <Avatar className="w-12 h-12 border border-white/5 shadow-md">
                          <AvatarFallback className="text-xs font-bold">{b.name[0]}</AvatarFallback>
                        </Avatar>

                        <div>
                          <p className="text-xs font-black text-white">{b.code} - {b.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{b.designation}</p>
                          <p className="text-[9px] text-slate-600 mt-0.5">{b.email}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{b.department}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── MODAL: ASSIGN DEPARTMENT & SYSTEM ROLE ──────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-white/10">
          <DialogHeader>
            <DialogTitle>Reassign Department & Access Role</DialogTitle>
            <DialogDescription>
              Assign the employee to their designated department and configure system authorizations.
            </DialogDescription>
          </DialogHeader>

          {targetEmployee && (
            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Avatar className="w-10 h-10 border border-white/5">
                  <AvatarFallback className="font-bold">{targetEmployee.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-white">{targetEmployee.full_name}</p>
                  <p className="text-[10px] text-slate-500">{targetEmployee.email}</p>
                </div>
              </div>

              {/* Department Selector */}
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Designated Department</Label>
                <Select value={newDeptId} onValueChange={setNewDeptId}>
                  <SelectTrigger className="w-full bg-black/40 border-white/5 text-xs text-white rounded-xl">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-white border-white/10">
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Access Role Selector */}
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Access Authorization Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-full bg-black/40 border-white/5 text-xs text-white rounded-xl">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-white border-white/10">
                    <SelectItem value="SUPER_ADMIN">Super Admin (All permissions)</SelectItem>
                    <SelectItem value="HR_ADMIN">HR Admin (Employee & Payroll settings)</SelectItem>
                    <SelectItem value="HR">HR Executive (Recruiting & Onboarding)</SelectItem>
                    <SelectItem value="MANAGER">Manager (Leaves & Goals approvals)</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee (Standard workspace access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-xs text-slate-400 border border-white/5 rounded-xl h-10 px-5">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateEmpMutation.isPending}
              className="bg-primary text-white text-xs h-10 rounded-xl px-6 font-bold uppercase tracking-wider"
            >
              {updateEmpMutation.isPending ? "Updating..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CREATE EMPLOYEE MODAL ────────────────────────────────────── */}
      <CreateEmployeeModal 
        open={isAddEmployeeOpen} 
        onOpenChange={setIsAddEmployeeOpen} 
      />

    </div>
  );
}
