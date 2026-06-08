import { useMemo } from "react";
import { canDo, canAccess, type ActionKey } from "@/lib/rbac";
import type { StaffRole } from "@/lib/types";

interface UsePermissionsReturn {
  can: (action: ActionKey) => boolean;
  canRoute: (route: string) => boolean;
  role: StaffRole | null;
}

export function usePermissions(role: StaffRole | null): UsePermissionsReturn {
  return useMemo(
    () => ({
      can: (action: ActionKey) => (role ? canDo(role, action) : false),
      canRoute: (route: string) => (role ? canAccess(role, route) : false),
      role,
    }),
    [role],
  );
}
