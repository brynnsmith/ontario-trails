# 🥾 Ontario Trail Tracker — Tech Stack & Architecture Plan

## Project Overview

A full-stack web application for tracking hikes across Ontario using the **Ontario Trail Network (OTN)** open government dataset. Users can explore trails on an interactive map, mark trails as hiked, attach notes and photos, and generate a wish list of future hikes.

---

## Data Source: Ontario Trail Network API

The OTN is published by the Ontario Ministry of Natural Resources & Forestry on **Ontario GeoHub**, which is powered by **ArcGIS/Esri**. This means it exposes a standard **ArcGIS Feature Service REST API** — no API key required, fully public.

### Key Endpoints

| Dataset | Type | Notes |
|---|---|---|
| **OTN Segment** | `Polyline` | Trail routes, names, permitted uses, lengths, descriptions |
| **OTN Access Point** | `Point` | Trailheads and entry points |

### REST API Pattern (ArcGIS Feature Service)

```
Base URL (Segments):
https://services9.arcgis.com/00sg1vFecuAi9qe/arcgis/rest/services/
  Ontario_Trail_Network_OTN_Segment/FeatureServer/0/query

Base URL (Access Points):
https://services9.arcgis.com/00sg1vFecuAi9qe/arcgis/rest/services/
  Ontario_Trail_Network_OTN_Access_Point/FeatureServer/0/query
```

### Useful Query Parameters

```
?where=1=1                  # all features
&outFields=*                 # all attributes (name, trail assoc, use type, length, etc.)
&outSR=4326                  # WGS84 lat/lng (compatible with Mapbox)
&f=geojson                   # return as GeoJSON ✅
&resultOffset=0              # pagination
&resultRecordCount=1000      # page size (max ~2000)
```

### Key Trail Attributes Available

- `TRAIL_NAME` — name of the trail
- `TRAIL_ASSOCIATION` — managing organization
- `PERMITTED_USE` — hiking, cycling, skiing, etc.
- `TOTAL_LENGTH_KM` — trail length
- `DESCRIPTION` — trail notes
- `STATUS` — open/closed

> ⚠️ The dataset is large (~100k+ segments province-wide). We'll need **bounding box filtering** and **pagination** to load data efficiently for the visible map area.

---

## Recommended Tech Stack

### Frontend

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | **React 18 + TypeScript** | Your preference; great ecosystem for map components |
| **Build Tool** | **Vite** | Fast dev server, excellent TS support, easy env var handling |
| **Map Library** | **Mapbox GL JS v3** | Best-in-class performance for vector tile rendering and custom layers |
| **React Map Wrapper** | **react-map-gl** | Official React bindings for Mapbox GL; pairs perfectly with TypeScript |
| **UI Components** | **shadcn/ui + Tailwind CSS** | Unstyled primitives, great for panels/drawers/modals |
| **State Management** | **Zustand** | Lightweight, excellent for map state (viewport, selected trail, filters) |
| **Data Fetching** | **TanStack Query (React Query)** | Caching + pagination for ArcGIS feature requests |

### Backend

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime** | **Node.js + TypeScript** | Consistent language across stack |
| **Framework** | **Fastify** | Faster than Express; great TypeScript support |
| **Database** | **PostgreSQL + PostGIS** | Spatial queries for trails; store user data alongside geometries |
| **ORM** | **Drizzle ORM** | TypeScript-first, excellent PostGIS support |
| **Auth** | **Clerk** or **Supabase Auth** | Quick setup, handles JWT; or roll with NextAuth if using Next.js |
| **File Storage** | **Supabase Storage** or **AWS S3** | Photo uploads per trail |

### Alternative: Next.js Full-Stack

If you want a single repo and simpler deployment, swap Vite + Fastify for **Next.js 14 (App Router)**. You get API routes, SSR, and great Vercel deployment — at the cost of slightly more complexity around Mapbox SSR.

### Infrastructure

| | Choice |
|---|---|
| **Hosting** | **Vercel** (frontend) + **Railway** or **Render** (backend + Postgres) |
| **Database** | **Supabase** (managed Postgres + PostGIS + Storage in one) |
| **CI/CD** | GitHub Actions |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React + TypeScript                  │
│                                                       │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────┐ │
│  │  Mapbox GL   │   │  Trail Panel │   │  Wish    │ │
│  │  (map layer) │   │  (notes,     │   │  List    │ │
│  │              │   │   photos)    │   │  View    │ │
│  └──────┬───────┘   └──────┬───────┘   └────┬─────┘ │
│         └──────────────────┴───────────────┘        │
│                    TanStack Query + Zustand           │
└────────────────────────┬────────────────────────────┘
                         │
          ┌──────────────┴───────────────┐
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│  Ontario GeoHub  │          │   Your Backend API   │
│  ArcGIS REST API │          │   (Fastify/Next.js)  │
│                  │          │                      │
│  - Trail segments│          │  - User trail data   │
│  - Access points │          │  - Hike status       │
│  - GeoJSON out   │          │  - Notes & photos    │
└──────────────────┘          │  - Wish list         │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │  PostgreSQL + PostGIS │
                              │  + Supabase Storage  │
                              └──────────────────────┘
