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
