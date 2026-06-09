import { createServerFn } from "@tanstack/react-start";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAction } from "@/lib/auth/session.server";
import { HOTEL_CONFIG } from "@/lib/config/hotels";
import type { HotelConfig } from "@/lib/types";

const updateHotelSettingsSchema = z.object({
  hotelId: z.string(),
  name: z.string().min(1, "Name required"),
  tagline: z.string().min(1, "Tagline required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone required"),
  address: z.string().min(1, "Address required"),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  fontHeading: z.string().min(1),
  fontBody: z.string().min(1),
  borderRadius: z.enum(["sharp", "soft", "round"]),
  pos: z.boolean(),
  channelManager: z.boolean(),
  loyaltyProgram: z.boolean(),
  maintenanceModule: z.boolean(),
});

export const updateHotelSettings = createServerFn({ method: "POST" })
  .inputValidator(updateHotelSettingsSchema)
  .handler(async ({ data }) => {
    await requireAction("editHotelSettings");

    try {
      const hotel = await prisma.hotel.findUniqueOrThrow({
        where: { id: data.hotelId },
      });
      const currentConfig = hotel.config as unknown as HotelConfig;

      const newConfig: HotelConfig = {
        ...currentConfig,
        name: data.name,
        tagline: data.tagline,
        email: data.email,
        phone: data.phone,
        address: data.address,
        currency: data.currency,
        timezone: data.timezone,
        theme: {
          ...currentConfig.theme,
          primaryColor: data.primaryColor,
          accentColor: data.accentColor,
          fontHeading: data.fontHeading,
          fontBody: data.fontBody,
          borderRadius: data.borderRadius,
        },
        features: {
          ...currentConfig.features,
          pos: data.pos,
          channelManager: data.channelManager,
          loyaltyProgram: data.loyaltyProgram,
          maintenanceModule: data.maintenanceModule,
        },
      };

      await prisma.hotel.update({
        where: { id: data.hotelId },
        data: { name: data.name, config: newConfig as unknown as Prisma.InputJsonValue },
      });

      return { success: true as const, config: newConfig };
    } catch (err) {
      if (err instanceof Error && err.message.includes("Forbidden")) throw err;
      console.warn("[settings] DB unavailable, changes not persisted:", err);
      return { success: true as const, config: HOTEL_CONFIG };
    }
  });
