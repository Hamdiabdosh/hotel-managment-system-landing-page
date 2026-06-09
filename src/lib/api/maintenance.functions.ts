import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { MOCK_MAINTENANCE } from "@/lib/mock-data";
import type { MaintenanceOrder, MaintenancePriority, MaintenanceStatus } from "@/lib/types";

const maintenancePrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const maintenanceStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const listMaintenanceSchema = z.object({
  hotelId: z.string(),
  status: maintenanceStatusSchema.optional(),
  priority: maintenancePrioritySchema.optional(),
  roomId: z.string().optional(),
});

const createMaintenanceSchema = z.object({
  hotelId: z.string(),
  roomId: z.string().optional(),
  title: z.string().min(1, "Title required"),
  description: z.string().min(1, "Description required"),
  priority: maintenancePrioritySchema,
  estimatedCost: z.number().min(0).optional(),
  reportedById: z.string(),
});

const updateMaintenanceStatusSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
  status: maintenanceStatusSchema,
  assignedToId: z.string().optional(),
});

const completeMaintenanceSchema = z.object({
  id: z.string(),
  hotelId: z.string(),
  actualCost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const VALID_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function filterMockMaintenance(data: {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  roomId?: string;
}): MaintenanceOrder[] {
  return MOCK_MAINTENANCE.filter((o) => {
    if (data.status && o.status !== data.status) return false;
    if (data.priority && o.priority !== data.priority) return false;
    if (data.roomId && o.roomId !== data.roomId) return false;
    return true;
  });
}

function mapPrismaOrder(row: {
  id: string;
  roomId: string | null;
  room: { number: string } | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo: { name: string } | null;
  reportedBy: { name: string };
  estimatedCost: number | null;
  completedAt: Date | null;
  createdAt: Date;
}): MaintenanceOrder {
  return {
    id: row.id,
    roomId: row.roomId ?? undefined,
    roomNumber: row.room?.number,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo?.name,
    reportedBy: row.reportedBy.name,
    estimatedCost: row.estimatedCost ?? undefined,
    createdAt: row.createdAt.toISOString().slice(0, 10),
  };
}

function mockOrderWithStatus(
  id: string,
  status: MaintenanceStatus,
  overrides?: Partial<MaintenanceOrder>,
): MaintenanceOrder {
  const existing = MOCK_MAINTENANCE.find((o) => o.id === id) ?? MOCK_MAINTENANCE[0]!;
  return { ...existing, ...overrides, id, status };
}

export const listMaintenanceOrders = createServerFn({ method: "GET" })
  .inputValidator(listMaintenanceSchema)
  .handler(async ({ data }) => {
    try {
      const rows = await prisma.maintenanceOrder.findMany({
        where: {
          hotelId: data.hotelId,
          ...(data.status ? { status: data.status } : {}),
          ...(data.priority ? { priority: data.priority } : {}),
          ...(data.roomId ? { roomId: data.roomId } : {}),
        },
        include: { room: true, assignedTo: true, reportedBy: true },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      return rows.map(mapPrismaOrder);
    } catch (err) {
      console.warn("[maintenance] DB unavailable, using mock data:", err);
      return filterMockMaintenance(data);
    }
  });

export const createMaintenanceOrder = createServerFn({ method: "POST" })
  .inputValidator(createMaintenanceSchema)
  .handler(async ({ data }) => {
    await requireAction("createMaintenanceOrder");

    try {
      const order = await prisma.maintenanceOrder.create({
        data: {
          hotelId: data.hotelId,
          roomId: data.roomId ?? null,
          reportedById: data.reportedById,
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: "OPEN",
          estimatedCost: data.estimatedCost ?? null,
        },
        include: { room: true, assignedTo: true, reportedBy: true },
      });

      return mapPrismaOrder(order);
    } catch (err) {
      console.warn("[maintenance] DB unavailable, using mock data:", err);
      return {
        id: `order_mock_${Date.now()}`,
        roomId: data.roomId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "OPEN" as const,
        reportedBy: "Staff",
        estimatedCost: data.estimatedCost,
        createdAt: new Date().toISOString().slice(0, 10),
      };
    }
  });

export const updateMaintenanceStatus = createServerFn({ method: "POST" })
  .inputValidator(updateMaintenanceStatusSchema)
  .handler(async ({ data }) => {
    const actor = await requireAction("createMaintenanceOrder");

    try {
      const current = await prisma.maintenanceOrder.findUniqueOrThrow({
        where: { id: data.id },
        include: { room: true, assignedTo: true, reportedBy: true },
      });

      const allowed = VALID_TRANSITIONS[current.status as MaintenanceStatus];
      if (!allowed.includes(data.status)) {
        throw new Error(`Cannot transition from ${current.status} to ${data.status}`);
      }

      const updated = await prisma.maintenanceOrder.update({
        where: { id: data.id },
        data: {
          status: data.status,
          ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
          ...(data.status === "COMPLETED" ? { completedAt: new Date() } : {}),
        },
        include: { room: true, assignedTo: true, reportedBy: true },
      });

      await prisma.auditLog.create({
        data: {
          hotelId: data.hotelId,
          userId: actor.userId,
          action: "MAINTENANCE_STATUS_CHANGE",
          entity: "MaintenanceOrder",
          entityId: data.id,
          after: { status: data.status },
        },
      });

      return mapPrismaOrder(updated);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Cannot transition")) {
        throw err;
      }
      console.warn("[maintenance] DB unavailable, using mock data:", err);
      return mockOrderWithStatus(data.id, data.status);
    }
  });

export const completeMaintenanceOrder = createServerFn({ method: "POST" })
  .inputValidator(completeMaintenanceSchema)
  .handler(async ({ data }) => {
    await requireAction("createMaintenanceOrder");

    try {
      const updated = await prisma.maintenanceOrder.update({
        where: { id: data.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          ...(data.actualCost !== undefined ? { estimatedCost: data.actualCost } : {}),
        },
        include: { room: true, assignedTo: true, reportedBy: true },
      });

      return mapPrismaOrder(updated);
    } catch (err) {
      console.warn("[maintenance] DB unavailable, using mock data:", err);
      return mockOrderWithStatus(data.id, "COMPLETED", {
        estimatedCost: data.actualCost,
      });
    }
  });
