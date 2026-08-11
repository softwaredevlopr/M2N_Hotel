const { pool } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const { generateBookingNumber } = require("../utils/bookingNumber");
const {
  INVENTORY_BLOCKING_STATUSES,
  SELLABLE_ROOM_STATUSES,
} = require("../utils/bookingConstants");
const {
  loadInventoryOverrides,
  summarizeStayAvailability,
} = require("./inventoryCapacity");

const UNIQUE_VIOLATION = "23505";
const BOOKING_NUMBER_MAX_ATTEMPTS = 5;

/**
 * Serialises concurrent reservations for the same hotel + room type for the rest
 * of the transaction. A transaction-scoped advisory lock is used rather than
 * relying only on row locks, because a room type with zero rows would otherwise
 * lock nothing and two callers could both read the same availability.
 */
async function lockRoomTypeInventory(client, hotelId, roomTypeId) {
  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
    [hotelId, roomTypeId]
  );
}

async function loadHotelForBooking(client, hotelId) {
  const result = await client.query(
    `SELECT id, slug, name, status, currency_code
     FROM hotels
     WHERE id = $1
     LIMIT 1`,
    [hotelId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }
  return result.rows[0];
}

async function loadRoomTypeForBooking(client, roomTypeId, hotelId) {
  const result = await client.query(
    `SELECT id, hotel_id, slug, name, status, base_price, max_occupancy
     FROM room_types
     WHERE id = $1
     LIMIT 1`,
    [roomTypeId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Room type not found: ${roomTypeId}`, 404);
  }

  const roomType = result.rows[0];
  if (roomType.hotel_id !== hotelId) {
    throw new AppError("room_type_id does not belong to the selected hotel", 400);
  }
  return roomType;
}

/**
 * Physical inventory for a room type. Rows are locked FOR SHARE so the room list
 * cannot be changed by a concurrent admin edit while this transaction decides.
 */
async function countSellableRooms(client, hotelId, roomTypeId) {
  const result = await client.query(
    `SELECT id
     FROM rooms
     WHERE hotel_id = $1
       AND room_type_id = $2
       AND status = ANY($3::text[])
     FOR SHARE`,
    [hotelId, roomTypeId, SELLABLE_ROOM_STATUSES]
  );
  return result.rows.length;
}

/**
 * Peak rooms already committed on any single night of the requested stay.
 *
 * Summing overlapping reservations would over-count: two bookings can each
 * overlap the requested range without overlapping each other. Occupancy is
 * therefore evaluated per night and the busiest night wins. Nights are
 * half-open — the checkout date is free for the next guest.
 */
async function getNightlySoldMap(
  client,
  { roomTypeId, checkIn, checkOut, excludeBookingId = null }
) {
  const result = await client.query(
    `WITH nights AS (
       SELECT generate_series($2::date, $3::date - 1, INTERVAL '1 day')::date AS night
     )
     SELECT n.night::text AS night,
            COALESCE(SUM(b.number_of_rooms), 0)::int AS occupied
     FROM nights n
     LEFT JOIN bookings b
       ON b.room_type_id = $1
      AND b.booking_status = ANY($4::text[])
      AND b.check_in_date <= n.night
      AND b.check_out_date > n.night
      AND ($5::uuid IS NULL OR b.id <> $5::uuid)
     GROUP BY n.night`,
    [
      roomTypeId,
      checkIn,
      checkOut,
      INVENTORY_BLOCKING_STATUSES,
      excludeBookingId,
    ]
  );
  const map = new Map();
  result.rows.forEach((row) => {
    map.set(String(row.night).slice(0, 10), row.occupied);
  });
  return map;
}

async function getAvailability(
  client,
  { hotelId, roomTypeId, checkIn, checkOut, excludeBookingId = null }
) {
  const totalRooms = await countSellableRooms(client, hotelId, roomTypeId);
  const nightsSoldMap = await getNightlySoldMap(client, {
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId,
  });

  const lastNight = (() => {
    const d = new Date(`${checkOut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const overridesByType = await loadInventoryOverrides(client, {
    hotelId,
    roomTypeIds: [roomTypeId],
    from: checkIn,
    to: lastNight < checkIn ? checkIn : lastNight,
  });
  const overridesByDate = overridesByType.get(roomTypeId) || new Map();

  const summary = summarizeStayAvailability({
    physical: totalRooms,
    nightsSoldMap,
    overridesByDate,
    checkIn,
    checkOut,
  });

  return {
    total_rooms: summary.total_rooms,
    booked_rooms: summary.booked_rooms,
    available_rooms: summary.available_rooms,
    stop_sell: summary.stop_sell,
  };
}

function assertInventoryAvailable(availability, requestedRooms) {
  if (availability.stop_sell) {
    throw new AppError(
      "This room type is not available (stop-sell) for the selected dates",
      409
    );
  }
  if (availability.total_rooms === 0 && availability.available_rooms === 0) {
    throw new AppError(
      "No bookable rooms are configured for this room type",
      409
    );
  }
  if (requestedRooms > availability.available_rooms) {
    throw new AppError(
      `Only ${availability.available_rooms} room(s) of this type are available for the selected dates`,
      409
    );
  }
}

async function insertBookingWithNumber(client, values) {
  for (let attempt = 0; attempt < BOOKING_NUMBER_MAX_ATTEMPTS; attempt += 1) {
    const bookingNumber = generateBookingNumber();
    try {
      // Nested savepoint: a duplicate booking_number must not poison the
      // surrounding transaction, so only this INSERT is rolled back on retry.
      await client.query("SAVEPOINT booking_number_attempt");
      const result = await client.query(
        `INSERT INTO bookings (
           booking_number, hotel_id, room_type_id, room_id,
           guest_name, guest_email, guest_phone,
           check_in_date, check_out_date,
           adults, children, number_of_rooms,
           booking_source, booking_status, payment_status,
           special_requests, admin_notes,
           subtotal, tax_amount, total_amount, currency,
           created_by_admin_id, confirmed_at
         )
         VALUES (
           $1, $2, $3, $4,
           $5, $6, $7,
           $8, $9,
           $10, $11, $12,
           $13, $14, $15,
           $16, $17,
           $18, $19, $20, $21,
           $22, $23
         )
         RETURNING id`,
        [
          bookingNumber,
          values.hotel_id,
          values.room_type_id,
          values.room_id,
          values.guest_name,
          values.guest_email,
          values.guest_phone,
          values.check_in_date,
          values.check_out_date,
          values.adults,
          values.children,
          values.number_of_rooms,
          values.booking_source,
          values.booking_status,
          values.payment_status,
          values.special_requests,
          values.admin_notes ?? null,
          values.subtotal,
          values.tax_amount,
          values.total_amount,
          values.currency,
          values.created_by_admin_id,
          values.confirmed_at,
        ]
      );
      await client.query("RELEASE SAVEPOINT booking_number_attempt");
      return result.rows[0].id;
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT booking_number_attempt");
      if (error.code !== UNIQUE_VIOLATION) throw error;
    }
  }

  throw new AppError(
    "Could not allocate a unique booking number. Please retry.",
    503
  );
}

/**
 * Creates a reservation inside a single transaction:
 * lock room type → validate property/room type → recount availability → insert.
 *
 * A specific room is intentionally NOT auto-allocated. The schema has no
 * per-room date blocking, so room assignment stays an explicit admin action.
 */
async function createBooking(payload) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await lockRoomTypeInventory(client, payload.hotel_id, payload.room_type_id);

    const hotel = await loadHotelForBooking(client, payload.hotel_id);
    if (payload.require_active_hotel && hotel.status !== "active") {
      throw new AppError("This property is not open for online booking", 409);
    }

    const roomType = await loadRoomTypeForBooking(
      client,
      payload.room_type_id,
      payload.hotel_id
    );
    if (payload.require_active_room_type && roomType.status !== "active") {
      throw new AppError("This room type is not open for online booking", 409);
    }

    const availability = await getAvailability(client, {
      hotelId: payload.hotel_id,
      roomTypeId: payload.room_type_id,
      checkIn: payload.check_in_date,
      checkOut: payload.check_out_date,
    });
    assertInventoryAvailable(availability, payload.number_of_rooms);

    const bookingId = await insertBookingWithNumber(client, {
      ...payload,
      currency: payload.currency || hotel.currency_code || "INR",
      confirmed_at: payload.booking_status === "confirmed" ? new Date() : null,
    });

    await client.query("COMMIT");
    return { bookingId, availability };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Re-validates inventory for an existing reservation whose dates, room type or
 * room count are changing. Runs in its own transaction with the same locking.
 */
async function revalidateBookingInventory({
  bookingId,
  hotelId,
  roomTypeId,
  checkIn,
  checkOut,
  numberOfRooms,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await lockRoomTypeInventory(client, hotelId, roomTypeId);
    await loadRoomTypeForBooking(client, roomTypeId, hotelId);

    const availability = await getAvailability(client, {
      hotelId,
      roomTypeId,
      checkIn,
      checkOut,
      excludeBookingId: bookingId,
    });
    assertInventoryAvailable(availability, numberOfRooms);

    await client.query("COMMIT");
    return availability;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates that a physical room can be attached to a reservation: same hotel,
 * same room type, sellable, and not already held by an overlapping reservation.
 */
async function assertRoomAssignable({
  bookingId,
  roomId,
  hotelId,
  roomTypeId,
  checkIn,
  checkOut,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `SELECT id, hotel_id, room_type_id, room_number, status
       FROM rooms
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [roomId]
    );
    if (roomResult.rows.length === 0) {
      throw new AppError(`Room not found: ${roomId}`, 404);
    }

    const room = roomResult.rows[0];
    if (room.hotel_id !== hotelId) {
      throw new AppError("room_id does not belong to the booking's hotel", 400);
    }
    if (room.room_type_id !== roomTypeId) {
      throw new AppError(
        "room_id does not belong to the booking's room type",
        400
      );
    }
    if (!SELLABLE_ROOM_STATUSES.includes(room.status)) {
      throw new AppError(`Room ${room.room_number} is ${room.status}`, 409);
    }

    const clash = await client.query(
      `SELECT booking_number
       FROM bookings
       WHERE room_id = $1
         AND id <> $2
         AND booking_status = ANY($3::text[])
         AND check_in_date < $5
         AND check_out_date > $4
       LIMIT 1`,
      [roomId, bookingId, INVENTORY_BLOCKING_STATUSES, checkIn, checkOut]
    );
    if (clash.rows.length > 0) {
      throw new AppError(
        `Room ${room.room_number} is already assigned to booking ${clash.rows[0].booking_number} for overlapping dates`,
        409
      );
    }

    await client.query("COMMIT");
    return room;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Read-only availability probe used by validation and admin tooling. */
async function checkAvailability({
  hotelId,
  roomTypeId,
  checkIn,
  checkOut,
  excludeBookingId = null,
}) {
  const client = await pool.connect();
  try {
    return await getAvailability(client, {
      hotelId,
      roomTypeId,
      checkIn,
      checkOut,
      excludeBookingId,
    });
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  revalidateBookingInventory,
  assertRoomAssignable,
  checkAvailability,
};
