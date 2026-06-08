import { useMemo, useState } from "react";
import { MOCK_RESERVATIONS } from "@/lib/mock-data";
import type { Reservation, ReservationSource, ReservationStatus } from "@/lib/types";

export interface ReservationFilters {
  query: string;
  status: ReservationStatus | "ALL";
  source: ReservationSource | "ALL";
  roomType: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: ReservationFilters = {
  query: "",
  status: "ALL",
  source: "ALL",
  roomType: "ALL",
  dateFrom: "",
  dateTo: "",
};

export function useReservations(initial?: Partial<ReservationFilters>) {
  const [filters, setFilters] = useState<ReservationFilters>({ ...DEFAULT_FILTERS, ...initial });

  const reservations = useMemo(() => {
    return MOCK_RESERVATIONS.filter((r) => {
      if (filters.status !== "ALL" && r.status !== filters.status) return false;
      if (filters.source !== "ALL" && r.source !== filters.source) return false;
      if (filters.roomType !== "ALL" && r.roomType !== filters.roomType) return false;
      if (filters.dateFrom && r.checkIn < filters.dateFrom) return false;
      if (filters.dateTo && r.checkOut > filters.dateTo) return false;
      if (
        filters.query &&
        !r.guestName.toLowerCase().includes(filters.query.toLowerCase()) &&
        !r.code.toLowerCase().includes(filters.query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filters]);

  const getById = (id: string): Reservation | undefined =>
    MOCK_RESERVATIONS.find((r) => r.id === id);

  return { reservations, filters, setFilters, getById };
}
