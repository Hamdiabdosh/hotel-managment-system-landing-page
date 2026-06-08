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
import { useHotelStore } from "@/store/hotelStore";
import { MOCK_RESERVATIONS, MOCK_ROOMS, OCCUPANCY_7D, REVENUE_BY_TYPE, RES_STATUS_COLORS, ROOM_STATUS_COLORS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

const PIE_COLORS = ["#1B4332", "#D4AF37", "#9C4221"];

function DashboardHome() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const arrivals = MOCK_RESERVATIONS.filter((r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN").slice(0, 5);
  const housekeeping = MOCK_ROOMS.slice(0, 5);

  return (
    <ModuleErrorBoundary module="Dashboard">
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Occupancy Today" value="86%" delta="4.2%" icon={Percent} />
        <StatCard label="Check-ins" value="14" delta="2" icon={CalendarCheck} />
        <StatCard label="Check-outs" value="9" delta="1" trend="down" icon={DoorOpen} />
        <StatCard
          label="Revenue Today"
          value={formatCurrency(24820, hotel.currency)}
          delta="8.6%"
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
              <LineChart data={OCCUPANCY_7D}>
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
                <Pie data={REVENUE_BY_TYPE} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {REVENUE_BY_TYPE.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
            {arrivals.map((r) => (
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
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-serif text-lg font-semibold">Housekeeping Snapshot</h3>
            <span className="text-xs text-muted-foreground">{housekeeping.length} rooms</span>
          </div>
          <ul className="divide-y">
            {housekeeping.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Room {r.number}</div>
                  <div className="text-xs text-muted-foreground">{r.typeName} · Floor {r.floor}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ROOM_STATUS_COLORS[r.status]}`}>
                  {r.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    </ModuleErrorBoundary>
  );
}
