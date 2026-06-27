require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");

function log(message) {
  console.log(`[Seed] ${message}`);
}

function logError(message) {
  console.error(`[Seed] ${message}`);
}

async function upsertHotel(hotel) {
  const result = await query(
    `
    INSERT INTO hotels (
      slug,
      name,
      tagline,
      description,
      email,
      phone,
      website_url,
      address_line1,
      address_line2,
      city,
      state,
      country,
      postal_code,
      timezone,
      check_in_time,
      check_out_time,
      currency_code,
      star_rating,
      status,
      is_featured,
      metadata
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      website_url = EXCLUDED.website_url,
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      country = EXCLUDED.country,
      postal_code = EXCLUDED.postal_code,
      timezone = EXCLUDED.timezone,
      check_in_time = EXCLUDED.check_in_time,
      check_out_time = EXCLUDED.check_out_time,
      currency_code = EXCLUDED.currency_code,
      star_rating = EXCLUDED.star_rating,
      status = EXCLUDED.status,
      is_featured = EXCLUDED.is_featured,
      metadata = EXCLUDED.metadata
    RETURNING id, slug
    `,
    [
      hotel.slug,
      hotel.name,
      hotel.tagline,
      hotel.description,
      hotel.email,
      hotel.phone,
      hotel.website_url,
      hotel.address_line1,
      hotel.address_line2,
      hotel.city,
      hotel.state,
      hotel.country,
      hotel.postal_code,
      hotel.timezone,
      hotel.check_in_time,
      hotel.check_out_time,
      hotel.currency_code,
      hotel.star_rating,
      hotel.status,
      hotel.is_featured,
      JSON.stringify(hotel.metadata || {}),
    ]
  );

  log(`Hotel ready: ${result.rows[0].slug}`);
  return result.rows[0].id;
}

async function upsertAmenities() {
  const amenities = [
    {
      slug: "complimentary-wifi",
      name: "Complimentary Wi-Fi",
      description: "High-speed internet across rooms and lobby.",
      category: "connectivity",
      icon: "wifi",
    },
    {
      slug: "rooftop-restaurant",
      name: "Rooftop Restaurant",
      description: "Multi-cuisine dining with city views.",
      category: "dining",
      icon: "restaurant",
    },
    {
      slug: "restaurant-kitchen",
      name: "Restaurant Kitchen",
      description: "On-site kitchen serving fresh meals for guests.",
      category: "dining",
      icon: "restaurant",
    },
    {
      slug: "swimming-pool",
      name: "Swimming Pool",
      description: "Outdoor pool with seasonal hours.",
      category: "leisure",
      icon: "pool",
    },
    {
      slug: "free-parking",
      name: "Free Parking",
      description: "Secure on-site parking for guests.",
      category: "transport",
      icon: "parking",
    },
    {
      slug: "air-conditioned-rooms",
      name: "Air-Conditioned Rooms",
      description: "Climate-controlled rooms with individual controls.",
      category: "room",
      icon: "ac",
    },
    {
      slug: "24x7-room-service",
      name: "24x7 Room Service",
      description: "In-room dining and housekeeping on request.",
      category: "service",
      icon: "room-service",
    },
    {
      slug: "laundry-service",
      name: "Laundry Service",
      description: "Same-day wash and press available.",
      category: "service",
      icon: "laundry",
    },
    {
      slug: "airport-pickup",
      name: "Airport Pickup",
      description: "Paid pickup from nearby airports on request.",
      category: "transport",
      icon: "car",
    },
  ];

  const amenityIds = {};

  for (const item of amenities) {
    const result = await query(
      `
      INSERT INTO amenities (slug, name, description, category, icon, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        icon = EXCLUDED.icon,
        is_active = TRUE
      RETURNING id, slug
      `,
      [item.slug, item.name, item.description, item.category, item.icon]
    );

    amenityIds[item.slug] = result.rows[0].id;
    log(`Amenity ready: ${item.slug}`);
  }

  return amenityIds;
}

async function linkHotelAmenities(hotelId, amenityIds, links) {
  for (const link of links) {
    const amenityId = amenityIds[link.slug];
    if (!amenityId) {
      log(`Skipping unknown amenity slug: ${link.slug}`);
      continue;
    }

    await query(
      `
      INSERT INTO hotel_amenities (hotel_id, amenity_id, is_highlighted, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (hotel_id, amenity_id) DO UPDATE SET
        is_highlighted = EXCLUDED.is_highlighted,
        notes = EXCLUDED.notes
      `,
      [hotelId, amenityId, link.is_highlighted, link.notes || null]
    );
  }

  log(`Linked ${links.length} amenities to hotel ${hotelId}`);
}

