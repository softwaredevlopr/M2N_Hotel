# M2N Hotels — Frontend

Next.js **16.2.6** (React **19.2.4**, App Router, Tailwind **4**) public site and
admin console for **M2N Hotels**.

- Dev server: `http://localhost:3000`
- API: `NEXT_PUBLIC_API_BASE_URL` (preferred) or legacy `NEXT_PUBLIC_API_URL`
  (default `http://localhost:5001`)
- Site URL: `NEXT_PUBLIC_SITE_URL` (SEO / OG)

## Scripts

```bash
npm run dev      # development
npm run build    # production build (NEXT_PUBLIC_* must be set first)
npm start        # serve production build
```

## Key routes

| Path | Purpose |
|------|---------|
| `/` · `/about` · `/hotels/[slug]` | Public marketing |
| `/book` · `/booking` · `/booking/[bookingNumber]` | Guest booking |
| `/login` | Guest accounts stub (not implemented) |
| `/admin/login` · `/admin/onboarding` | Admin auth / self-serve signup |
| `/admin/*` | Protected console (front desk, bookings, guests, inventory, hotels, rooms, media, tariffs, inquiries, billing) |

Admin JWT is stored in browser `localStorage` (`m2n_admin_access_token`,
`m2n_admin_profile`).

## Docs

- [`../README.md`](../README.md)
- [`../docs/01_PROJECT_STATUS.md`](../docs/01_PROJECT_STATUS.md)
- [`../docs/06_SETUP_GUIDE.md`](../docs/06_SETUP_GUIDE.md)
- [`../docs/12_DEPLOYMENT.md`](../docs/12_DEPLOYMENT.md)
