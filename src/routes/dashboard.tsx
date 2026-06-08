import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { Toaster } from "@/components/ui/sonner";
import { useHotelStore } from "@/store/hotelStore";

export const Route = createFileRoute("/dashboard")({
  loader: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { session };
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  const { session } = Route.useLoaderData();
  const hotel = useHotelStore((s) => s.selectedHotel);
  const styleVars = {
    "--hotel-primary": hotel.theme.primaryColor,
    "--hotel-accent": hotel.theme.accentColor,
  } as React.CSSProperties;

  return (
    <div style={styleVars} className="flex h-screen w-full overflow-hidden bg-muted/30">
      <DashboardSidebar session={session} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DashboardTopbar session={session} />
        <main className="flex-1 overflow-y-auto overflow-x-auto p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