async function upsertHotelMedia(hotelId, mediaItems) {
  for (const item of mediaItems) {
    const existing = await query(
      `SELECT id FROM hotel_media WHERE hotel_id = $1 AND url = $2`,
      [hotelId, item.url]
    );

    if (existing.rows.length > 0) {
      await query(
        `
        UPDATE hotel_media
        SET
          alt_text = $3,
          caption = $4,
          sort_order = $5,
          is_cover = $6,
          status = 'active',
          media_type = 'image'
        WHERE hotel_id = $1 AND url = $2
        `,
        [hotelId, item.url, item.alt_text, item.caption, item.sort_order, item.is_cover]
      );
      log(`Media updated: ${item.url}`);
      continue;
    }

    await query(
      `
      INSERT INTO hotel_media (
        hotel_id, media_type, url, alt_text, caption, sort_order, is_cover, status
      )
      VALUES ($1, 'image', $2, $3, $4, $5, $6, 'active')
      `,
      [hotelId, item.url, item.alt_text, item.caption, item.sort_order, item.is_cover]
    );
    log(`Media inserted: ${item.url}`);
  }
}

async function upsertRoomTypes(hotelId, roomTypes) {
  const roomTypeIds = {};

  for (const item of roomTypes) {
    const result = await query(
      `
      INSERT INTO room_types (
        hotel_id, slug, name, description, base_price, max_occupancy,
        bed_type, room_size_sqft, status, sort_order, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (hotel_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        base_price = EXCLUDED.base_price,
        max_occupancy = EXCLUDED.max_occupancy,
        bed_type = EXCLUDED.bed_type,
        room_size_sqft = EXCLUDED.room_size_sqft,
        status = EXCLUDED.status,
        sort_order = EXCLUDED.sort_order,
        metadata = EXCLUDED.metadata
      RETURNING id, slug
      `,
      [
        hotelId,
        item.slug,
        item.name,
        item.description,
        item.base_price,
        item.max_occupancy,
        item.bed_type,
        item.room_size_sqft,
        item.status,
        item.sort_order,
        JSON.stringify(item.metadata || {}),
      ]
    );

    roomTypeIds[item.slug] = result.rows[0].id;
    log(`Room type ready: ${item.slug}`);
  }

  return roomTypeIds;
}

async function upsertRooms(hotelId, roomTypeIds, rooms) {
  for (const item of rooms) {
    const roomTypeId = roomTypeIds[item.room_type_slug];

    await query(
      `
      INSERT INTO rooms (hotel_id, room_type_id, room_number, floor_label, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (hotel_id, room_number) DO UPDATE SET
        room_type_id = EXCLUDED.room_type_id,
        floor_label = EXCLUDED.floor_label,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes
      `,
      [hotelId, roomTypeId, item.room_number, item.floor_label, item.status, item.notes || null]
    );

    log(`Room ready: ${item.room_number} (${item.room_type_slug})`);
  }
}

const ZAARANG_HOTEL = {
  slug: "hotel-zaarang-inn",
  name: "Hotel Zaarang Inn",
  tagline: "Comfortable stay near Chinhat, Lucknow",
  description:
    "Hotel Zaarang Inn offers comfortable rooms, warm hospitality, and convenient access near Deva Road, Chinhat, Lucknow. Ideal for families, business guests, and short city stays.",
  email: "reservations@m2nhotel.com",
  phone: "+91 XXXXX XXXXX",
  website_url: null,
  address_line1: "Ganeshpur Rahmanpur, Shivpuri Chauraha, Deva Rd",
  address_line2: "Opposite Kapda Kothi, Next to HP Petrol Pump, Chinhat",
  city: "Lucknow",
  state: "Uttar Pradesh",
  country: "India",
  postal_code: "226028",
  timezone: "Asia/Kolkata",
  check_in_time: "12:00",
  check_out_time: "11:00",
  currency_code: "INR",
  star_rating: null,
  status: "active",
  is_featured: true,
  metadata: {
    brand: "M2N Hotels",
    property_code: "M2N-ZI-01",
    languages: ["hi", "en"],
  },
};

const ZAARANG_AMENITY_LINKS = [
  { slug: "complimentary-wifi", is_highlighted: true },
  { slug: "free-parking", is_highlighted: true },
  { slug: "restaurant-kitchen", is_highlighted: true },
  { slug: "air-conditioned-rooms", is_highlighted: true },
  { slug: "24x7-room-service", is_highlighted: false },
  { slug: "laundry-service", is_highlighted: false },
];

