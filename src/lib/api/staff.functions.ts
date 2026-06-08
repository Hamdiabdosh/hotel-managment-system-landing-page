import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { hashPassword } from "@/lib/auth/password.server";
import { ROLE_DEPARTMENT, ROLE_LABELS } from "@/lib/rbac";
import { sendInviteEmail, sendPasswordResetEmail } from "@/lib/email";
import { MOCK_STAFF } from "@/lib/mock-data";
import type { StaffMember, StaffMemberDetail, StaffRole } from "@/lib/types";

const staffRoleSchema = z.enum([
  "SUPER_ADMIN",
  "HOTEL_ADMIN",
  "FRONT_DESK",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
  "POS_STAFF",
]);

const listStaffSchema = z.object({
  hotelId: z.string(),
  includeInactive: z.boolean().default(false),
  role: staffRoleSchema.optional(),
  query: z.string().optional(),
});

const staffIdSchema = z.object({ id: z.string() });

const inviteStaffSchema = z.object({
  hotelId: z.string(),
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  role: staffRoleSchema,
});

const updateStaffRoleSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
  role: staffRoleSchema,
});

const deactivateStaffSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
  reason: z.string().optional(),
});

const reactivateStaffSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
});

const resetStaffPasswordSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
});

function mapPrismaUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
  shifts: { id: string }[];
}): StaffMemberDetail {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as StaffRole,
    active: u.active,
    createdAt: u.createdAt.toISOString().slice(0, 10),
    department: ROLE_DEPARTMENT[u.role as StaffRole],
    initials: u.name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0]!)
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    shiftsThisWeek: u.shifts.length,
  };
}

export function mapMockStaffMember(m: StaffMember): StaffMemberDetail {
  return {
    ...m,
    department: ROLE_DEPARTMENT[m.role],
    createdAt: "2024-06-01",
    shiftsThisWeek: 0,
  };
}

function filterMockStaff(data: z.infer<typeof listStaffSchema>): StaffMemberDetail[] {
  let rows = MOCK_STAFF.map(mapMockStaffMember);

  if (!data.includeInactive) {
    rows = rows.filter((m) => m.active);
  }
  if (data.role) {
    rows = rows.filter((m) => m.role === data.role);
  }
  if (data.query) {
    const q = data.query.toLowerCase();
    rows = rows.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }

  return rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
}

function findMockStaff(id: string): StaffMemberDetail | undefined {
  const m = MOCK_STAFF.find((s) => s.id === id);
  return m ? mapMockStaffMember(m) : undefined;
}

