import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  UserPlus,
  Clock,
  IndianRupee,
  Laptop,
  Wrench,
} from "lucide-react";

export type SidebarItem = {
  label: string;
  path: string;
  icon: any;
  permission?: string;
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Jobs",
    path: "/jobs",
    icon: Briefcase,
    permission: "jobs",
  },
  {
    label: "Applications",
    path: "/applications",
    icon: Users,
    permission: "applications",
  },
  {
    label: "Offers",
    path: "/offers",
    icon: FileText,
    permission: "offers",
  },
  {
    label: "Onboarding",
    path: "/onboarding",
    icon: UserPlus,
    permission: "onboarding",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: Clock,
    permission: "attendance",
  },
  {
    label: "Payroll",
    path: "/payroll",
    icon: IndianRupee,
    permission: "payroll",
  },
  {
    label: "IT Assets",
    path: "/it-assets",
    icon: Laptop,
    permission: "it_assets",
  },
  {
    label: "IT Tickets",
    path: "/it-tickets",
    icon: Wrench,
    permission: "it_tickets",
  },
];