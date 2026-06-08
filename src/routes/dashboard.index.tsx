import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarCheck,
  DoorOpen,
  Percent,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { getDashboardHomeData } from "@/lib/api/dashboard.functions";
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_RESERVATIONS, MOCK_ROOMS, OCCUPANCY_7D, RES_STATUS_COLORS, REVENUE_BY_TYPE, ROOM_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  loader: async () => {
    const hotel = useHotelStore.getState().selectedHotel;
    try {
      return await getDashboardHomeData({ data: { hotelId: hotel.id } });
    } catch {
      const todayStr = new Date().toISOString().slice(0, 10);
      const occupiedCount = MOCK_ROOMS.filter((r) => r.status === "OCCUPIED").length;
      const occupancyPct = Math.round((occupiedCount / MOCK_ROOMS.length) * 100);
      const arrivalsToday = MOCK_RESERVATIONS.filter(
        (r) => (r.status === "CONFIRMED" || r.status === "PENDING") && r.checkIn === todayStr,
      );
      const departuresToday = MOCK_RESERVATIONS.filter(
        (r) => r.status === "CHECKED_IN" && r.checkOut === todayStr,
      );
      const revenueToday = MOCK_RESERVATIONS.filter(
        (r) => r.status === "CHECKED_IN" && r.checkIn === todayStr,
      ).reduce((sum, r) => sum + r.totalAmount, 0);

      return {
        kpis: {
          occupancyPct,
          arrivalsCount: arrivalsToday.length,
          departuresCount: departuresToday.length,
          revenueToday,
        },
        arrivals: arrivalsToday.slice(0, 5),
        housekeepingSnapshot: MOCK_ROOMS.filter((r) =>
          ["CLEANING", "INSPECTING", "MAINTENANCE"].includes(r.status),
        ).slice(0, 5),
        occupancy7d: OCCUPANCY_7D,
        revenueByType: REVENUE_BY_TYPE,
      };
    }
  },
  component: DashboardHome,
});

function DashboardHome() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { kpis, arrivals, housekeepingSnapshot, occupancy7d, revenueByType } =
    Route.useLoaderData();

  const chartOccupancy = occupancy7d.length > 0 ? occupancy7d : OCCUPANCY_7D;
  const chartRevenue = revenueByType.length > 0 ? revenueByType : REVENUE_BY_TYPE;

  return (
    <ModuleErrorBoundary module="Dashboard">
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy Today" value={`${kpis.occupancyPct}%`} icon={Percent} />
        <StatCard label="Check-ins" value={String(kpis.arrivalsCount)} icon={CalendarCheck} />
        <StatCard label="Check-outs" value={String(kpis.departuresCount)} icon={DoorOpen} />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(kpis.revenueToday, hotel.currency)}
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold">7-Day Occupancy</h3>
            <span className="text-xs text-muted-foreground">% rooms sold</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartOccupancy}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="var(--hotel-primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--hotel-primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold">Revenue by Room Type</h3>
            <span className="text-xs text-muted-foreground">This week</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartRevenue} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {chartRevenue.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0
                          ? "var(--hotel-primary)"
                          : i === 1
                            ? "var(--hotel-accent)"
                            : "hsl(var(--muted-foreground))"
                      }
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => formatCurrency(v, hotel.currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-serif text-lg font-semibold">Arrivals Today</h3>
            <span className="text-xs text-muted-foreground">{arrivals.length} expected</span>
          </div>
          <ul className="divide-y">
            {arrivals.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">No arrivals today.</li>
            ) : (
              arrivals.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.guestName}</div>
                    <div className="text-xs text-muted-foreground">
                      Room {r.roomNumber} · {r.roomType}
                    </div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RES_STATUS_COLORS[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-serif text-lg font-semibold">Housekeeping Snapshot</h3>
            <span className="text-xs text-muted-foreground">{housekeepingSnapshot.length} rooms</span>
          </div>
          <ul className="divide-y">
            {housekeepingSnapshot.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">All rooms ready.</li>
            ) : (
              housekeepingSnapshot.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Room {r.number}</div>
                    <div className="text-xs text-muted-foreground">{r.typeName} · Floor {r.floor}</div>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROOM_STATUS_COLORS[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
    </ModuleErrorBoundary>
  );
}