```

---

## Map Layer Strategy

### Layer 1: OTN Trail Segments (Base)
- Fetched from OTN ArcGIS API as GeoJSON
- Rendered as Mapbox `line` layer
- Color-coded by `PERMITTED_USE` (hiking = green, cycling = blue, etc.)
- Loaded dynamically on map move using `bbox` query parameter

### Layer 2: User Hike Layer (Custom)
- Stored in your Postgres DB (trail segment ID + user ID + status)
- Rendered as a separate Mapbox `line` layer on top
- Color: **completed** = gold/orange, **wish list** = purple
- Toggled via UI controls

### Layer 3: Access Points
- Rendered as Mapbox `circle` or custom icon markers
- Click to open panel with trailhead info + nearby trails

---

## Core Features — Implementation Plan

### Phase 1: Map Foundation
- [ ] Vite + React + TypeScript project scaffold
- [ ] Mapbox GL setup with Ontario bounding box default view
- [ ] Fetch OTN Segment GeoJSON from ArcGIS API (paginated, bbox-filtered)
- [ ] Render trail lines on map with basic color coding
- [ ] Trail click → side panel with trail info

### Phase 2: User Data Layer
- [ ] Auth (Clerk/Supabase)
- [ ] Backend API + PostgreSQL schema
- [ ] Toggle "Hiked" status on trail segments
- [ ] User overlay layer on Mapbox map

### Phase 3: Notes & Photos
- [ ] Rich notes editor per trail (markdown or simple textarea)
- [ ] Photo upload → Supabase Storage
- [ ] Photo thumbnail gallery in trail panel

### Phase 4: Wish List & Discovery
- [ ] Add trail to wish list from map or search
- [ ] Wish list view (filterable by region, trail type, length)
- [ ] Export wish list as PDF or share link
- [ ] Filter map by trail type, length, difficulty

### Phase 5: Polish
- [ ] Search trails by name
- [ ] Stats dashboard (total km hiked, trails completed, etc.)
- [ ] Mobile-responsive layout
- [ ] Offline support (PWA) for trail details while on the trail

---

## Database Schema (Simplified)

```sql
-- Cached trail metadata (synced from OTN API)
CREATE TABLE trails (
  id            TEXT PRIMARY KEY,   -- OTN segment ID
  name          TEXT,
  association   TEXT,
  permitted_use TEXT[],
  length_km     NUMERIC,
  description   TEXT,
  geometry      GEOMETRY(LineString, 4326),  -- PostGIS
  updated_at    TIMESTAMPTZ
);

-- User-specific trail data
CREATE TABLE user_trails (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,   -- from auth provider
  trail_id    TEXT REFERENCES trails(id),
  status      TEXT CHECK (status IN ('hiked', 'wishlist', 'none')),
  hiked_at    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Photos per trail per user
CREATE TABLE trail_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_trail_id UUID REFERENCES user_trails(id),
  storage_key TEXT NOT NULL,   -- Supabase Storage path
  caption     TEXT,
  taken_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Key Packages

```json
{
  "dependencies": {
    "react": "^18",
    "typescript": "^5",
    "mapbox-gl": "^3",
    "react-map-gl": "^7",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "tailwindcss": "^3",
    "@radix-ui/react-dialog": "^1",
    "drizzle-orm": "^0.30",
    "fastify": "^4",
    "@supabase/supabase-js": "^2"
  }
}
```

---

## Why Mapbox over Alternatives?

| | Mapbox GL JS | Leaflet | OpenLayers | deck.gl |
|---|---|---|---|---|
| Custom vector layers | ✅ Native | 🟡 Plugin needed | ✅ | ✅ |
| Performance (100k+ features) | ✅ Excellent | ⚠️ Struggles | 🟡 Good | ✅ Excellent |
| TypeScript types | ✅ | 🟡 Community | ✅ | ✅ |
| React integration | ✅ react-map-gl | 🟡 react-leaflet | ⚠️ | ✅ |
| Pricing | Free tier (50k loads/mo) | Free | Free | Free |
| Style customization | ✅ Full control | Limited | Limited | ✅ |

**Verdict: Mapbox is the right call.** The free tier is generous, react-map-gl makes it trivial to embed in React, and it handles the trail geometry volume well.

---

## Next Steps

1. **Verify the exact ArcGIS Feature Service URLs** — confirm the endpoint IDs from GeoHub by inspecting network requests on the explore page
2. **Scaffold the project** — Vite + React + TypeScript + Mapbox GL + react-map-gl
3. **Build the OTN API client** — typed fetcher with bbox filtering and pagination
4. **Render trails on a map** — proof of concept with basic styling
5. **Design the DB schema** and set up Supabase
