// Official per-hotel tariff — single source of truth for room cards AND the
// Room Tariff section. Do not invent prices. When a rate is unknown, use null
// so the UI shows "On Request" (never a placeholder number).
//
// Later: replace TARIFFS_BY_SLUG with API/DB data without changing consumers.

export const CONTACT_FOR_TARIFF = "Contact for Tariff";
export const ON_REQUEST = "On Request";
export const AVAILABLE_WITH_ROOM_PLAN = "Available with room plan";

// Meal-plan rows for the tariff matrix. Rendered in this order.
export const MEAL_PLANS = [
  { id: "no_meal", label: "No Meal" },
  { id: "breakfast", label: "Breakfast" },
  { id: "breakfast_one_meal", label: "Breakfast + One Meal" },
  { id: "all_meals", label: "All Meals" },
];

const DEFAULT_RATE_INCLUDES = [
  "Complimentary Wi-Fi",
  "Daily Housekeeping",
  "Tea/Coffee Maker",
  "Mineral Water",
  "Premium Toiletries",
  "Air Conditioning",
  "Smart TV",
  "24x7 Front Desk",
];

const DEFAULT_CANCELLATION_POLICY =
  "Cancellations made at least 24 hours before the scheduled check-in time are eligible for a full refund of the room charges. Cancellations made within 24 hours of check-in, or in the event of a no-show, may attract a charge equivalent to one night’s stay. Meal plans and any prepaid extras follow the same notice period unless otherwise confirmed in writing. For group bookings or special rates, a separate cancellation schedule may apply as stated on your confirmation.";

const DEFAULT_ROOM_HIGHLIGHTS = [
  "Air Conditioning",
  "Complimentary Wi-Fi",
  "Smart TV",
  "Daily Housekeeping",
  "Premium Toiletries",
];

// Core in-room amenities shown as an icon strip on every room card. Kept
// distinct from per-room highlights so a card never repeats the same feature.
const DEFAULT_ROOM_AMENITIES = [
  "Free Wi-Fi",
  "Air Conditioning",
  "Smart TV",
  "Room Service",
  "Daily Housekeeping",
];

// Shared disclaimer shown under the tariff matrix on every hotel page.
const TARIFF_DISCLAIMER =
  "Rates are per room, per night and subject to availability. Meal inclusions and offers may vary. Please confirm while booking.";

// Shared official meal-plan matrix (Single / Double occupancy), used by BOTH
// hotels so the Tariff & Meal Plans section stays consistent. A cell may carry
// a `singleNote`/`doubleNote` string instead of a price when the exact rate is
// intentionally not shown here (e.g. it already appears on a room card).
const SHARED_MEAL_PLANS = [
  { id: "no_meal", label: "No Meal", single: 1799, double: 2199 },
  {
    id: "breakfast",
    label: "Breakfast",
    // The Single/Breakfast rate coincides with a room-card price, so it is not
    // repeated here — guests are pointed to the matching room plan instead.
    single: null,
    singleNote: "Available with room plan",
    double: 2299,
  },
  {
    id: "breakfast_one_meal",
    label: "Breakfast + One Meal",
    single: 2199,
    double: 2599,
  },
  { id: "all_meals", label: "All Meals", single: 2499, double: 3199 },
];

// Aurelia-only meal-plan matrix: same as SHARED_MEAL_PLANS except All Meals /
// Double shows "Available with room plan" (the ₹2,999 Suite rate is on the room
// card — not repeated here).
const AURELIA_MEAL_PLANS = SHARED_MEAL_PLANS.map((plan) =>
  plan.id === "all_meals"
    ? {
        ...plan,
        double: null,
        doubleNote: "Available with room plan",
      }
    : plan
);

