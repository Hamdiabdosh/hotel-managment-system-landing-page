import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { updateHotelSettings } from "@/lib/api/settings.functions";
import { canAccess } from "@/lib/rbac";
import { useHotelStore } from "@/store/hotelStore";
import { formatCurrency } from "@/lib/format";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  tagline: z.string().min(1, "Tagline required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(1, "Phone required"),
  address: z.string().min(1, "Address required"),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  fontHeading: z.string().min(1),
  fontBody: z.string().min(1),
  borderRadius: z.enum(["sharp", "soft", "round"]),
  pos: z.boolean(),
  channelManager: z.boolean(),
  loyaltyProgram: z.boolean(),
  maintenanceModule: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export const Route = createFileRoute("/dashboard/settings/hotel")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/settings")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  component: HotelSettingsPage,
});

function HotelSettingsPage() {
  const { selectedHotel } = useHotelStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: selectedHotel.name,
      tagline: selectedHotel.tagline,
      email: selectedHotel.email,
      phone: selectedHotel.phone,
      address: selectedHotel.address,
      currency: selectedHotel.currency,
      timezone: selectedHotel.timezone,
      primaryColor: selectedHotel.theme.primaryColor,
      accentColor: selectedHotel.theme.accentColor,
      fontHeading: selectedHotel.theme.fontHeading,
      fontBody: selectedHotel.theme.fontBody,
      borderRadius: selectedHotel.theme.borderRadius,
      pos: selectedHotel.features.pos,
      channelManager: selectedHotel.features.channelManager,
      loyaltyProgram: selectedHotel.features.loyaltyProgram,
      maintenanceModule: selectedHotel.features.maintenanceModule,
    },
  });

  const watched = watch();

  const onSubmit = async (formData: FormData) => {
    try {
      await updateHotelSettings({
        data: {
          hotelId: selectedHotel.id,
          ...formData,
        },
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  };

  return (
    <ModuleErrorBoundary module="Settings">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Hotel Profile</h3>
            <div className="mt-4 space-y-3">
              {(["name", "tagline", "email", "phone", "address", "currency", "timezone"] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs font-medium capitalize text-muted-foreground">{field}</label>
                  <input {...register(field)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  {errors[field] && <p className="mt-1 text-xs text-rose-600">{errors[field]?.message}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Theme</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Primary color</label>
                <input type="color" {...register("primaryColor")} className="mt-1 h-10 w-full cursor-pointer rounded-md border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Accent color</label>
                <input type="color" {...register("accentColor")} className="mt-1 h-10 w-full cursor-pointer rounded-md border" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Heading font</label>
                <input {...register("fontHeading")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Body font</label>
                <input {...register("fontBody")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Border radius</label>
                <select {...register("borderRadius")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="sharp">Sharp</option>
                  <option value="soft">Soft</option>
                  <option value="round">Round</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h3 className="font-serif text-lg font-semibold">Feature Toggles</h3>
            <div className="mt-4 space-y-2">
              {(["pos", "channelManager", "loyaltyProgram", "maintenanceModule"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register(f)} className="rounded" />
                  <span className="capitalize">{f.replace(/([A-Z])/g, " $1")}</span>
                </label>
              ))}
            </div>
          </section>

          <button
            type="submit"
            className="rounded-md px-6 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            Save Settings
          </button>
        </form>

        <div className="sticky top-24 h-fit">
          <h3 className="font-serif text-lg font-semibold">Live Preview</h3>
          <div
            className="mt-4 overflow-hidden rounded-2xl border shadow-sm"
            style={{
              "--preview-primary": watched.primaryColor,
              "--preview-accent": watched.accentColor,
            } as React.CSSProperties}
          >
            <div
              className="px-6 py-8 text-white"
              style={{ background: `linear-gradient(135deg, ${watched.primaryColor}, ${watched.primaryColor}cc)` }}
            >
              <div className="font-serif text-2xl font-bold" style={{ fontFamily: watched.fontHeading }}>
                {watched.name || "Hotel Name"}
              </div>
              <p className="mt-1 text-sm opacity-90" style={{ fontFamily: watched.fontBody }}>
                {watched.tagline || "Tagline"}
              </p>
            </div>
            <div className="space-y-3 bg-card p-6" style={{ fontFamily: watched.fontBody }}>
              <button
                className="rounded-md px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--preview-primary)",
                  color: "var(--preview-accent)",
                  borderRadius: watched.borderRadius === "round" ? "9999px" : watched.borderRadius === "soft" ? "0.75rem" : "0",
                }}
              >
                Book Now
              </button>
              <div className="rounded-lg border p-4">
                <div className="text-sm font-semibold">Deluxe Room</div>
                <div className="text-xs text-muted-foreground">From {formatCurrency(420, watched.currency)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}
