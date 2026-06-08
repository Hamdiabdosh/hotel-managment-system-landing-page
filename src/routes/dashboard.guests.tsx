import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ModuleErrorBoundary } from "@/components/dashboard/ModuleErrorBoundary";
import { GuestTable } from "@/components/guests/GuestTable";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createGuest, listGuests } from "@/lib/api/guests.functions";
import { getCurrentSession } from "@/lib/api/auth.functions";
import { canAccess } from "@/lib/rbac";
import { usePermissions } from "@/hooks/usePermissions";
import { MOCK_GUESTS } from "@/lib/mock-data";
import { useHotelStore } from "@/store/hotelStore";

const createGuestFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone is required"),
  nationality: z.string().min(1, "Nationality is required"),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
});

type CreateGuestFormData = z.infer<typeof createGuestFormSchema>;

export const Route = createFileRoute("/dashboard/guests")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) throw redirect({ to: "/login" });
    if (!canAccess(session.user.role, "/dashboard/guests")) {
      throw redirect({ to: "/dashboard" });
    }
    return { session };
  },
  loader: async () => {
    const hotelId = useHotelStore.getState().selectedHotel.id;
    try {
      const result = await listGuests({ data: { hotelId, page: 0, pageSize: 200 } });
      return { guests: result.guests };
    } catch (err) {
      console.warn("[guests] DB unavailable, using mock data:", err);
      return { guests: MOCK_GUESTS };
    }
  },
  component: GuestsPage,
});

function GuestsPage() {
  const hotel = useHotelStore((s) => s.selectedHotel);
  const { guests: loadedGuests } = Route.useLoaderData();
  const { session } = Route.useRouteContext();
  const { can } = usePermissions(session.user.role);
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const nationalities = useMemo(
    () => ["ALL", ...Array.from(new Set(loadedGuests.map((g) => g.nationality))).sort()],
    [loadedGuests],
  );

  const guests = useMemo(() => {
    return loadedGuests.filter((g) => {
      if (nationalityFilter !== "ALL" && g.nationality !== nationalityFilter) return false;
      if (!debouncedQuery) return true;
      const lower = debouncedQuery.toLowerCase();
      return (
        g.firstName.toLowerCase().includes(lower) ||
        g.lastName.toLowerCase().includes(lower) ||
        g.email.toLowerCase().includes(lower)
      );
    });
  }, [loadedGuests, debouncedQuery, nationalityFilter]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateGuestFormData>({
    resolver: zodResolver(createGuestFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationality: "",
      idType: "",
      idNumber: "",
      dateOfBirth: "",
    },
  });

  const onCreateGuest = async (data: CreateGuestFormData) => {
    try {
      await createGuest({
        data: {
          hotelId: hotel.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          nationality: data.nationality,
          idType: data.idType || undefined,
          idNumber: data.idNumber || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
        },
      });
      toast.success("Guest created successfully");
      reset();
      setFormOpen(false);
      router.invalidate();
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to create guest",
      });
    }
  };

  return (
    <ModuleErrorBoundary module="Guests">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-md border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search guests by name or email"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="rounded-md border bg-card px-3 py-2 text-sm"
          >
            {nationalities.map((n) => (
              <option key={n} value={n}>
                {n === "ALL" ? "All nationalities" : n}
              </option>
            ))}
          </select>
          {can("createGuest") && (
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              <Plus className="h-4 w-4" /> Add Guest
            </button>
          )}
        </div>

        {guests.length === 0 ? (
          <div className="rounded-2xl border bg-card px-8 py-16 text-center">
            <p className="text-muted-foreground">No guests match your search.</p>
          </div>
        ) : (
          <GuestTable guests={guests} />
        )}
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-serif">Add Guest</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onCreateGuest)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <input {...register("firstName")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <input {...register("lastName")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" {...register("email")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <input {...register("phone")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nationality</label>
              <input {...register("nationality")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              {errors.nationality && <p className="mt-1 text-xs text-destructive">{errors.nationality.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">ID Type</label>
                <select {...register("idType")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select type</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver License</option>
                  <option value="National ID">National ID</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">ID Number</label>
                <input {...register("idNumber")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date of Birth</label>
              <input type="date" {...register("dateOfBirth")} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
              {errors.dateOfBirth && <p className="mt-1 text-xs text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
              >
                {isSubmitting ? "Saving…" : "Create Guest"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </ModuleErrorBoundary>
  );
}
