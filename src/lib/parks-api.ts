import type { ParkFeature, ParkFeatureCollection } from '@/types/park';

// All 345 Ontario provincial parks fit in a single request.
// Fetched via a local proxy route to avoid CORS restrictions from the LIO server.
// Cached for 24 h on the server (next.revalidate) and indefinitely in the client query cache.
export async function fetchParks(): Promise<ParkFeatureCollection> {
  const res = await fetch('/api/parks');
  if (!res.ok) throw new Error(`Parks API error: ${res.status}`);

  const geojson = await res.json() as GeoJSON.FeatureCollection;

  // Normalize to ParkFeature shape
  const features: ParkFeature[] = geojson.features.map((f) => {
    const p = f.properties ?? {};
    return {
      ...f,
      properties: {
        _source: 'parks',
        _id: String(p.PROTECTED_SITE_IDENT ?? p.OBJECTID ?? Math.random()),
        _name: String(p.COMMON_SHORT_NAME ?? p.PROTECTED_AREA_NAME_ENG ?? 'Unknown Park'),
        PROTECTED_AREA_NAME_ENG: p.PROTECTED_AREA_NAME_ENG ?? null,
        PROVINCIAL_PARK_CLASS_ENG: p.PROVINCIAL_PARK_CLASS_ENG ?? null,
        REGULATED_AREA: p.REGULATED_AREA ?? null,
        OPERATING_STATUS_IND: p.OPERATING_STATUS_IND ?? null,
        PROTDATE: p.PROTDATE ?? null,
        URL: p.URL ?? null,
      },
    } as ParkFeature;
  });

  return { type: 'FeatureCollection', features };
}
