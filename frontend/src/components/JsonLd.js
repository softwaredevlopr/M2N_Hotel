// Renders a JSON-LD structured-data script for SEO. `data` must be a plain,
// serializable object (no user-controlled HTML).
export default function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
