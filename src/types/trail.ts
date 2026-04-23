export type TrailType = 'hiking' | 'cycling' | 'skiing' | 'equestrian' | 'other';

export function getTrailType(permittedUses: string | null): TrailType {
  if (!permittedUses) return 'other';
  const u = permittedUses.split(/[,;/]/)[0].trim().toLowerCase();
  if (u.includes('hik') || u.includes('walk')) return 'hiking';
  if (u.includes('cycl') || u.includes('bik')) return 'cycling';
  if (u.includes('ski')) return 'skiing';
  if (u.includes('equestrian') || u.includes('horse')) return 'equestrian';
  return 'other';
}

export interface TrailProperties {
  // Normalized — always present
  _source: 'otn' | 'osm';
  _id: string;          // "otn-{OBJECTID}" | "osm-{way_id}"
  _name: string | null;
  // OTN-specific
  OBJECTID: number;
  OGF_ID: number | null;
  TRAIL_NAME: string | null;
  TRAIL_ASSOCIATION: string | null;
  PERMITTED_USES: string | null;
  TRAIL_LENGTH_KM: number | null;
  DESCRIPTION: string | null;
  // OSM-specific
  osm_highway?: string;
  osm_operator?: string;
  osm_network?: string;
  [key: string]: unknown;
}

export interface TrailFeature extends GeoJSON.Feature<GeoJSON.MultiLineString | GeoJSON.LineString, TrailProperties> {}

export interface TrailFeatureCollection extends GeoJSON.FeatureCollection<GeoJSON.MultiLineString | GeoJSON.LineString, TrailProperties> {}