export const listStaff = createServerFn({ method: "GET" })
  .inputValidator(listStaffSchema)
  .handler(async ({ data }) => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const users = await prisma.user.findMany({
        where: {
          hotelId: data.hotelId,
          ...(data.includeInactive ? {} : { active: true }),
          ...(data.role ? { role: data.role } : {}),
          ...(data.query
            ? {
                OR: [
                  { name: { contains: data.query, mode: "insensitive" } },
                  { email: { contains: data.query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          shifts: {
            where: { startTime: { gte: weekAgo } },
          },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      });

      return users.map(mapPrismaUser);
    } catch (err) {
      console.warn("[staff] DB unavailable, using mock data:", err);
      return filterMockStaff(data);
    }
  });

export const getStaffMember = createServerFn({ method: "GET" })
  .inputValidator(staffIdSchema)
  .handler(async ({ data }) => {
    try {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: data.id },
        include: {
          shifts: {
            orderBy: { startTime: "desc" },
            take: 10,
          },
          assignedHousekeeping: {
            where: { status: { not: "DONE" } },
            include: { room: true },
            take: 5,
          },
          assignedMaintenance: {
            where: { status: { not: "COMPLETED" } },
            take: 5,
          },
        },
      });
      return mapPrismaUser(user);
    } catch (err) {
      console.warn("[staff] DB unavailable, using mock data:", err);
      const mock = findMockStaff(data.id);
      if (!mock) throw new Error("Staff member not found");
      return mock;
    }
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .inputValidator(inviteStaffSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("inviteStaff");

    try {
      const existing = await prisma.user.findFirst({
        where: { hotelId: data.hotelId, email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new Error("A staff member with this email already exists");
      }

      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await hashPassword(tempPassword);

      const newUser = await prisma.user.create({
        data: {
          hotelId: data.hotelId,
          name: data.name,
          email: data.email.toLowerCase(),
          hashedPassword,
          role: data.role,
          active: true,
        },
        include: { shifts: true },
      });

      await sendInviteEmail({
        to: data.email,
        name: data.name,
        role: ROLE_LABELS[data.role],
        tempPassword,
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "STAFF_INVITE",
          entity: "User",
          entityId: newUser.id,
        },
      });

      return mapPrismaUser(newUser);
    } catch (err) {
      if (err instanceof Error && err.message === "A staff member with this email already exists") {
        throw err;
      }
      console.warn("[staff] DB unavailable, using mock data:", err);
      return mapMockStaffMember({
        id: `staff_mock_${Date.now()}`,
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        initials: data.name
          .split(" ")
          .filter(Boolean)
          .map((p) => p[0]!)
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        active: true,
        department: ROLE_DEPARTMENT[data.role],
      });
    }
  });

export const updateStaffRole = createServerFn({ method: "POST" })
  .inputValidator(updateStaffRoleSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("changeStaffRole");

    try {
      const current = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
      if (current.hotelId !== data.hotelId) {
        throw new Error("Staff member not found in this hotel");
      }
      if (actor.userId === data.id) {
        throw new Error("Cannot change your own role");
      }

      const updated = await prisma.user.update({
        where: { id: data.id },
        data: { role: data.role },
        include: {
          shifts: {
            where: {
              startTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "ROLE_CHANGE",
          entity: "User",
          entityId: data.id,
          before: { role: current.role },
          after: { role: data.role },
        },
      });

      return mapPrismaUser(updated);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "Cannot change your own role" ||
          err.message === "Staff member not found in this hotel")
      ) {
        throw err;
      }
      console.warn("[staff] DB unavailable, using mock data:", err);
      const mock = findMockStaff(data.id);
      if (!mock) throw new Error("Staff member not found");
      return { ...mock, role: data.role, department: ROLE_DEPARTMENT[data.role] };
    }
  });

export const deactivateStaff = createServerFn({ method: "POST" })
  .inputValidator(deactivateStaffSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("deactivateStaff");

    try {
      const current = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
      if (current.hotelId !== data.hotelId) {
        throw new Error("Staff member not found in this hotel");
      }
      if (actor.userId === data.id) {
        throw new Error("Cannot deactivate your own account");
      }

      await prisma.user.update({
        where: { id: data.id },
        data: { active: false },
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "STAFF_DEACTIVATE",
          entity: "User",
          entityId: data.id,
          after: { reason: data.reason },
        },
      });

      return { success: true as const };
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message === "Cannot deactivate your own account" ||
          err.message === "Staff member not found in this hotel")
      ) {
        throw err;
      }
      console.warn("[staff] DB unavailable, using mock data:", err);
      return { success: true as const };
    }
  });

export const reactivateStaff = createServerFn({ method: "POST" })
  .inputValidator(reactivateStaffSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("inviteStaff");

    try {
      const current = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
      if (current.hotelId !== data.hotelId) {
        throw new Error("Staff member not found in this hotel");
      }

      await prisma.user.update({
        where: { id: data.id },
        data: { active: true },
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "STAFF_REACTIVATE",
          entity: "User",
          entityId: data.id,
        },
      });

      return { success: true as const };
    } catch (err) {
      if (err instanceof Error && err.message === "Staff member not found in this hotel") {
        throw err;
      }
      console.warn("[staff] DB unavailable, using mock data:", err);
      return { success: true as const };
    }
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .inputValidator(resetStaffPasswordSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("inviteStaff");

    try {
      const current = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
      if (current.hotelId !== data.hotelId) {
        throw new Error("Staff member not found in this hotel");
      }

      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await hashPassword(tempPassword);

      await prisma.user.update({
        where: { id: data.id },
        data: { hashedPassword },
      });

      await sendPasswordResetEmail({
        to: current.email,
        name: current.name,
        tempPassword,
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "PASSWORD_RESET",
          entity: "User",
          entityId: data.id,
        },
      });

      return { success: true as const };
    } catch (err) {
      if (err instanceof Error && err.message === "Staff member not found in this hotel") {
        throw err;
      }
      console.warn("[staff] DB unavailable, using mock data:", err);
      return { success: true as const };
    }
  });