const ZAARANG_MEDIA = [
  {
    url: "/hotel-exterior-2.jpg",
    alt_text: "Hotel Zaarang Inn exterior",
    caption: "Hotel Zaarang Inn",
    sort_order: 1,
    is_cover: true,
  },
  {
    url: "/hotel-exterior.jpg",
    alt_text: "Hotel Zaarang Inn front view",
    caption: "Front view",
    sort_order: 2,
    is_cover: false,
  },
  {
    url: "/lobby.jpg",
    alt_text: "Hotel lobby",
    caption: "Lobby",
    sort_order: 3,
    is_cover: false,
  },
  {
    url: "/reception.jpg",
    alt_text: "Reception area",
    caption: "Reception",
    sort_order: 4,
    is_cover: false,
  },
  {
    url: "/banquet.jpg",
    alt_text: "Banquet hall",
    caption: "Banquet hall",
    sort_order: 5,
    is_cover: false,
  },
  {
    url: "/hotel-exterior-3.jpg",
    alt_text: "Hotel exterior view",
    caption: "Exterior",
    sort_order: 6,
    is_cover: false,
  },
  {
    url: "/hotel-outside.jpg",
    alt_text: "Outside the hotel",
    caption: "Hotel surroundings",
    sort_order: 7,
    is_cover: false,
  },
  {
    url: "/hotel-entrance.jpg",
    alt_text: "Hotel entrance",
    caption: "Entrance",
    sort_order: 8,
    is_cover: false,
  },
  {
    url: "/reception-2.jpg",
    alt_text: "Reception desk",
    caption: "Reception",
    sort_order: 9,
    is_cover: false,
  },
  {
    url: "/reception-3.jpg",
    alt_text: "Reception lounge",
    caption: "Reception lounge",
    sort_order: 10,
    is_cover: false,
  },
  {
    url: "/reception-4.jpg",
    alt_text: "Reception seating",
    caption: "Reception",
    sort_order: 11,
    is_cover: false,
  },
  {
    url: "/reception-5.jpg",
    alt_text: "Reception detail",
    caption: "Reception",
    sort_order: 12,
    is_cover: false,
  },
  {
    url: "/banquet-2.jpg",
    alt_text: "Banquet hall setup",
    caption: "Banquet hall",
    sort_order: 13,
    is_cover: false,
  },
  {
    url: "/banquet-3.jpg",
    alt_text: "Banquet hall seating",
    caption: "Banquet hall",
    sort_order: 14,
    is_cover: false,
  },
  {
    url: "/banquet-4.jpg",
    alt_text: "Banquet hall stage",
    caption: "Banquet hall",
    sort_order: 15,
    is_cover: false,
  },
  {
    url: "/banquet-5.jpg",
    alt_text: "Banquet hall decor",
    caption: "Banquet hall",
    sort_order: 16,
    is_cover: false,
  },
  {
    url: "/banquet-6.jpg",
    alt_text: "Banquet hall lighting",
    caption: "Banquet hall",
    sort_order: 17,
    is_cover: false,
  },
  {
    url: "/banquet-7.jpg",
    alt_text: "Banquet hall view",
    caption: "Banquet hall",
    sort_order: 18,
    is_cover: false,
  },
  {
    url: "/banquet-8.jpg",
    alt_text: "Banquet hall arrangement",
    caption: "Banquet hall",
    sort_order: 19,
    is_cover: false,
  },
];

const ZAARANG_ROOM_TYPES = [
  {
    slug: "standard",
    name: "Standard",
    description:
      "Comfortable standard room with essential amenities for short and extended stays.",
    base_price: 0,
    max_occupancy: 2,
    bed_type: "Queen",
    room_size_sqft: null,
    status: "active",
    sort_order: 1,
    metadata: {},
  },
  {
    slug: "deluxe",
    name: "Deluxe",
    description:
      "Spacious deluxe room with added comfort for families and business guests.",
    base_price: 0,
    max_occupancy: 3,
    bed_type: "King",
    room_size_sqft: null,
    status: "active",
    sort_order: 2,
    metadata: {},
  },
  {
    slug: "suite",
    name: "Suite",
    description:
      "Premium suite with extra space for longer stays and special occasions.",
    base_price: 0,
    max_occupancy: 4,
    bed_type: "King + Sofa Bed",
    room_size_sqft: null,
    status: "active",
    sort_order: 3,
    metadata: {},
  },
];