// Official Zaarang meal-plan matrix. Breakfast Single ₹1,999 is shown here (it is
// the meal-plan rate, distinct from the Standard ₹999 package on the room card).
// All Meals / Double uses a note — Suite rate stays on the room card only.
const ZAARANG_MEAL_PLANS = [
  { id: "no_meal", label: "No Meal", single: 1799, double: 2199 },
  {
    id: "breakfast",
    label: "Breakfast",
    // Breakfast Single coincides with a room-card rate — do not repeat it here.
    single: null,
    singleNote: "Available with room plan",
    double: 2299,
  },
  {
    id: "breakfast_one_meal",
    label: "Breakfast + One Meal",
    single: 2199,
    double: 2599,
  },
  {
    id: "all_meals",
    label: "All Meals",
    single: 2499,
    double: null,
    doubleNote: "Available with room plan",
  },
];

// Empty meal-plan matrix — every cell "On Request" until official rates arrive.
// Shape is API-ready: swap null for real numbers (or pass via hotel.tariff).
function emptyMealPlans() {
  return MEAL_PLANS.map((plan) => ({
    id: plan.id,
    label: plan.label,
    single: null,
    double: null,
  }));
}

/**
 * `rooms` drive both FeaturedRooms cards and the tariff pricing cards.
 * `startingFrom` — lowest published nightly rate (null = On Request).
 * `highlights` — 4–5 room features shown on each room card (from tariff source).
 * `mealPlans` — hotel-level meal-plan matrix (Single / Double per plan).
 * Only add a room/category/rate when it exists on the official tariff sheet.
 */
const TARIFFS_BY_SLUG = {
  // TODO: Replace with Aurelia's official published tariff when confirmed.
  // Until then every rate shows On Request — do not copy Zaarang rates.
  "m2n-hotel-aurelia-grand": {
    currencyCode: "INR",
    note: TARIFF_DISCLAIMER,
    rooms: [
      {
        slug: "standard",
        label: "Standard Room",
        // ₹999 is the Couple / Get Together Package (a 3-hour package),
        // NOT a per-night room tariff.
        startingFrom: 999,
        priceUnit: "package",
        packageType: "Couple / Get Together Package",
        duration: "3 Hours",
        occupancy: "2 Guests",
        description:
          "A relaxed 3-hour couple / get-together package with a choice of one food item and a soft drink.",
        highlights: DEFAULT_ROOM_HIGHLIGHTS,
        // Official ₹999 package: any ONE food item + a 500 ml soft drink.
        foodInclusions: {
          chooseOne: [
            "Honey Chilli Potato",
            "Burger",
            "Paneer Chilli",
            "Noodles",
            "French Fries",
          ],
          included: ["500 ml Soft Drink"],
        },
      },
      {
        slug: "deluxe",
        label: "Deluxe Room",
        startingFrom: 1999,
        duration: "1 Day",
        occupancy: "2 Guests",
        bedType: "King",
        highlights: [
          "Air Conditioning",
          "Complimentary Wi-Fi",
          "Complimentary Breakfast",
          "Smart TV",
          "Premium Toiletries",
        ],
      },
      {
        slug: "suite",
        label: "Suite",
        startingFrom: 2999,
        duration: "1 Day",
        occupancy: "2 Adults + 2 Children",
        bedType: "King",
        highlights: DEFAULT_ROOM_HIGHLIGHTS,
        // Official Suite benefit: 3 complimentary meals during the stay; the
        // daily menu is decided by hotel management (do not invent dishes).
        foodPlan: {
          label: "Food Plan",
          items: ["Complimentary Meals — 3 Times"],
          note: "Meal menu and items are selected daily by hotel management.",
        },
      },
    ],
    unavailableLabel: CONTACT_FOR_TARIFF,
    // Aurelia meal-plan matrix — same as Zaarang except All Meals / Double shows
    // "Available with room plan" (Suite rate is on the room card, not repeated).
    mealPlans: AURELIA_MEAL_PLANS,
    extraBed: 400,
    gst: "5% Extra",
    rateIncludes: DEFAULT_RATE_INCLUDES,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
  },
  "hotel-zaarang-inn": {
    currencyCode: "INR",
    note: TARIFF_DISCLAIMER,
    rooms: [
      {
        slug: "standard",
        label: "Standard Room",
        // ₹999 Couple / Get Together Package (3 Hours) — not a per-night rate.
        startingFrom: 999,
        priceUnit: "package",
        packageType: "Couple / Get Together Package",
        duration: "3 Hours",
        occupancy: "2 Guests",
        bedType: "Queen",
        description:
          "A relaxed 3-hour couple / get-together package with a choice of one food item and a soft drink.",
        highlights: DEFAULT_ROOM_HIGHLIGHTS,
        foodInclusions: {
          chooseOne: [
            "Honey Chilli Potato",
            "Paneer Chilli",
            "French Fries",
            "Burger",
            "Noodles",
          ],
          included: ["500 ml Soft Drink"],
        },
      },
      {
        slug: "deluxe",
        label: "Deluxe Room",
        startingFrom: 1999,
        duration: "1 Day",
        occupancy: "2 Guests",
        bedType: "King",
        description:
          "A comfortable deluxe room for an overnight stay, thoughtfully appointed with complimentary breakfast and everyday comforts.",
        highlights: [
          "Air Conditioning",
          "Complimentary Wi-Fi",
          "Complimentary Breakfast",
          "Smart TV",
          "Premium Toiletries",
        ],
      },
      {
        slug: "suite",
        label: "Suite",
        startingFrom: 2999,
        duration: "1 Day",
        occupancy: "2 Adults + 2 Children",
        bedType: "King",
        description:
          "A spacious suite suited to a family stay of two adults and two children, with complimentary meals provided three times during your stay.",
        highlights: DEFAULT_ROOM_HIGHLIGHTS,
        foodPlan: {
          label: "Food Plan",
          items: ["Complimentary Meals — 3 Times"],
          note: "Meal menu and items are selected daily by hotel management.",
        },
      },
    ],
    // Official Zaarang meal-plan matrix (shared RoomTariff layout; Zaarang rates).
    mealPlans: ZAARANG_MEAL_PLANS,
    extraBed: 400,
    gst: "5% Extra",
    checkIn: "12:00",
    checkOut: "11:00",
    rateIncludes: DEFAULT_RATE_INCLUDES,
    cancellationPolicy: DEFAULT_CANCELLATION_POLICY,
  },
};

