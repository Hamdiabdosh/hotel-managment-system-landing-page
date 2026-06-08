import { create } from "zustand";
import { HOTEL_LIST } from "@/lib/config/hotels";
import type { HotelConfig } from "@/lib/types";

interface HotelStore {
  selectedHotelSlug: string;
  selectedHotel: HotelConfig;
  setSelectedHotel: (slug: string) => void;
}

export const useHotelStore = create<HotelStore>((set) => ({
  selectedHotelSlug: HOTEL_LIST[0]!.slug,
  selectedHotel: HOTEL_LIST[0]!,
  setSelectedHotel: (slug) => {
    const hotel = HOTEL_LIST.find((h) => h.slug === slug) ?? HOTEL_LIST[0]!;
    set({ selectedHotelSlug: slug, selectedHotel: hotel });
  },
}));
