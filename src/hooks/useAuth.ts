import { getRouteApi } from "@tanstack/react-router";
import type { Session } from "@/lib/auth/types";

const dashboardRoute = getRouteApi("/dashboard");

export function useAuth(): Session {
  const { session } = dashboardRoute.useLoaderData();
  return session;
}