function slugOf(hotelOrSlug) {
  if (typeof hotelOrSlug === "string") return hotelOrSlug;
  return hotelOrSlug?.slug ?? null;
}

function toNumericRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

// Normalize a room's optional food/package inclusions. Supports a "choose any
// one" group plus always-included items. Returns null when there is no data.
function normalizeFoodInclusions(food) {
  if (!food || typeof food !== "object") return null;
  const chooseOne = Array.isArray(food.chooseOne)
    ? food.chooseOne.filter(Boolean)
    : [];
  const included = Array.isArray(food.included)
    ? food.included.filter(Boolean)
    : [];
  if (chooseOne.length === 0 && included.length === 0) return null;
  return { chooseOne, included };
}

// Normalize a room's optional meal/food plan (e.g. "Complimentary Meals — 3
// Times") with a supporting note. Returns null when there is no data.
function normalizeFoodPlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  const items = Array.isArray(plan.items) ? plan.items.filter(Boolean) : [];
  if (items.length === 0) return null;
  return {
    label: plan.label || "Food Plan",
    items,
    note: plan.note || "",
  };
}

function normalizeRoom(room) {
  const startingFrom = toNumericRate(
    room.startingFrom ?? room.starting_from ?? room.base_price
  );

  const highlights = Array.isArray(room.highlights)
    ? room.highlights.filter(Boolean).slice(0, 5)
    : DEFAULT_ROOM_HIGHLIGHTS;

  const amenities = Array.isArray(room.amenities)
    ? room.amenities.filter(Boolean)
    : DEFAULT_ROOM_AMENITIES;

  const packageType = room.packageType || null;

  return {
    slug: room.slug,
    label: room.label || room.name || room.slug,
    startingFrom,
    single: room.single ?? room.single_occupancy ?? null,
    double: room.double ?? room.double_occupancy ?? null,
    highlights,
    amenities,
    // Optional package/presentation overrides (used by room cards). Absent for
    // standard per-night rooms (e.g. all Zaarang rooms) — they keep DB values.
    priceUnit: room.priceUnit || (packageType ? "package" : "night"),
    packageType,
    duration: room.duration || null,
    occupancy: room.occupancy || null,
    bedType: room.bedType || null,
    description: room.description || null,
    foodInclusions: normalizeFoodInclusions(room.foodInclusions),
    foodPlan: normalizeFoodPlan(room.foodPlan),
    foodNote: room.foodNote || null,
  };
}

