import { create } from "zustand";
import { HOTEL_CONFIG } from "@/lib/config/hotels";
import type { HotelConfig } from "@/lib/types";

interface HotelStore {
  selectedHotel: HotelConfig;
}

export const useHotelStore = create<HotelStore>(() => ({
  selectedHotel: HOTEL_CONFIG,
}));
