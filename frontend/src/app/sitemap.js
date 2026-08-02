import { SITE_URL } from "@/lib/brand";
import { getHotels } from "@/lib/api";

export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();

  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let hotelRoutes = [];
  try {
    const hotels = await getHotels();
    hotelRoutes = (hotels || [])
      .filter((hotel) => hotel?.slug)
      .map((hotel) => ({
        url: `${SITE_URL}/hotels/${hotel.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      }));
  } catch {
    // If the API is unreachable at build time, still emit the static routes.
    hotelRoutes = [];
  }

  return [...staticRoutes, ...hotelRoutes].map((route) => ({
    ...route,
    lastModified: now,
  }));
}