function normalizeMealPlans(raw) {
  const source = Array.isArray(raw.mealPlans) ? raw.mealPlans : null;
  if (!source) return emptyMealPlans();

  // Merge provided rows onto the canonical plan order so the matrix is stable.
  return MEAL_PLANS.map((plan) => {
    const match = source.find(
      (row) => row.id === plan.id || row.label === plan.label
    );
    // A cell may carry a text note (e.g. "Available with room plan") instead of
    // a price when the exact rate is intentionally not shown in this section.
    const singleNote =
      typeof match?.singleNote === "string" ? match.singleNote : null;
    const doubleNote =
      typeof match?.doubleNote === "string" ? match.doubleNote : null;
    return {
      id: plan.id,
      label: plan.label,
      single: toNumericRate(match?.single ?? match?.single_occupancy),
      double: toNumericRate(match?.double ?? match?.double_occupancy),
      singleNote,
      doubleNote,
    };
  });
}

function normalizeTariff(raw, hotel) {
  const rooms = Array.isArray(raw.rooms) ? raw.rooms.map(normalizeRoom) : [];

  return {
    currencyCode: raw.currencyCode || hotel?.currency_code || "INR",
    note: raw.note || "",
    // Label shown wherever a rate isn't published yet (per hotel).
    unavailableLabel: raw.unavailableLabel || ON_REQUEST,
    rooms,
    // Pricing cards = same rooms (keeps cards + tariff synchronized).
    plans: rooms.map((room) => ({
      id: room.slug,
      label: room.label,
      startingFrom: room.startingFrom,
      single: room.single,
      double: room.double,
      highlights: room.highlights,
    })),
    mealPlans: normalizeMealPlans(raw),
    extraBed: raw.extraBed ?? raw.extra_bed ?? null,
    gst: raw.gst || "GST as applicable",
    checkIn: raw.checkIn || raw.check_in || hotel?.check_in_time || null,
    checkOut: raw.checkOut || raw.check_out || hotel?.check_out_time || null,
    rateIncludes:
      Array.isArray(raw.rateIncludes) && raw.rateIncludes.length > 0
        ? raw.rateIncludes
        : DEFAULT_RATE_INCLUDES,
    cancellationPolicy:
      raw.cancellationPolicy ||
      raw.cancellation_policy ||
      DEFAULT_CANCELLATION_POLICY,
  };
}

/**
 * Resolve tariff for a hotel. Prefers explicit override / API payload, then
 * slug-keyed official config.
 */
export function getHotelTariff(hotel, overrideTariff = null) {
  if (overrideTariff && Array.isArray(overrideTariff.mealPlans)) {
    const hasMealRates = overrideTariff.mealPlans.some(
      (plan) =>
        Number(plan.single) > 0 ||
        Number(plan.double) > 0 ||
        plan.singleNote ||
        plan.doubleNote
    );
    if (hasMealRates) {
      const slug = slugOf(hotel);
      const fallback =
        slug && TARIFFS_BY_SLUG[slug] ? TARIFFS_BY_SLUG[slug] : {};
      return normalizeTariff(
        {
          ...fallback,
          ...overrideTariff,
          rooms: overrideTariff.rooms?.length
            ? overrideTariff.rooms
            : fallback.rooms || [],
          mealPlans: overrideTariff.mealPlans,
        },
        hotel
      );
    }
  }

  if (overrideTariff && Array.isArray(overrideTariff.rooms)) {
    return normalizeTariff(overrideTariff, hotel);
  }

  const fromApi = hotel?.tariff || hotel?.metadata?.tariff;
  if (fromApi && Array.isArray(fromApi.rooms)) {
    return normalizeTariff(fromApi, hotel);
  }

  const slug = slugOf(hotel);
  if (slug && TARIFFS_BY_SLUG[slug]) {
    return normalizeTariff(TARIFFS_BY_SLUG[slug], hotel);
  }

  return null;
}

