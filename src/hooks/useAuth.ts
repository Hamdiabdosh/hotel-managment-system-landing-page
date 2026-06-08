import { useRouteContext } from "@tanstack/react-router";
import type { Session } from "@/lib/auth/types";

export function useAuth(): Session {
  const { auth } = useRouteContext({ from: "/dashboard" });
  return auth;
}
