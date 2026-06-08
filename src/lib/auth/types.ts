import type { StaffRole } from "@/lib/types";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  hotelId: string;
  image?: string;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/** Skeleton session for dashboard layout — replace with NextAuth when wired up. */
export const MOCK_SESSION: Session = {
  user: {
    id: "staff_1",
    name: "Alex Morgan",
    email: "alex@grandpalace.com",
    role: "HOTEL_ADMIN",
    hotelId: "h_grand_palace",
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};