/** Match a room_types API row to the official tariff room entry. */
export function findTariffRoom(tariff, roomType) {
  if (!tariff?.rooms?.length || !roomType) return null;
  const slug = (roomType.slug || "").toLowerCase();
  const name = (roomType.name || "").toLowerCase();

  return (
    tariff.rooms.find((room) => room.slug === slug) ||
    tariff.rooms.find(
      (room) =>
        name.includes(room.slug) ||
        room.label.toLowerCase().includes(name) ||
        name.includes(room.label.toLowerCase().replace(/\s+room$/, ""))
    ) ||
    null
  );
}

/**
 * Starting nightly rate for a room card, or null → show On Request.
 * Never falls back to DB base_price placeholders (often 0).
 */
export function getRoomStartingPrice(hotel, roomType) {
  const basePrice = Number(roomType?.base_price);
  if (Number.isFinite(basePrice) && basePrice > 0) {
    return basePrice;
  }

  const fromMeta = Number(roomType?.metadata?.startingFrom ?? roomType?.metadata?.starting_from);
  if (Number.isFinite(fromMeta) && fromMeta > 0) {
    return fromMeta;
  }

  const tariff = getHotelTariff(hotel);
  const match = findTariffRoom(tariff, roomType);
  if (!match) return null;
  return match.startingFrom;
}

/** 4–5 highlights for a room card from the official tariff source. */
export function getRoomHighlights(hotel, roomType) {
  const fromMeta = roomType?.metadata?.highlights;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta;

  const tariff = getHotelTariff(hotel);
  const match = findTariffRoom(tariff, roomType);
  if (match?.highlights?.length) return match.highlights;
  return DEFAULT_ROOM_HIGHLIGHTS;
}

/** Core in-room amenities (icon strip) for a room card. */
export function getRoomAmenities(hotel, roomType) {
  const fromMeta = roomType?.metadata?.amenities;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) return fromMeta;

  const tariff = getHotelTariff(hotel);
  const match = findTariffRoom(tariff, roomType);
  if (match?.amenities?.length) return match.amenities;
  return DEFAULT_ROOM_AMENITIES;
}

/**
 * Optional per-room presentation/package data for a room card:
 * priceUnit ("night" | "package"), packageType, duration, occupancy override,
 * description override, and food inclusions. Returns null when the room has no
 * tariff match (so cards fall back to DB values / per-night defaults).
 */
export function getRoomPackage(hotel, roomType) {
  const fromMeta = roomType?.metadata?.package;
  if (fromMeta && typeof fromMeta === "object") {
    return {
      priceUnit: fromMeta.priceUnit || fromMeta.price_unit || "night",
      packageType: fromMeta.packageType || fromMeta.package_type || null,
      duration: fromMeta.duration || null,
      occupancy: fromMeta.occupancy || null,
      bedType: fromMeta.bedType || fromMeta.bed_type || null,
      description: fromMeta.description || null,
      foodInclusions: fromMeta.foodInclusions || fromMeta.food_inclusions || null,
      foodPlan: fromMeta.foodPlan || fromMeta.food_plan || null,
      foodNote: fromMeta.foodNote || fromMeta.food_note || null,
    };
  }

  const tariff = getHotelTariff(hotel);
  const match = findTariffRoom(tariff, roomType);
  if (!match) return null;
  return {
    priceUnit: match.priceUnit || "night",
    packageType: match.packageType || null,
    duration: match.duration || null,
    occupancy: match.occupancy || null,
    bedType: match.bedType || null,
    description: match.description || null,
    foodInclusions: match.foodInclusions || null,
    foodPlan: match.foodPlan || null,
    foodNote: match.foodNote || null,
  };
}
