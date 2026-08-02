import {
  Wind,
  Coffee,
  BellRing,
  Wifi,
  Tv,
  Zap,
  Cctv,
  MoveVertical,
  Accessibility,
  Shirt,
  UtensilsCrossed,
  Car,
  Waves,
  Sparkles,
} from "lucide-react";

const ICON_BY_KEY = {
  wifi: Wifi,
  ac: Wind,
  "room-service": BellRing,
  laundry: Shirt,
  parking: Car,
  restaurant: UtensilsCrossed,
  pool: Waves,
  car: Car,
  elevator: MoveVertical,
  cctv: Cctv,
  tv: Tv,
  coffee: Coffee,
  power: Zap,
  accessibility: Accessibility,
};

const HOTEL_FACILITIES = [
  { name: "Well Appointed AC Rooms", Icon: Wind },
  { name: "Tea / Coffee Maker", Icon: Coffee },
  { name: "Room Service", Icon: BellRing },
  { name: "Wi-Fi", Icon: Wifi },
  { name: "LED TV", Icon: Tv },
  { name: "24x7 Power Backup", Icon: Zap },
  { name: "CCTV Surveillance", Icon: Cctv },
  { name: "Elevator", Icon: MoveVertical },
  { name: "Wheelchair Accessible", Icon: Accessibility },
  { name: "Dry Cleaning & Laundry", Icon: Shirt },
];

const ZAARANG_FACILITIES = [
  { name: "Well Appointed AC Rooms", Icon: Wind },
  { name: "Tea / Coffee Maker", Icon: Coffee },
  { name: "Room Service", Icon: BellRing },
  { name: "Wi-Fi Connectivity", Icon: Wifi },
  { name: "LED TV with Satellite", Icon: Tv },
  { name: "24x7 Power Backup", Icon: Zap },
  { name: "24x7 CCTV Surveillance", Icon: Cctv },
  { name: "Elevator access to all floors", Icon: MoveVertical },
  { name: "Wheelchair Accessible", Icon: Accessibility },
  { name: "Dry Cleaning & Laundry", Icon: Shirt },
];

function resolveAmenityIcon(amenity) {
  const key = (amenity?.icon || "").toLowerCase().trim();
  if (key && ICON_BY_KEY[key]) return ICON_BY_KEY[key];

  const name = (amenity?.name || "").toLowerCase();
  if (/wi.?fi|internet/.test(name)) return Wifi;
  if (/air.?condition|\bac\b/.test(name)) return Wind;
  if (/room service/.test(name)) return BellRing;
  if (/laundry|dry clean/.test(name)) return Shirt;
  if (/parking/.test(name)) return Car;
  if (/restaurant|kitchen|dining/.test(name)) return UtensilsCrossed;
  if (/pool|swim/.test(name)) return Waves;
  if (/elevator|lift/.test(name)) return MoveVertical;
  if (/cctv|surveillance/.test(name)) return Cctv;
  if (/tv|television/.test(name)) return Tv;
  if (/coffee|tea/.test(name)) return Coffee;
  if (/power|backup/.test(name)) return Zap;
  if (/wheelchair|accessible/.test(name)) return Accessibility;
  if (/pickup|transport|car/.test(name)) return Car;

  return Sparkles;
}

export function mapApiAmenitiesToFacilities(amenities) {
  if (!Array.isArray(amenities) || amenities.length === 0) return [];

  return amenities.map((amenity) => ({
    id: amenity.id || amenity.slug,
    name: amenity.name,
    description: amenity.description,
    Icon: resolveAmenityIcon(amenity),
    isHighlighted: Boolean(amenity.is_highlighted),
  }));
}

export function getHotelFacilities(hotel) {
  const fromApi = mapApiAmenitiesToFacilities(hotel?.amenities);
  if (fromApi.length > 0) return fromApi;

  const slug = typeof hotel === "string" ? hotel : hotel?.slug;
  if (slug === "hotel-zaarang-inn") return ZAARANG_FACILITIES;
  return HOTEL_FACILITIES;
}

export { HOTEL_FACILITIES, ZAARANG_FACILITIES };
