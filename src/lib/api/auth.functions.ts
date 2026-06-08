import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password.server";
import { sessionConfig, type SessionData } from "@/lib/auth/session.server";
import type { Session } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";
import type { StaffRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function toSessionPayload(data: SessionData): Session {
  return {
    user: {
      id: data.userId,
      name: data.name,
      email: data.email,
      role: data.role,
      hotelId: data.hotelId,
    },
    expires: new Date(Date.now() + sessionConfig.maxAge * 1000).toISOString(),
  };
}

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data?.userId) return null;
  return toSessionPayload(session.data);
});

export const login = createServerFn({ method: "POST" })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    const user = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });

    if (!user || !(await verifyPassword(data.password, user.hashedPassword))) {
      throw new Error("Invalid email or password");
    }

    const sessionData: SessionData = {
      userId: user.id,
      hotelId: user.hotelId,
      name: user.name,
      email: user.email,
      role: user.role as StaffRole,
    };

    await updateSession(sessionConfig, sessionData);
    return toSessionPayload(sessionData);
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(sessionConfig);
  return { success: true as const };
});
