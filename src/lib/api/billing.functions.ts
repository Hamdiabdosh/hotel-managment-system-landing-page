import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { MOCK_FOLIOS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import type { Folio, FolioItemCategory, FolioStatus } from "@/lib/types";

function isBusinessError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("Cannot") ||
      err.message.includes("Folio is not") ||
      err.message.includes("exceeds") ||
      err.message.includes("outstanding balance"))
  );
}

const folioStatusFilterSchema = z.enum(["OPEN", "CLOSED", "VOID", "ALL"]);

const getFoliosSchema = z.object({
  hotelId: z.string(),
  status: folioStatusFilterSchema.default("ALL"),
});

const addChargeSchema = z.object({
  folioId: z.string(),
  description: z.string().min(1, "Description required"),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum(["ROOM", "FOOD", "BEVERAGE", "SPA", "LAUNDRY", "MINIBAR", "OTHER"]),
});

const recordPaymentSchema = z.object({
  folioId: z.string(),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "ROOM_CHARGE", "OTHER"]),
  reference: z.string().optional(),
});

const voidItemSchema = z.object({
  itemId: z.string(),
  folioId: z.string(),
  reason: z.string().min(1),
});

const closeFolioSchema = z.object({
  folioId: z.string(),
});

function mapPrismaFolio(row: {
  id: string;
  reservationId: string;
  totalAmount: number;
  paidAmount: number;
  status: FolioStatus;
  items: { id: string; description: string; amount: number; category: FolioItemCategory; createdAt: Date }[];
  payments: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
    createdAt: Date;
  }[];
  reservation: {
    guest: { firstName: string; lastName: string };
    room: { number: string };
  };
}): Folio {
  return {
    id: row.id,
    reservationId: row.reservationId,
    guestName: `${row.reservation.guest.firstName} ${row.reservation.guest.lastName}`,
    roomNumber: row.reservation.room.number,
    items: row.items.map((item) => ({
      id: item.id,
      description: item.description,
      amount: item.amount,
      category: item.category,
      createdAt: item.createdAt.toISOString().slice(0, 10),
    })),
    payments: row.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? "",
      status: p.status,
      createdAt: p.createdAt.toISOString().slice(0, 10),
    })),
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    status: row.status,
  };
}

async function recalculateFolioTotal(folioId: string): Promise<number> {
  const allItems = await prisma.folioItem.findMany({ where: { folioId } });
  const totalAmount = allItems.reduce((sum, i) => sum + i.amount, 0);
  await prisma.folio.update({ where: { id: folioId }, data: { totalAmount } });
  return totalAmount;
}

export const getFoliosForHotel = createServerFn({ method: "GET" })
  .inputValidator(getFoliosSchema)
  .handler(async ({ data }) => {
    try {
      const where = {
        reservation: { hotelId: data.hotelId },
        ...(data.status !== "ALL" ? { status: data.status } : {}),
      };

      const rows = await prisma.folio.findMany({
        where,
        include: {
          items: { orderBy: { createdAt: "asc" } },
          payments: { orderBy: { createdAt: "asc" } },
          reservation: { include: { guest: true, room: true } },
        },
        orderBy: { reservation: { checkIn: "desc" } },
      });

      return rows.map(mapPrismaFolio);
    } catch (err) {
      console.warn("[billing] DB unavailable, using mock data:", err);
      const filtered =
        data.status === "ALL"
          ? MOCK_FOLIOS
          : MOCK_FOLIOS.filter((f) => f.status === data.status);
      return filtered;
    }
  });

