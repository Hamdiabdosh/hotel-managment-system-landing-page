import { useSession } from "@tanstack/react-start/server";
import { assertRole, type ActionKey } from "@/lib/rbac";
import type { StaffRole } from "@/lib/types";

export interface SessionData {
  userId: string;
  hotelId: string;
  name: string;
  email: string;
  role: StaffRole;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

export const sessionConfig = {
  password: sessionSecret ?? "dev-only-secret-not-for-production",
  name: "atrium_hms_session",
  maxAge: 60 * 60 * 24 * 7,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

export async function requireSessionUser(): Promise<SessionData> {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data?.userId) {
    throw new Error("Unauthorized");
  }
  return session.data;
}

export async function requireAction(action: ActionKey): Promise<SessionData> {
  const user = await requireSessionUser();
  assertRole(user.role, action);
  return user;
}
