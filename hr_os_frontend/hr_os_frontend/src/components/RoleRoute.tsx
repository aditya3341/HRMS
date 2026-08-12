import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  allowedRoles: string[];
}

export default function RoleRoute({ allowedRoles }: Props) {
  const { user } = useAuth();

  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
  const userRole = user?.role?.toUpperCase();

  if (!user || !userRole || !normalizedAllowed.includes(userRole)) {
    // Navigate to dashboard instead of unauthorized if user is just clicking around
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}