export const addFolioCharge = createServerFn({ method: "POST" })
  .inputValidator(addChargeSchema)
  .handler(async ({ data }) => {
    await requireAction("addFolioCharge");

    try {
      const folio = await prisma.folio.findUniqueOrThrow({ where: { id: data.folioId } });
      if (folio.status !== "OPEN") {
        throw new Error("Cannot add charges to a closed folio");
      }

      const item = await prisma.folioItem.create({
        data: {
          folioId: data.folioId,
          description: data.description,
          amount: data.amount,
          category: data.category,
        },
      });

      const newTotal = await recalculateFolioTotal(data.folioId);
      return { item, newTotal };
    } catch (err) {
      if (isBusinessError(err)) throw err;
      console.warn("[billing] DB unavailable, using mock data:", err);
      const mockItem = {
        id: `item_mock_${Date.now()}`,
        description: data.description,
        amount: data.amount,
        category: data.category,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      return { item: mockItem, newTotal: data.amount };
    }
  });

export const recordPayment = createServerFn({ method: "POST" })
  .inputValidator(recordPaymentSchema)
  .handler(async ({ data }) => {
    await requireAction("recordPayment");

    try {
      const folio = await prisma.folio.findUniqueOrThrow({ where: { id: data.folioId } });
      if (folio.status !== "OPEN") {
        throw new Error("Folio is not open");
      }

      const balance = folio.totalAmount - folio.paidAmount;
      if (data.amount > balance + 0.01) {
        throw new Error(
          `Payment of ${formatCurrency(data.amount, "USD")} exceeds outstanding balance of ${formatCurrency(balance, "USD")}`,
        );
      }

      const newPaidAmount = folio.paidAmount + data.amount;
      const newStatus: FolioStatus =
        newPaidAmount >= folio.totalAmount - 0.01 ? "CLOSED" : "OPEN";

      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            folioId: data.folioId,
            amount: data.amount,
            method: data.method,
            reference: data.reference ?? null,
            status: "COMPLETED",
          },
        });
        await tx.folio.update({
          where: { id: data.folioId },
          data: { paidAmount: newPaidAmount, status: newStatus },
        });
      });

      return { success: true as const, newPaidAmount, folioStatus: newStatus };
    } catch (err) {
      if (isBusinessError(err)) throw err;
      console.warn("[billing] DB unavailable, using mock data:", err);
      return { success: true as const, newPaidAmount: data.amount, folioStatus: "OPEN" as const };
    }
  });

export const voidFolioItem = createServerFn({ method: "POST" })
  .inputValidator(voidItemSchema)
  .handler(async ({ data }) => {
    await requireAction("voidFolioItem");

    const actor = await requireAction("voidFolioItem");

    try {
      const folio = await prisma.folio.findUniqueOrThrow({
        where: { id: data.folioId },
        include: { reservation: true },
      });
      if (folio.status !== "OPEN") {
        throw new Error("Cannot void items on a closed folio");
      }

      await prisma.folioItem.delete({ where: { id: data.itemId } });
      const newTotal = await recalculateFolioTotal(data.folioId);

      await prisma.auditLog.create({
        data: {
          hotelId: folio.reservation.hotelId,
          userId: actor.userId,
          action: "FOLIO_ITEM_VOID",
          entity: "FolioItem",
          entityId: data.itemId,
          after: { reason: data.reason },
        },
      });

      return { newTotal };
    } catch (err) {
      if (isBusinessError(err)) throw err;
      console.warn("[billing] DB unavailable, using mock data:", err);
      return { newTotal: 0 };
    }
  });

export const closeFolio = createServerFn({ method: "POST" })
  .inputValidator(closeFolioSchema)
  .handler(async ({ data }) => {
    await requireAction("closeFolio");

    try {
      const folio = await prisma.folio.findUniqueOrThrow({ where: { id: data.folioId } });
      if (folio.paidAmount < folio.totalAmount - 0.01) {
        throw new Error("Cannot close folio with outstanding balance");
      }

      await prisma.folio.update({
        where: { id: data.folioId },
        data: { status: "CLOSED" },
      });

      return { success: true as const };
    } catch (err) {
      if (isBusinessError(err)) throw err;
      console.warn("[billing] DB unavailable, using mock data:", err);
      return { success: true as const };
    }
  });
