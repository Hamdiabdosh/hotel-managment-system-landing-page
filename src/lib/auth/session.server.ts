import { useSession } from "@tanstack/react-start/server";
import type { StaffRole } from "@/lib/types";

export interface SessionData {
  userId: string;
  hotelId: string;
  name: string;
  email: string;
  role: StaffRole;
}

export const sessionConfig = {
  password: process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me",
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