const ZAARANG_ROOMS = [
  { room_number: "101", room_type_slug: "standard", floor_label: "1st Floor", status: "available" },
  { room_number: "102", room_type_slug: "standard", floor_label: "1st Floor", status: "available" },
  { room_number: "201", room_type_slug: "deluxe", floor_label: "2nd Floor", status: "available" },
  { room_number: "301", room_type_slug: "suite", floor_label: "3rd Floor", status: "available" },
];

const RETIRED_HOTEL_SLUGS = ["m2n-hotel-jaipur"];

const AURELIA_HOTEL = {
  slug: "m2n-hotel-aurelia-grand",
  name: "M2N Hotel : AURELIA GRAND",
  tagline: "Boutique comfort near city center",
  description:
    "M2N Hotel Aurelia Grand brings boutique comfort, warm hospitality, and convenient access in Lucknow. Designed for family stays, business guests, and short city visits, the hotel offers essential modern amenities with a professional M2N Hotels experience.",
  email: "reservations@m2nhotel.in",
  phone: "+91 XXXX XXXXX",
  website_url: null,
  address_line1: "Plot No. 76",
  address_line2:
    "Malhaur Railway Station Road, Near Urmila Hospital, Awadh Vihar Colony, Gomti Nagar",
  city: "Lucknow",
  state: "Uttar Pradesh",
  country: "India",
  postal_code: "226010",
  timezone: "Asia/Kolkata",
  check_in_time: "12:00",
  check_out_time: "11:00",
  currency_code: "INR",
  star_rating: null,
  status: "active",
  is_featured: true,
  metadata: {
    brand: "M2N Hotels",
    property_code: "M2N-LKO-01",
    languages: ["hi", "en"],
  },
};

const AURELIA_AMENITY_LINKS = [
  { slug: "complimentary-wifi", is_highlighted: true },
  { slug: "free-parking", is_highlighted: true },
  { slug: "restaurant-kitchen", is_highlighted: true },
  { slug: "air-conditioned-rooms", is_highlighted: true },
];

const AURELIA_ROOM_TYPES = [
  {
    slug: "standard",
    name: "Standard",
    description:
      "Comfortable standard room with essential amenities for short and extended stays.",
    base_price: 0,
    max_occupancy: 2,
    bed_type: "Queen",
    room_size_sqft: null,
    status: "active",
    sort_order: 1,
    metadata: {},
  },
  {
    slug: "deluxe",
    name: "Deluxe",
    description:
      "Spacious deluxe room with added comfort for families and business guests.",
    base_price: 0,
    max_occupancy: 3,
    bed_type: "King",
    room_size_sqft: null,
    status: "active",
    sort_order: 2,
    metadata: {},
  },
  {
    slug: "suite",
    name: "Suite",
    description:
      "Premium suite with extra space for longer stays and special occasions.",
    base_price: 0,
    max_occupancy: 4,
    bed_type: "King + Sofa Bed",
    room_size_sqft: null,
    status: "active",
    sort_order: 3,
    metadata: {},
  },
];

const AURELIA_ROOMS = [
  { room_number: "101", room_type_slug: "standard", floor_label: "1st Floor", status: "available" },
  { room_number: "102", room_type_slug: "standard", floor_label: "1st Floor", status: "available" },
  { room_number: "201", room_type_slug: "deluxe", floor_label: "2nd Floor", status: "available" },
  { room_number: "301", room_type_slug: "suite", floor_label: "3rd Floor", status: "available" },
];

