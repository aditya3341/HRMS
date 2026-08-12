import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { hasRole as checkRole } from "@/lib/utils";

export const DEV_AUTH_BYPASS = false;

type User = {
  user_id: string;
  email: string;
  role: string;
  entity_id: string;
  employee_id: string | null;
  avatar_url: string | null;
};

type AuthContextType = {
  user: User | null;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (allowedRoles: string[]) => boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { setUser: setStoreUser, clearUser } = useAppStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const fetchUserData = async () => {
    const token = localStorage.getItem("token");
    if (!token && !DEV_AUTH_BYPASS) {
      clearUser();
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get<any>("/protected/me");
      const perms = userData?.permissions || [
        "dashboard",
        "jobs",
        "applications",
        "offers",
        "onboarding",
        "attendance",
        "payroll",
        "it_assets",
        "it_tickets",
        "performance",
        "approvals",
      ];

      setUser(userData);
      setPermissions(perms);

      // Populate global Zustand store
      setStoreUser({
        userId: userData.user_id,
        email: userData.email,
        role: userData.role,
        entityId: userData.entity_id,
        employeeId: userData.employee_id,
        avatarUrl: userData.avatar_url || null,
        permissions: perms,
      });
    } catch (error) {
      console.error("Auth fetch failed", error);
      if (DEV_AUTH_BYPASS) {
        // Fallback to seeded admin credentials if API request fails in bypass mode
        const mockUser = {
          user_id: "8a53ea0f-d463-4adb-802c-aa94c9beeec6",
          email: "admin@zipaworld.com",
          role: "SUPER_ADMIN",
          entity_id: "Zipaworld",
          employee_id: "fb6ce26d-6425-4904-b439-251bb5d032c4",
          avatar_url: null,
        };
        const mockPermissions = [
          "dashboard",
          "jobs",
          "applications",
          "offers",
          "onboarding",
          "attendance",
          "payroll",
          "it_assets",
          "it_tickets",
          "performance",
          "approvals",
        ];
        setUser(mockUser);
        setPermissions(mockPermissions);
        setStoreUser({
          userId: mockUser.user_id,
          email: mockUser.email,
          role: mockUser.role,
          entityId: mockUser.entity_id,
          employeeId: mockUser.employee_id,
          avatarUrl: mockUser.avatar_url,
          permissions: mockPermissions,
        });
      } else {
        localStorage.removeItem("token");
        clearUser();
        setUser(null);
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const hasPermission = (permission: string) =>
    permissions.includes(permission);

  const hasRole = (allowedRoles: string[]) => checkRole(user?.role, allowedRoles);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    queryClient.clear();
    clearUser();
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        permissions, 
        loading, 
        hasPermission, 
        hasRole, 
        logout,
        refreshUser: fetchUserData 
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
