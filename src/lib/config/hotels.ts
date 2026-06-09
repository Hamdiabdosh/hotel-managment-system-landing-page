import type { HotelConfig } from "@/lib/types";

export const HOTEL_CONFIG: HotelConfig = {
  id: "h_grand_palace",
  slug: "grand-palace",
  name: "The Grand Palace",
  tagline: "Timeless Luxury, Reimagined.",
  description:
    "A five-star sanctuary in the heart of the city, where heritage architecture meets modern indulgence.",
  starRating: 5,
  logo: "GP",
  coverImage:
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
  ],
  theme: {
    primaryColor: "#1B4332",
    accentColor: "#D4AF37",
    fontHeading: "Playfair Display",
    fontBody: "Inter",
    borderRadius: "soft",
  },
  currency: "USD",
  timezone: "America/New_York",
  address: "1 Park Avenue, New York, NY 10016",
  phone: "+1 (212) 555-0100",
  email: "concierge@grandpalace.com",
  amenities: [
    { icon: "Waves", label: "Infinity Pool" },
    { icon: "Dumbbell", label: "24/7 Fitness" },
    { icon: "Sparkles", label: "Luxury Spa" },
    { icon: "Utensils", label: "Michelin Dining" },
    { icon: "Wifi", label: "Gigabit Wi-Fi" },
    { icon: "Car", label: "Valet Parking" },
    { icon: "Wine", label: "Wine Cellar" },
    { icon: "ConciergeBell", label: "24h Concierge" },
  ],
  roomTypes: [
    {
      id: "rt_standard",
      name: "Deluxe Room",
      description: "Elegant 35m² rooms with city views and marble bathrooms.",
      pricePerNight: 420,
      maxOccupancy: 2,
      amenities: ["King Bed", "City View", "Rain Shower", "Espresso"],
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "rt_deluxe",
      name: "Executive Suite",
      description: "Spacious suites with separate lounge and skyline panorama.",
      pricePerNight: 780,
      maxOccupancy: 3,
      amenities: ["Separate Lounge", "Skyline View", "Soaking Tub", "Butler"],
      image:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "rt_suite",
      name: "Presidential Suite",
      description: "Two-bedroom residence with private terrace and dining room.",
      pricePerNight: 2400,
      maxOccupancy: 6,
      amenities: ["2 Bedrooms", "Terrace", "Dining Room", "Private Chef"],
      image:
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  testimonials: [
    {
      name: "Eleanor Hartwell",
      quote: "Every detail considered. The most refined stay of my year.",
      rating: 5,
    },
    {
      name: "Marcus Chen",
      quote: "The service is intuitive — they anticipate before you ask.",
      rating: 5,
    },
    {
      name: "Sofia Bellini",
      quote: "Architectural beauty paired with truly modern comfort.",
      rating: 5,
    },
  ],
  offers: [
    {
      title: "Suite Escape",
      description: "3 nights in an Executive Suite with daily breakfast.",
      image:
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
      badge: "Save 20%",
    },
    {
      title: "Spa Indulgence",
      description: "Two-night stay with 90-minute couples treatment.",
      image:
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
      badge: "Member",
    },
    {
      title: "Culinary Weekend",
      description: "Tasting menu for two at our Michelin-starred restaurant.",
      image:
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
      badge: "Limited",
    },
  ],
  features: {
    pos: true,
    channelManager: true,
    loyaltyProgram: true,
    maintenanceModule: true,
  },
};

export const HOTEL_SLUG = HOTEL_CONFIG.slug;

export function getHotel(_slug?: string): HotelConfig {
  return HOTEL_CONFIG;
}