const AURELIA_MEDIA = [
  {
    url: "/hotel-exterior-2.jpg",
    alt_text: "M2N Hotel Aurelia Grand exterior",
    caption: "M2N Hotel Aurelia Grand",
    sort_order: 1,
    is_cover: true,
  },
  {
    url: "/hotel-exterior.jpg",
    alt_text: "M2N Hotel Aurelia Grand front view",
    caption: "Front view",
    sort_order: 2,
    is_cover: false,
  },
  {
    url: "/lobby.jpg",
    alt_text: "Hotel lobby",
    caption: "Lobby",
    sort_order: 3,
    is_cover: false,
  },
  {
    url: "/reception.jpg",
    alt_text: "Reception area",
    caption: "Reception",
    sort_order: 4,
    is_cover: false,
  },
  {
    url: "/banquet.jpg",
    alt_text: "Banquet hall",
    caption: "Banquet hall",
    sort_order: 5,
    is_cover: false,
  },
  {
    url: "/hotel-exterior-3.jpg",
    alt_text: "Hotel exterior view",
    caption: "Exterior",
    sort_order: 6,
    is_cover: false,
  },
  {
    url: "/hotel-outside.jpg",
    alt_text: "Outside the hotel",
    caption: "Hotel surroundings",
    sort_order: 7,
    is_cover: false,
  },
  {
    url: "/hotel-entrance.jpg",
    alt_text: "Hotel entrance",
    caption: "Entrance",
    sort_order: 8,
    is_cover: false,
  },
  {
    url: "/reception-2.jpg",
    alt_text: "Reception desk",
    caption: "Reception",
    sort_order: 9,
    is_cover: false,
  },
  {
    url: "/reception-3.jpg",
    alt_text: "Reception lounge",
    caption: "Reception lounge",
    sort_order: 10,
    is_cover: false,
  },
  {
    url: "/reception-4.jpg",
    alt_text: "Reception seating",
    caption: "Reception",
    sort_order: 11,
    is_cover: false,
  },
  {
    url: "/banquet-2.jpg",
    alt_text: "Banquet hall setup",
    caption: "Banquet hall",
    sort_order: 12,
    is_cover: false,
  },
  {
    url: "/banquet-3.jpg",
    alt_text: "Banquet hall seating",
    caption: "Banquet hall",
    sort_order: 13,
    is_cover: false,
  },
  {
    url: "/banquet-4.jpg",
    alt_text: "Banquet hall stage",
    caption: "Banquet hall",
    sort_order: 14,
    is_cover: false,
  },
  {
    url: "/banquet-5.jpg",
    alt_text: "Banquet hall decor",
    caption: "Banquet hall",
    sort_order: 15,
    is_cover: false,
  },
  {
    url: "/banquet-6.jpg",
    alt_text: "Banquet hall lighting",
    caption: "Banquet hall",
    sort_order: 16,
    is_cover: false,
  },
  {
    url: "/banquet-7.jpg",
    alt_text: "Banquet hall view",
    caption: "Banquet hall",
    sort_order: 17,
    is_cover: false,
  },
  {
    url: "/banquet-8.jpg",
    alt_text: "Banquet hall arrangement",
    caption: "Banquet hall",
    sort_order: 18,
    is_cover: false,
  },
  {
    url: "/bathroom.jpg",
    alt_text: "Guest bathroom",
    caption: "Bathroom",
    sort_order: 19,
    is_cover: false,
  },
  {
    url: "/bathroom-2.jpg",
    alt_text: "Guest bathroom detail",
    caption: "Bathroom",
    sort_order: 20,
    is_cover: false,
  },
];

async function deactivateRetiredHotels(slugs) {
  for (const slug of slugs) {
    const result = await query(
      `
      UPDATE hotels
      SET status = 'inactive'
      WHERE slug = $1 AND status <> 'inactive'
      RETURNING id
      `,
      [slug]
    );

    if (result.rows.length > 0) {
      log(`Retired hotel deactivated: ${slug}`);
    }
  }
}

async function seedProperty({ hotel, amenityIds, amenityLinks, media, roomTypes, rooms }) {
  log(`--- Seeding property: ${hotel.slug} ---`);
  const hotelId = await upsertHotel(hotel);
  await linkHotelAmenities(hotelId, amenityIds, amenityLinks);

  if (Array.isArray(media) && media.length > 0) {
    await upsertHotelMedia(hotelId, media);
  } else {
    log(`No media seeded for ${hotel.slug}`);
  }

  const roomTypeIds = await upsertRoomTypes(hotelId, roomTypes);
  await upsertRooms(hotelId, roomTypeIds, rooms);
}

async function runSeed() {
  log("Starting Phase 1 seed...");

  const amenityIds = await upsertAmenities();

  await deactivateRetiredHotels(RETIRED_HOTEL_SLUGS);

  await seedProperty({
    hotel: ZAARANG_HOTEL,
    amenityIds,
    amenityLinks: ZAARANG_AMENITY_LINKS,
    media: ZAARANG_MEDIA,
    roomTypes: ZAARANG_ROOM_TYPES,
    rooms: ZAARANG_ROOMS,
  });

  await seedProperty({
    hotel: AURELIA_HOTEL,
    amenityIds,
    amenityLinks: AURELIA_AMENITY_LINKS,
    media: AURELIA_MEDIA,
    roomTypes: AURELIA_ROOM_TYPES,
    rooms: AURELIA_ROOMS,
  });

  log("Phase 1 seed completed successfully (idempotent).");
}

runSeed()
  .catch((error) => {
    logError(`FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    log("Database pool closed.");
  });
