import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { useHotelStore } from "@/store/hotelStore";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const styleVars = {
    "--hotel-primary": hotel.theme.primaryColor,
    "--hotel-accent": hotel.theme.accentColor,
  } as React.CSSProperties;

  return (
    <div style={styleVars} className="flex min-h-screen w-full bg-muted/30">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar />
        <main className="flex-1 overflow-x-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
