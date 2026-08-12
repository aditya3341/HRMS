import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Briefcase,
  FileText,
  Gift,
  UserPlus,
  Clock,
  DollarSign,
  Monitor,
  LifeBuoy,
  Inbox,
  BarChart3,
  LayoutGrid,
  Network,
  Users,
  Zap,
  Settings,
  Palmtree,
  CalendarDays,
  History,
  ClipboardCheck,
  Sparkles,
  ChevronDown,
  Fingerprint,
  Target,
  ShieldCheck,
  Brain,
  CalendarCheck,
  MessagesSquare,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMyApprovals } from "@/lib/approvalApi";

type NavItem = {
  label: string;
  path?: string;
  icon: any;
  permission?: string | boolean;
  allowedRoles?: string[];
  children?: { label: string; path: string; permission?: string; allowedRoles?: string[] }[];
};

type NavSection = {
  title: string;
  items: NavItem[];
};

export default function Sidebar() {
  const { user, hasPermission, hasRole } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  
  // Default to collapsed (minimized)
  const [isCollapsed, setIsCollapsed] = useState(true);

  const { data: serverApprovals } = useQuery({
    queryKey: ['myApprovals'],
    queryFn: getMyApprovals,
    refetchInterval: 15000,
  });

  const pendingCount = serverApprovals?.length ?? 0;

  const handleMouseEnter = () => {
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    setIsCollapsed(true);
    // Reset all accordions so they don't remain open next time they hover
    setExpandedMenus({});
  };

  const SECTIONS: NavSection[] = [
    {
      title: "Workspace",
      items: [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard.read" },
        { label: "Live Monitoring", path: "/dashboard/live-attendance", icon: Activity, permission: "attendance.read" },
        { label: "My Insights", path: "/dashboard/me", icon: Brain, permission: "employee.self" },
        { label: "Manager Dashboard", path: "/dashboard/manager", icon: LayoutGrid, permission: "performance.manage" },
        { label: "HR Intelligence", path: "/dashboard/hr-intelligence", icon: ShieldCheck, permission: "employee.create" },
        { label: "Action Center", path: "/action-center", icon: Zap, permission: "dashboard.read" },
        { label: "Approvals", path: "/approvals", icon: Inbox, permission: "dashboard.read" },
      ]
    },
    {
      title: "Talent & Operations",
      items: [
        { label: "Jobs", path: "/jobs", icon: Briefcase, permission: "job.read" },
        { label: "Applications", path: "/applications", icon: FileText, permission: "application.read" },
        {
          label: "Offers",
          icon: Gift,
          permission: "offer.read",
          children: [
            { label: "Offer Pipeline", path: "/offers", permission: "offer.read" },
            { label: "Offer Approvals", path: "/offers/approval", permission: "offer.approve" },
          ],
        },
        { label: "Onboarding", path: "/onboarding", icon: UserPlus, permission: "onboarding.read" },
        {
          label: "Attendance",
          icon: CalendarCheck,
          permission: "attendance.read",
          children: [
            { label: "Dashboard", path: "/attendance/dashboard", permission: "attendance.read" },
            { label: "My History", path: "/attendance/history", permission: "attendance.read" },
            { label: "Team Attendance", path: "/attendance/team", permission: "attendance.mark" },
          ],
        },
        {
          label: "Leave",
          icon: Palmtree,
          permission: "leave.read",
          children: [
            { label: "Dashboard", path: "/leaves/dashboard", permission: "leave.read" },
            { label: "Apply Leave", path: "/leaves/apply", permission: "leave.request" },
            { label: "Calendar", path: "/leaves/calendar", permission: "leave.read" },
            { label: "Manage Requests", path: "/leaves/manage", permission: "leave.approve" },
            { label: "Analytics", path: "/leaves/analytics", permission: "leave.approve" },
            { label: "Public Holidays", path: "/holidays", permission: "leave.read" },
          ],
        },
      ]
    },
    {
      title: "Operations & Tools",
      items: [
        { label: "Payroll", path: "/payroll/dashboard", icon: DollarSign, permission: "payroll.read" },
        { label: "IT Assets", path: "/it-assets", icon: Monitor, permission: "asset.read" },
        { label: "ZipaDesk", path: "/zipadesk", icon: LifeBuoy, permission: "ticket.read" },
        { label: "TeamBridge", path: "/team", icon: MessagesSquare, permission: "employee.self" },
        { label: "Analytics", path: "/analytics", icon: BarChart3, permission: "performance.manage" },
        { label: "Employees", path: "/employees", icon: Users, permission: "employee.read" },
        { label: "Organisation", path: "/organisation", icon: Building2, permission: "employee.self" },
        {
          label: "Utility Tools",
          icon: Sparkles,
          permission: "resume.upload",
          children: [
            { label: "Dashboard", path: "/utility-tools", permission: "resume.upload" },
            { label: "Resume Analyzer", path: "/utility-tools/resume", permission: "resume.upload" },
            { label: "Proctor Tool", path: "/utility-tools/proctor", permission: "resume.upload" },
          ],
        },
        {
          label: "Performance",
          icon: Target,
          permission: "performance.view",
          children: [
            { label: "My Goals", path: "/performance/my-goals", permission: "performance.view" },
            { label: "Team Reviews", path: "/performance/team/reviews", permission: "performance.manage" },
            { label: "Review Cycles", path: "/performance/cycles", permission: "performance.admin" },
            { label: "Goals & KPAs", path: "/performance/kpas", permission: "performance.admin" },
            { label: "Appraisal Center", path: "/performance/appraisal", permission: "performance.admin" },
            { label: "Analytics", path: "/performance/analytics", permission: "performance.manage" },
          ],
        },
      ]
    }
  ];

  return (
    <motion.aside 
      animate={{ width: isCollapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-screen bg-slate-950/95 border-r border-white/5 text-slate-200 flex flex-col relative shadow-2xl backdrop-blur-md shrink-0 select-none"
    >
      {/* Hide scrollbar styles locally */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Branding Header */}
      <div className="px-4 py-6 border-b border-white/5 flex flex-col items-center justify-center gap-1.5 group select-none relative overflow-hidden h-[92px] shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {isCollapsed ? (
          <div className="relative z-10" title="zipaworld">
            <svg 
              className="w-8 h-6 text-white transition-all duration-300" 
              viewBox="0 0 45 28" 
              fill="none"
            >
              <line x1="2" y1="8" x2="35" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="8" y1="14" x2="42" y2="14" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="4" y1="20" x2="30" y2="20" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div className="relative z-10 flex items-center justify-center w-full px-2">
            <img 
              src="/zipaworld_logo_dark.png?v=4" 
              alt="zipaworld Logo" 
              className="w-[85%] max-w-[200px] h-auto object-contain transition-all duration-300 hover:scale-105" 
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav 
        className="flex-1 px-3 py-6 space-y-6 overflow-y-auto no-scrollbar relative z-10 overflow-x-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SECTIONS.map((section) => {
          const visibleSectionItems = section.items.filter((item) => {
            if (item.permission) {
              if (typeof item.permission === "boolean") return item.permission;
              return hasPermission?.(item.permission as string);
            }
            if (item.allowedRoles && !hasRole(item.allowedRoles)) {
              return false;
            }
            return true;
          });

          if (visibleSectionItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-2">
              {/* Category Header */}
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500/70 select-none">
                  {section.title}
                </div>
              )}

              <div className="space-y-1">
                {visibleSectionItems.map((item) => {
                  if (item.children) {
                    const isExpanded = expandedMenus[item.label] || false;

                    return (
                      <div key={item.label} className="space-y-1">
                        <motion.button
                          whileHover={{ x: 4 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          onClick={() => {
                            setExpandedMenus((prev) => ({ ...prev, [item.label]: !isExpanded }));
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/[0.04] hover:text-white transition-all group relative"
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                          {!isCollapsed && (
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? "rotate-180 text-primary" : "text-slate-500"}`}
                            />
                          )}
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {!isCollapsed && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden flex flex-col space-y-1 pl-9 pr-2 border-l border-white/5 ml-5 mt-1"
                            >
                              {item.children
                                .filter(child => child.permission ? hasPermission?.(child.permission as string) : (!child.allowedRoles || hasRole(child.allowedRoles)))
                                .map((child) => (
                                  <NavLink
                                    key={child.path}
                                    to={child.path}
                                    className={({ isActive }) =>
                                      `block px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        isActive
                                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                                          : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.02]"
                                      }`
                                    }
                                  >
                                    {child.label}
                                  </NavLink>
                                ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path!}
                      end
                      className="relative block"
                      title={isCollapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <motion.div
                          whileHover={{ x: 4 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                            isActive 
                              ? "text-primary bg-primary/10" 
                              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          {/* Animated Left selection indicator bar */}
                          {isActive && (
                            <motion.div 
                              layoutId="activeIndicator"
                              className="absolute left-0 w-1 h-5 bg-primary rounded-r"
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                          )}
                          
                          <div className="flex items-center gap-3">
                            <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-white'}`} />
                            {!isCollapsed && <span>{item.label}</span>}
                          </div>
                          
                          {!isCollapsed && (item.path === '/approvals' || item.path === '/action-center') && pendingCount > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              isActive ? 'bg-primary text-white' : 'bg-primary/20 text-primary border border-primary/20'
                            }`}>
                              {pendingCount}
                            </span>
                          )}
                          {isCollapsed && (item.path === '/approvals' || item.path === '/action-center') && pendingCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                          )}
                        </motion.div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 border-t border-white/5 text-xs text-slate-500 bg-black/20 shrink-0 min-h-[72px]">
        {isCollapsed ? (
          <div className="w-full flex justify-center" title={`Logged in as ${user?.email}`}>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        ) : (
          <>
            Logged in as<br />
            <span className="text-slate-300 font-semibold truncate block mt-0.5">{user?.email}</span>
          </>
        )}
      </div>
    </motion.aside>
  );
}
