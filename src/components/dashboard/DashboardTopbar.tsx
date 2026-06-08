import { useRouterState } from "@tanstack/react-router";
import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { useHotelStore } from "@/store/hotelStore";
import { useSidebarOpen } from "@/store/sidebarStore";
import type { Session } from "@/lib/auth/types";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/reservations": "Reservations",
  "/dashboard/front-desk": "Front Desk",
  "/dashboard/rooms": "Rooms",
  "/dashboard/housekeeping": "Housekeeping",
  "/dashboard/guests": "Guests",
  "/dashboard/billing": "Billing",
  "/dashboard/pos": "Point of Sale",
  "/dashboard/reports": "Reports",
  "/dashboard/maintenance": "Maintenance",
  "/dashboard/staff": "Staff",
  "/dashboard/settings": "Settings",
  "/dashboard/settings/hotel": "Hotel Settings",
  "/dashboard/channel-manager": "Channel Manager",
  "/dashboard/profile": "My Profile",
};

export function DashboardTopbar({ session }: { session: Session }) {
  const { selectedHotel, setSelectedHotel } = useHotelStore();
  const { setOpen } = useSidebarOpen();
  const { user } = session;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/dashboard/guests/") ? "Guest Profile" : null) ??
    (pathname.startsWith("/dashboard/reservations/") ? "Reservation Detail" : null) ??
    "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="font-serif text-xl font-semibold tracking-tight">{title}</h1>

      <div className="relative ml-4">
        <select
          value={selectedHotel.slug}
          onChange={(e) => setSelectedHotel(e.target.value)}
          className="appearance-none rounded-md border bg-muted/40 py-1.5 pl-2.5 pr-8 text-xs font-medium"
        >
          {HOTEL_LIST.map((h) => (
            <option key={h.slug} value={h.slug}>{h.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search reservations, guests, rooms…"
            className="w-64 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button className="relative rounded-md border bg-card p-2 hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
            3
          </span>
        </button>
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {user.name.split(" ").map((n) => n[0]).join("")}
          </div>
        </div>
      </div>
    </header>
  );
}
