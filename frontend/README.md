# M2N Hotels — Frontend

Next.js (App Router) public site and admin console for **M2N Hotels**.

- Dev server: `http://localhost:3000`
- API default: `http://localhost:5001` (`NEXT_PUBLIC_API_URL`)

## Scripts

```bash
npm run dev      # development
npm run build    # production build
npm start        # serve production build
```

## Key routes

| Path | Purpose |
|------|---------|
| `/` | Brand home |
| `/hotels/[slug]` | Hotel detail |
| `/admin/login` | Admin JWT login |
| `/admin/hotels` | Hotel management |
| `/admin/room-types` | Room types |
| `/admin/rooms` | Rooms inventory |
| `/admin/media` | Hotel media |

## Docs

Project documentation lives at the repo root:

- [`../README.md`](../README.md)
- [`../docs/13_ROADMAP.md`](../docs/13_ROADMAP.md)
- [`../docs/06_SETUP_GUIDE.md`](../docs/06_SETUP_GUIDE.md)
