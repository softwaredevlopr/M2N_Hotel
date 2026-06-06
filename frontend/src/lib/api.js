const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const DEFAULT_REVALIDATE_SECONDS = 60;

async function safeFetch(path, { revalidate = DEFAULT_REVALIDATE_SECONDS } = {}) {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      next: { revalidate },
      headers: { Accept: "application/json" },
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
    console.warn(`[api] fetch failed for ${path}:`, error.message);
    return null;
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
