const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001";

const DEFAULT_REVALIDATE_SECONDS = 60;

const DEFAULT_TIMEOUT_MS = 8000;

async function safeFetch(
  path,
  { revalidate = DEFAULT_REVALIDATE_SECONDS, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      next: { revalidate },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[api] ${response.status} on ${path}`);
      return null;
    }

    const json = await response.json();
    if (!json || json.success !== true) {
      console.warn(`[api] response not successful for ${path}`);
      return null;
    }

    return json;
  } catch (error) {
    const reason = error.name === "AbortError" ? "timed out" : error.message;
    console.warn(`[api] fetch failed for ${path}: ${reason}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHotels() {
  const result = await safeFetch("/api/hotels");
  return result?.data ?? [];
}

export async function getHotelBySlug(slug) {
  if (!slug) return null;
  const result = await safeFetch(`/api/hotels/${encodeURIComponent(slug)}`);
  return result?.data ?? null;
}

export async function getRoomTypes(hotelSlug) {
  const params = hotelSlug
    ? `?hotel_slug=${encodeURIComponent(hotelSlug)}`
    : "";
  const result = await safeFetch(`/api/rooms/types${params}`);
  return result?.data ?? [];
}

export async function getRooms(hotelSlug) {
  if (!hotelSlug) return [];
  const params = `?hotel_slug=${encodeURIComponent(hotelSlug)}`;
  const result = await safeFetch(`/api/rooms${params}`);
  return result?.data ?? [];
}

export async function getTariffsByHotelSlug(hotelSlug) {
  if (!hotelSlug) return null;
  const result = await safeFetch(
    `/api/tariffs?hotel_slug=${encodeURIComponent(hotelSlug)}`
  );
  return result?.data ?? null;
}

export async function getHotelsWithDetails() {
  const hotels = await getHotels();
  if (hotels.length === 0) return [];

  const detailed = await Promise.all(
    hotels.map(async (hotel) => {
      const full = await getHotelBySlug(hotel.slug);
      return full || hotel;
    })
  );

  return detailed;
}

/**
 * Fetch everything needed for a hotel detail page in one call.
 * Throws when the hotel itself cannot be loaded so route error boundaries
 * can surface a recovery UI; room types may still be empty on partial failure.
 */
export async function getHotelPageData(slug) {
  if (!slug) {
    throw new Error("Hotel slug is required");
  }

  const [hotel, roomTypes, hotels, tariff] = await Promise.all([
    getHotelBySlug(slug),
    getRoomTypes(slug),
    getHotels(),
    getTariffsByHotelSlug(slug),
  ]);

  if (!hotel) {
    throw new Error(`Hotel not found: ${slug}`);
  }

  return { hotel, roomTypes, hotels, tariff };
}

/**
 * Submit a booking inquiry to POST /api/inquiries.
 * Client-safe (no Next.js cache options). Returns a normalized result so the
 * form can show success / validation / network errors without guessing shape.
 */
export async function createInquiry(payload) {
  const url = `${API_BASE_URL}/api/inquiries`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

/**
 * Everything the public booking flow needs: the hotel collection plus each
 * property's room types and physical rooms (used for the sellable-inventory
 * guard before submitting).
 */
export async function getBookingPageData() {
  const hotels = await getHotelsWithDetails();
  if (hotels.length === 0) {
    return {
      hotels: [],
      roomTypesByHotel: {},
      roomsByHotel: {},
      tariffsByHotel: {},
    };
  }

  const perHotel = await Promise.all(
    hotels.map(async (hotel) => {
      const [roomTypes, rooms, tariff] = await Promise.all([
        getRoomTypes(hotel.slug),
        getRooms(hotel.slug),
        getTariffsByHotelSlug(hotel.slug),
      ]);
      return { slug: hotel.slug, roomTypes, rooms, tariff };
    })
  );

  const roomTypesByHotel = {};
  const roomsByHotel = {};
  const tariffsByHotel = {};
  perHotel.forEach(({ slug, roomTypes, rooms, tariff }) => {
    roomTypesByHotel[slug] = roomTypes;
    roomsByHotel[slug] = rooms;
    tariffsByHotel[slug] = tariff;
  });

  return { hotels, roomTypesByHotel, roomsByHotel, tariffsByHotel };
}

/**
 * Live room availability for a stay window — GET /api/bookings/availability.
 * Client-safe. Returns a normalized result so the booking UI can show loading,
 * empty, validation and network states without guessing response shape.
 */
export async function getBookingAvailability({
  hotelId,
  hotelSlug,
  roomTypeId,
  checkInDate,
  checkOutDate,
  numberOfRooms = 1,
} = {}) {
  const params = new URLSearchParams();
  if (hotelId) params.set("hotel_id", hotelId);
  if (hotelSlug) params.set("hotel_slug", hotelSlug);
  if (roomTypeId) params.set("room_type_id", roomTypeId);
  if (checkInDate) params.set("check_in_date", checkInDate);
  if (checkOutDate) params.set("check_out_date", checkOutDate);
  if (numberOfRooms != null) params.set("number_of_rooms", String(numberOfRooms));

  const url = `${API_BASE_URL}/api/bookings/availability?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

/**
 * Create a reservation — POST /api/bookings.
 * Client-safe. Returns a normalized result so the flow can distinguish
 * validation errors (400), availability conflicts (409) and network failures.
 */
export async function createBooking(payload) {
  const url = `${API_BASE_URL}/api/bookings`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

/**
 * Guest booking lookup — GET /api/bookings/:bookingNumber.
 * The API requires the email or phone held on the reservation; a wrong
 * reference and a failed contact check both return 404 by design.
 */
export async function getBookingByNumber(bookingNumber, { email, phone } = {}) {
  if (!bookingNumber) {
    return { ok: false, status: 400, data: null };
  }

  const params = new URLSearchParams();
  if (email) params.set("email", email);
  if (phone) params.set("phone", phone);

  const url = `${API_BASE_URL}/api/bookings/${encodeURIComponent(
    bookingNumber
  )}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

async function postGuestBookingAction(bookingNumber, pathSuffix, body) {
  if (!bookingNumber) {
    return { ok: false, status: 400, data: null };
  }

  const url = `${API_BASE_URL}/api/bookings/${encodeURIComponent(
    bookingNumber
  )}${pathSuffix}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

/**
 * Guest self-service cancel — POST /api/bookings/:bookingNumber/cancel.
 * Requires the email or phone held on the reservation (same proof as lookup).
 */
export async function cancelBookingByNumber(
  bookingNumber,
  { email, phone, cancellation_reason } = {}
) {
  const body = {};
  if (email) body.email = email;
  if (phone) body.phone = phone;
  if (cancellation_reason !== undefined) {
    body.cancellation_reason = cancellation_reason;
  }
  return postGuestBookingAction(bookingNumber, "/cancel", body);
}

/**
 * Guest stay-modify preview — POST /api/bookings/:bookingNumber/modify/preview.
 * Contact-verified; does not write. Uses exclude-self availability server-side.
 */
export async function previewModifyBookingByNumber(bookingNumber, payload = {}) {
  const body = {};
  if (payload.email) body.email = payload.email;
  if (payload.phone) body.phone = payload.phone;
  if (payload.check_in_date) body.check_in_date = payload.check_in_date;
  if (payload.check_out_date) body.check_out_date = payload.check_out_date;
  if (payload.room_type_id) body.room_type_id = payload.room_type_id;
  if (payload.number_of_rooms != null) {
    body.number_of_rooms = Number(payload.number_of_rooms);
  }
  return postGuestBookingAction(bookingNumber, "/modify/preview", body);
}

/**
 * Guest stay modification — POST /api/bookings/:bookingNumber/modify.
 * Contact-verified; server recalculates pricing and revalidates inventory.
 */
export async function modifyBookingByNumber(bookingNumber, payload = {}) {
  const body = {};
  if (payload.email) body.email = payload.email;
  if (payload.phone) body.phone = payload.phone;
  if (payload.check_in_date) body.check_in_date = payload.check_in_date;
  if (payload.check_out_date) body.check_out_date = payload.check_out_date;
  if (payload.room_type_id) body.room_type_id = payload.room_type_id;
  if (payload.number_of_rooms != null) {
    body.number_of_rooms = Number(payload.number_of_rooms);
  }
  return postGuestBookingAction(bookingNumber, "/modify", body);
}

/**
 * Guest notification preferences —
 * POST /api/bookings/:bookingNumber/notification-preferences.
 * Contact-verified; does not gate confirm/cancel emails.
 */
export async function updateNotificationPreferencesByNumber(
  bookingNumber,
  { email, phone, notification_preferences } = {}
) {
  const body = { notification_preferences };
  if (email) body.email = email;
  if (phone) body.phone = phone;
  return postGuestBookingAction(
    bookingNumber,
    "/notification-preferences",
    body
  );
}

/**
 * Admin login — POST /api/admin/auth/login
 * Returns { ok, status, data, networkError?, message? }
 * On success, data matches backend: { admin, access_token, token_type, expires_in }
 */
export async function adminLogin({ email, password }) {
  const url = `${API_BASE_URL}/api/admin/auth/login`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

/**
 * Public self-serve onboarding — POST /api/admin/onboarding
 * Returns { ok, status, data, networkError?, message? }
 * On success, data includes tenant, admin, hotel, access_token, token_type, expires_in
 */
export async function adminOnboard(payload) {
  const url = `${API_BASE_URL}/api/admin/onboarding`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

export { API_BASE_URL };
