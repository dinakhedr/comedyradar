# Social image templates

Images for Instagram made from the database in the super admin panel
(**Social images**, `/admin/social`). Each template is a PNG drawn on the server
with `ImageResponse` from `next/og` (Satori + Resvg). Super admin only (with 2-step).

## How a template is built (follow this for new ones)

| Piece | Where |
| --- | --- |
| Drawing (JSX with inline styles, flexbox only) | `src/lib/social/<template>.tsx` |
| Text rules (name split, possessive, font auto-fit) | `src/lib/social/text.ts` (tested in `text.test.ts`) |
| Fonts, logo, photo as data URL, super admin check | `src/lib/social/server.ts` |
| Image route | `src/app/api/admin/social/<template>/[slug]/route.tsx` |
| Admin page | `src/app/admin/(panel)/social/page.tsx` + `src/components/admin/social-images.tsx` |
| Render test (real PNG, checks the size) | `src/lib/social/render.test.ts` |

Rules for every template:
- Fonts are TTF files in `assets/fonts/` (not `public`), read with `readFile`. `next.config.ts`
  (`outputFileTracingIncludes`) ships them with the route on Vercel.
- The logo is `public/brand/logos/comedy-radar-horizontal-dark.svg`, inlined as a data URL.
- Photos are fetched on the server and passed as data URLs (JPEG, PNG or GIF, up to 6 MB, 8 s).
  If a photo is missing or fails, the template draws its placeholder instead of failing.
- Route answers 403 to anyone who is not the super admin with 2-step done.
- `?download=1` sets `Content-Disposition: attachment` and logs the download in the
  Activity log (action `generate_social_image`, through `public.admin_log_social_image`).
- Brand only: no handle, labels, pills, prices, gradients or shadows unless the template says so.

To try a template locally: `SOCIAL_OUT=/some/folder npx vitest run src/lib/social/render.test.ts`
saves the test PNGs (add `SOCIAL_PHOTO=data:image/jpeg;base64,...` for a real photo).

Ideas for later templates, same pattern: show announcement (1080 × 1350), story (1080 × 1920).

---

## 1. Comedian Feature (`comedian-feature`)

Reference: `docs/social-templates/comedian-feature.png`.
Route: `GET /api/admin/social/comedian-feature/[slug]` → 1080 × 1350 PNG.
Query: `firstName` (optional override), `download=1` (file name `comedy-radar-<slug>-feature.png`).
Data: `comedians.name` (English), `slug`, `photo_url`.

**Names.** First name = `firstName` if given, else the first word of the English name.
Last name = the rest of the name (several words allowed, may be empty).

**Root:** background #2B0B4F, position relative, overflow hidden, flex column, align-items center,
padding 48px 72px 220px.

1. **Logo row:** full width, logo left-aligned, 520 × 250, object-fit contain, marginLeft −48.
2. **Radar block:** 560 × 560, marginTop −56, position relative. Inline SVG (viewBox 0 0 560 560), in order:
   - Sweep wedge: `M 280 280 L 280 4 A 276 276 0 0 1 554.9 304.1 Z`, fill #FFD60A, opacity 0.12
   - Crosshair: lines (280,0)–(280,560) and (0,280)–(560,280), stroke #F1EAFB, width 2, opacity 0.12
   - Outer ring: circle (280,280) r 227, no fill, stroke #FFD60A, width 4, opacity 0.22
   - Inner ring: r 204, stroke #FF4D8D, width 4, opacity 0.40
   - Signal dots: (425.9,106.1) r 13 #FF4D8D; (149.8,465.9) r 10 #FFD60A; (103.3,178.0) r 8 #FFD60A opacity 0.8
   - Photo: absolute at left 100, top 100, 360 × 360 circle, border 6px solid #FFD60A, photo object-fit cover.
     No photo: #4A1470 (Radar Plum) fill with a light person icon (#F1EAFB, opacity 0.75).
3. **Spacer** 20px.
4. **Name:** Luckiest Guy, 104px, line-height 0.92, uppercase, centred, two lines: first name #FFFFFF,
   last name #FFD60A. Auto-fit: if either line is wider than 936px (estimate: characters × 0.62 × font size),
   both lines get smaller together, down to 72px at least.
5. **Yellow CTA band:** absolute, left 0, right 0, bottom 0, height 220, background #FFD60A, padding 0 72px,
   flex row, align center, space-between, gap 32.
   - Left: Luckiest Guy 58px, line-height 1.08, uppercase, #2B0B4F, two lines: `Find {FirstName}'s shows` /
     `on our radar`. A first name ending in "s" gets only an apostrophe (`Find Abbas' shows`).
     Auto-shrink (down to 44px) if line 1 is wider than 760px.
   - Right: 112 × 112 circle, #2B0B4F, yellow arrow (`M5 12h14M13 6l6 6-6 6`, 44 × 44, stroke #FFD60A, width 2.5, round caps and joins).
