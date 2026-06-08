import type { HotelConfig } from "@/lib/types";

const grandPalace: HotelConfig = {
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
    multiProperty: true,
    maintenanceModule: true,
  },
};

const sunsetInn: HotelConfig = {
  id: "h_sunset_inn",
  slug: "sunset-inn",
  name: "Sunset Inn",
  tagline: "Boutique warmth on the coast.",
  description:
    "A sun-drenched boutique hotel where terracotta walls meet sea breeze — relaxed, personal, unforgettable.",
  starRating: 3,
  logo: "SI",
  coverImage:
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2000&q=80",
  gallery: [
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551776235-dde6d4829808?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559599238-308793637427?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  ],
  theme: {
    primaryColor: "#9C4221",
    accentColor: "#F5E6D3",
    fontHeading: "Fraunces",
    fontBody: "Inter",
    borderRadius: "round",
  },
  currency: "EUR",
  timezone: "Europe/Lisbon",
  address: "Rua do Mar 14, Cascais, Portugal",
  phone: "+351 21 555 0199",
  email: "hello@sunsetinn.pt",
  amenities: [
    { icon: "Waves", label: "Beach Access" },
    { icon: "Coffee", label: "Café & Bar" },
    { icon: "Bike", label: "Free Bikes" },
    { icon: "Wifi", label: "Wi-Fi" },
    { icon: "Sun", label: "Rooftop" },
    { icon: "PawPrint", label: "Pet Friendly" },
  ],
  roomTypes: [
    {
      id: "rt_standard",
      name: "Garden Room",
      description: "Cozy 22m² room opening onto our citrus garden.",
      pricePerNight: 140,
      maxOccupancy: 2,
      amenities: ["Queen Bed", "Garden View", "Wi-Fi"],
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "rt_deluxe",
      name: "Sea View Room",
      description: "Bright room with a private balcony facing the Atlantic.",
      pricePerNight: 220,
      maxOccupancy: 2,
      amenities: ["Balcony", "Sea View", "Espresso"],
      image:
        "https://images.unsplash.com/photo-1551776235-dde6d4829808?auto=format&fit=crop&w=1200&q=80",
    },
    {
      id: "rt_suite",
      name: "Terracotta Suite",
      description: "Top-floor suite with terrace and outdoor soaking tub.",
      pricePerNight: 380,
      maxOccupancy: 3,
      amenities: ["Terrace", "Soaking Tub", "Lounge"],
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  testimonials: [
    { name: "Anna Lima", quote: "Felt like staying with a stylish friend by the sea.", rating: 5 },
    { name: "Tom Becker", quote: "Charming, easy, beautiful. We'll be back.", rating: 4 },
    { name: "Maya Patel", quote: "Best rooftop sunset in Cascais.", rating: 5 },
  ],
  offers: [
    {
      title: "Long Weekend",
      description: "Stay 3, pay 2 on Garden rooms.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      badge: "3 for 2",
    },
    {
      title: "Surf & Stay",
      description: "Two nights + surf lesson with local instructor.",
      image:
        "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=900&q=80",
      badge: "Active",
    },
  ],
  features: {
    pos: true,
    channelManager: false,
    loyaltyProgram: false,
    multiProperty: false,
    maintenanceModule: true,
  },
};

export const HOTELS: Record<string, HotelConfig> = {
  "grand-palace": grandPalace,
  "sunset-inn": sunsetInn,
};

export const HOTEL_LIST = Object.values(HOTELS);

export function getHotel(slug: string): HotelConfig | undefined {
  return HOTELS[slug];
}
