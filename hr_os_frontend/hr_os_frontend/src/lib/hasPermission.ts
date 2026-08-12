import { ROLE_PERMISSIONS } from "@/config/permissions";

export function hasPermission(
  role: string | undefined,
  permission: string
): boolean {
  if (!role) return false;

  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.includes(
    permission
  );
}