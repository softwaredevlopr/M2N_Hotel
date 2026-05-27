import {
  Wifi,
  UtensilsCrossed,
  Waves,
  Car,
  Wind,
  BellRing,
  Shirt,
  PlaneTakeoff,
  Sparkles,
  Coffee,
  Dumbbell,
  Tv,
  Bath,
  ParkingCircle,
} from "lucide-react";

const ICON_BY_SLUG = {
  "complimentary-wifi": Wifi,
  "rooftop-restaurant": UtensilsCrossed,
  "swimming-pool": Waves,
  "free-parking": ParkingCircle,
  "air-conditioned-rooms": Wind,
  "24x7-room-service": BellRing,
  "laundry-service": Shirt,
  "airport-pickup": PlaneTakeoff,
};

const ICON_BY_ICON_NAME = {
  wifi: Wifi,
  restaurant: UtensilsCrossed,
  dining: UtensilsCrossed,
  pool: Waves,
  parking: ParkingCircle,
  ac: Wind,
  "room-service": BellRing,
  laundry: Shirt,
  car: PlaneTakeoff,
  coffee: Coffee,
  gym: Dumbbell,
  tv: Tv,
  bath: Bath,
};

const ICON_BY_CATEGORY = {
  connectivity: Wifi,
  dining: UtensilsCrossed,
  leisure: Waves,
  transport: PlaneTakeoff,
  room: Wind,
  service: BellRing,
  general: Sparkles,
};

export function getAmenityIcon(amenity) {
  if (!amenity) return Sparkles;
  if (amenity.slug && ICON_BY_SLUG[amenity.slug]) {
    return ICON_BY_SLUG[amenity.slug];
  }
  if (amenity.icon && ICON_BY_ICON_NAME[amenity.icon]) {
    return ICON_BY_ICON_NAME[amenity.icon];
  }
  if (amenity.category && ICON_BY_CATEGORY[amenity.category]) {
    return ICON_BY_CATEGORY[amenity.category];
  }
  return Sparkles;
}
