import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarCheck,
  ConciergeBell,
  BedDouble,
  Users,
  Sparkles,
  Receipt,
  ShoppingCart,
  BarChart3,
  Wrench,
  UserCog,
  Globe,
  Settings,
  User,
  LogOut,
  Hotel,
} from "lucide-react";
import { useHotelConfig } from "@/hooks/useHotelConfig";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/dashboard/reservations", label: "Reservations", icon: CalendarCheck },
      { to: "/dashboard/front-desk", label: "Front Desk", icon: ConciergeBell },
      { to: "/dashboard/rooms", label: "Rooms", icon: BedDouble },
      { to: "/dashboard/housekeeping", label: "Housekeeping", icon: Sparkles },
    ],
  },
  {
    label: "Guests & Revenue",
    items: [
      { to: "/dashboard/guests", label: "Guests", icon: Users },
      { to: "/dashboard/billing", label: "Billing", icon: Receipt },
      { to: "/dashboard/pos", label: "POS", icon: ShoppingCart },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { to: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/dashboard/staff", label: "Staff", icon: UserCog },
      { to: "/dashboard/channel-manager", label: "Channel Manager", icon: Globe },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/dashboard/settings/hotel", label: "Hotel Settings", icon: Settings },
      { to: "/dashboard/profile", label: "My Profile", icon: User },
    ],
  },
] as const;

export function DashboardSidebar() {
  const hotel = useHotelConfig();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card md:flex">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
          style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
        >
          {hotel.logo}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{hotel.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Hotel className="h-3 w-3" /> {hotel.starRating}-Star Property
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((g) => (
          <div key={g.label} className="mb-5">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.to, (item as { exact?: boolean }).exact);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {active && (
                        <span
                          className="ml-auto h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: "var(--hotel-primary)" }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            AM
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Alex Morgan</div>
            <div className="text-[11px] text-muted-foreground">Hotel Admin</div>
          </div>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
