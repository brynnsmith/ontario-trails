# ontario-trails

Interactive map of hiking trails in Ontario.

A personal hiking tracker for Ontario trails, built on the Ontario Trail Network (OTN) open dataset. Explore thousands of trails across the province on an interactive map, log your hikes, attach notes and photos, and build a wish list of trails you want to tackle next.

## Tech Stack

Layer | Technology
--- | ---
Framework | Next.js 14 (App Router) + TypeScript
Map | Mapbox GL JS v3 + react-map-gl
UI | Tailwind CSS + shadcn/ui
State | Zustand + TanStack Query
Database | PostgreSQL + PostGIS (via Supabase)
Auth | Supabase Auth
File Storage | Supabase Storage
Deployment | Vercel

Data source: Ontario GeoHub — OTN Segment & Access Point Feature Services (public ArcGIS REST API, no key required)

Data Attribution
Trail data sourced from the Ontario Trail Network (OTN), published by the Ontario Ministry of Natural Resources & Forestry under the Open Government Licence – Ontario