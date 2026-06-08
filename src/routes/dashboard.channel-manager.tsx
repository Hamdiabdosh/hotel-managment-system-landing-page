import { createFileRoute } from "@tanstack/react-router";
import { Globe, Link2, RefreshCw } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";

export const Route = createFileRoute("/dashboard/channel-manager")({
  component: ChannelManagerPage,
});

const CHANNELS = [
  { name: "Booking.com", status: "Connected", lastSync: "2 min ago", bookings: 12 },
  { name: "Expedia", status: "Connected", lastSync: "5 min ago", bookings: 8 },
  { name: "Airbnb", status: "Disconnected", lastSync: "—", bookings: 0 },
];

function ChannelManagerPage() {
  return (
    <ModuleErrorBoundary module="Channel Manager">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          OTA integration UI shell — connect channel managers to sync rates and availability.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CHANNELS.map((ch) => (
            <div key={ch.name} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{ch.name}</h3>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ch.status === "Connected" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                <span className="text-sm">{ch.status}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Last sync: {ch.lastSync}</p>
              <p className="text-sm font-medium">{ch.bookings} bookings this week</p>
              <button className="mt-4 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                {ch.status === "Connected" ? <><RefreshCw className="h-3 w-3" /> Sync now</> : <><Link2 className="h-3 w-3" /> Connect</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
