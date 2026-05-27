require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");

const HOTEL_SLUG = "m2n-hotel-jaipur";

function log(message) {
  console.log(`[Seed] ${message}`);
}

function logError(message) {
  console.error(`[Seed] ${message}`);
}

async function upsertHotel() {
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
      HOTEL_SLUG,
      "M2N Hotel Jaipur",
      "Rajasthani warmth, modern comfort near Hawa Mahal",
      "M2N Hotel Jaipur offers boutique stays on MI Road with rooftop dining, curated local experiences, and easy access to Old City bazaars, Amber Fort, and Jaipur Junction (2.5 km). Ideal for families, wedding guests, and business travellers.",
      "reservations@m2nhotel.in",
      "+91-141-3558899",
      "https://www.m2nhotel.in",
      "MI Road, Panch Batti",
      "Opposite Rajmandir Cinema",
      "Jaipur",
      "Rajasthan",
      "India",
      "302001",
      "Asia/Kolkata",
      "14:00",
      "11:00",
      "INR",
      4,
      "active",
      true,
      JSON.stringify({
        brand: "M2N Hotels",
        property_code: "M2N-JPR-01",
        languages: ["hi", "en"],
        gstin: "08AABCM1234A1Z5",
      }),
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
      description: "Paid pickup from Jaipur International Airport (JAI).",
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

async function linkHotelAmenities(hotelId, amenityIds) {
  const highlights = new Set([
    "rooftop-restaurant",
    "swimming-pool",
    "complimentary-wifi",
    "airport-pickup",
  ]);

  for (const [slug, amenityId] of Object.entries(amenityIds)) {
    await query(
      `
      INSERT INTO hotel_amenities (hotel_id, amenity_id, is_highlighted, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (hotel_id, amenity_id) DO UPDATE SET
        is_highlighted = EXCLUDED.is_highlighted,
        notes = EXCLUDED.notes
      `,
      [
        hotelId,
        amenityId,
        highlights.has(slug),
        slug === "airport-pickup" ? "Advance booking recommended; charges apply." : null,
      ]
    );
  }

  log(`Linked ${Object.keys(amenityIds).length} amenities to hotel`);
}

async function upsertHotelMedia(hotelId) {
  const mediaItems = [
    {
      url: "https://images.m2nhotel.in/jaipur/facade-evening.jpg",
      alt_text: "M2N Hotel Jaipur facade at sunset",
      caption: "Heritage-pink facade on MI Road",
      sort_order: 1,
      is_cover: true,
    },
    {
      url: "https://images.m2nhotel.in/jaipur/lobby.jpg",
      alt_text: "Marble lobby with jharokha artwork",
      caption: "Lobby with Rajasthani jharokha motifs",
      sort_order: 2,
      is_cover: false,
    },
    {
      url: "https://images.m2nhotel.in/jaipur/rooftop-restaurant.jpg",
      alt_text: "Rooftop restaurant overlooking Jaipur skyline",
      caption: "Skyline views from Chokhi Dhani Rooftop",
      sort_order: 3,
      is_cover: false,
    },
    {
      url: "https://images.m2nhotel.in/jaipur/pool.jpg",
      alt_text: "Outdoor swimming pool with lounge chairs",
      caption: "Pool open October to March, 7 AM – 7 PM",
      sort_order: 4,
      is_cover: false,
    },
    {
      url: "https://images.m2nhotel.in/jaipur/deluxe-room.jpg",
      alt_text: "Deluxe room with king bed and city view",
      caption: "Deluxe room — warm tones and city-facing balcony",
      sort_order: 5,
      is_cover: false,
    },
  ];

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

async function upsertRoomTypes(hotelId) {
  const roomTypes = [
    {
      slug: "standard-room",
      name: "Standard Room",
      description:
        "Compact AC room with queen bed, LED TV, geyser, and daily housekeeping. Perfect for solo travellers and short Jaipur stops.",
      base_price: 3499.0,
      max_occupancy: 2,
      bed_type: "Queen",
      room_size_sqft: 180,
      status: "active",
      sort_order: 1,
    },
    {
      slug: "deluxe-room",
      name: "Deluxe Room",
      description:
        "Spacious room with king bed, work desk, mini-fridge, tea/coffee kit, and partial city view. Popular with couples and small families.",
      base_price: 5499.0,
      max_occupancy: 3,
      bed_type: "King",
      room_size_sqft: 260,
      status: "active",
      sort_order: 2,
    },
    {
      slug: "royal-suite",
      name: "Royal Suite",
      description:
        "Premium suite with living area, jacuzzi bath, butler call, and panoramic views towards Nahargarh. Includes welcome thali on arrival.",
      base_price: 12499.0,
      max_occupancy: 4,
      bed_type: "King + Sofa Bed",
      room_size_sqft: 520,
      status: "active",
      sort_order: 3,
    },
  ];

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
        JSON.stringify({ gst_inclusive: false, breakfast_addon_inr: 299 }),
      ]
    );

    roomTypeIds[item.slug] = result.rows[0].id;
    log(`Room type ready: ${item.slug}`);
  }

  return roomTypeIds;
}

async function upsertRooms(hotelId, roomTypeIds) {
  const rooms = [
    { room_number: "101", room_type_slug: "standard-room", floor_label: "1st Floor", status: "available" },
    { room_number: "102", room_type_slug: "standard-room", floor_label: "1st Floor", status: "available" },
    { room_number: "103", room_type_slug: "standard-room", floor_label: "1st Floor", status: "occupied" },
    { room_number: "201", room_type_slug: "deluxe-room", floor_label: "2nd Floor", status: "available" },
    { room_number: "202", room_type_slug: "deluxe-room", floor_label: "2nd Floor", status: "maintenance" },
    { room_number: "301", room_type_slug: "royal-suite", floor_label: "3rd Floor", status: "available" },
    { room_number: "302", room_type_slug: "royal-suite", floor_label: "3rd Floor", status: "blocked", notes: "Reserved for wedding group — 12–15 Nov" },
  ];

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

async function runSeed() {
  log("Starting Phase 1 seed...");

  const hotelId = await upsertHotel();
  const amenityIds = await upsertAmenities();
  await linkHotelAmenities(hotelId, amenityIds);
  await upsertHotelMedia(hotelId);
  const roomTypeIds = await upsertRoomTypes(hotelId);
  await upsertRooms(hotelId, roomTypeIds);

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
