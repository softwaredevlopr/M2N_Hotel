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

export { API_BASE_URL };
