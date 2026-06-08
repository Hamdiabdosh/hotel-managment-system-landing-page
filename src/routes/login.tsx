import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { login, getCurrentSession } from "@/lib/api/auth.functions";
import { HOTEL_LIST } from "@/lib/config/hotels";
import { useHotelStore } from "@/store/hotelStore";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { redirect: redirectTo } = Route.useSearch();
  const setSelectedHotel = useHotelStore((s) => s.setSelectedHotel);
  const hotel = HOTEL_LIST[0]!;

  const [email, setEmail] = useState("alex@grandpalace.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await login({ data: { email, password } });
      const userHotel = HOTEL_LIST.find((h) => h.id === session.user.hotelId);
      if (userHotel) setSelectedHotel(userHotel.slug);
      router.navigate({ to: redirectTo ?? "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const styleVars = {
    "--hotel-primary": hotel.theme.primaryColor,
    "--hotel-accent": hotel.theme.accentColor,
  } as React.CSSProperties;

  return (
    <div style={styleVars} className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold"
            style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
          >
            A
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold">Staff Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">Atrium Hotel Management System</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--hotel-primary)", color: "var(--hotel-accent)" }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo: alex@grandpalace.com / password123
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
