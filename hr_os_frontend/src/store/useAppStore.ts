/**
 * ============================================================
 * HR OS — Global Zustand Store
 * 
 * Single source of truth for authenticated user state.
 * Populated by AuthContext after /protected/me is resolved.
 * Components import useAppStore() to read user, entity, role, permissions.
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ----------------------------
// Shape
// ----------------------------
interface UserState {
  // Identity
  userId: string | null;
  email: string | null;
  role: string | null;
  entityId: string | null;
  employeeId: string | null;
  avatarUrl: string | null;

  // Permissions (codes like "jobs.view", "offers.approve")
  permissions: string[];

  // Auth
  isAuthenticated: boolean;

  // Actions
  setUser: (payload: {
    userId: string;
    email: string;
    role: string;
    entityId: string;
    employeeId: string | null;
    avatarUrl: string | null;
    permissions: string[];
  }) => void;
  clearUser: () => void;
  hasPermission: (code: string) => boolean;
}

// ----------------------------
// Store
// Persisted to localStorage so a page refresh doesn't flash a logged-out state.
// The token is handled separately in localStorage["token"].
// ----------------------------
export const useAppStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      userId: null,
      email: null,
      role: null,
      entityId: null,
      employeeId: null,
      avatarUrl: null,
      permissions: [],
      isAuthenticated: false,

      // Set user after successful /protected/me call
      setUser: (payload) =>
        set({
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          entityId: payload.entityId,
          employeeId: payload.employeeId,
          avatarUrl: payload.avatarUrl,
          permissions: payload.permissions,
          isAuthenticated: true,
        }),

      // Call on logout or 401
      clearUser: () =>
        set({
          userId: null,
          email: null,
          role: null,
          entityId: null,
          employeeId: null,
          avatarUrl: null,
          permissions: [],
          isAuthenticated: false,
        }),

      // RBAC helper — use in UI to conditionally render actions
      hasPermission: (code: string) => get().permissions.includes(code),
    }),
    {
      name: "hr_os_user",       // localStorage key
      partialize: (state) => ({  // Only persist identity fields, not functions
        userId: state.userId,
        email: state.email,
        role: state.role,
        entityId: state.entityId,
        employeeId: state.employeeId,
        avatarUrl: state.avatarUrl,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
