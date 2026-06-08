import { useParams } from "@tanstack/react-router";
import { getHotel } from "@/lib/config/hotels";
import { useHotelStore } from "@/store/hotelStore";
import type { HotelConfig } from "@/lib/types";

export function useHotelConfig(): HotelConfig {
  const dashboardHotel = useHotelStore((s) => s.selectedHotel);
  let slug: string | undefined;
  try {
    const params = useParams({ strict: false }) as { hotel?: string };
    slug = params.hotel;
  } catch {
    slug = undefined;
  }
  return (slug && getHotel(slug)) || dashboardHotel;
}
