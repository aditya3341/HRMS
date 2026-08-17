import { useAuth } from "@/contexts/AuthContext";
import { hasRole as checkRole } from "@/lib/utils";

export const useRole = () => {
  const { user } = useAuth();
  
  const role = user?.role || "";
  
  const isAdmin = checkRole(role, ["ADMIN", "SUPER_ADMIN"]);
  const isHR = checkRole(role, ["HR", "HR_ADMIN", "HR_RECRUITER"]);
  const isManager = checkRole(role, ["MANAGER"]);
  const isEmployee = checkRole(role, ["EMPLOYEE"]);

  // Elevated permissions (HR or Admin)
  const canManagePayroll = isAdmin || isHR;
  const canViewTeam = isManager || isAdmin || isHR;

  return {
    role,
    user,
    isAdmin,
    isHR,
    isManager,
    isEmployee,
    canManagePayroll,
    canViewTeam
  };
};
