import { createFileRoute, redirect } from "@tanstack/react-router";
import { HOTEL_SLUG } from "@/lib/config/hotels";

export const Route = createFileRoute("/")({
  loader: () => {
    throw redirect({ to: "/$hotel", params: { hotel: HOTEL_SLUG } });
  },
  component: () => null,
});
