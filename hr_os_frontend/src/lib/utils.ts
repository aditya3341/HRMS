import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasRole(userRole: string | undefined | null, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  const userRoleUpper = userRole.toUpperCase();
  const normalized = allowedRoles.map(r => r.toUpperCase());
  return normalized.includes(userRoleUpper);
}
