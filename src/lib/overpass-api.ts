import type { TrailFeatureCollection } from "@/types/trail";
import type { BoundingBox } from "./otn-api";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function osmHighwayToUse(highway: string): string | null {
  switch (highway) {
    case "footway":
    case "path":
      return "Hiking";
    case "cycleway":
      return "Cycling";
    case "bridleway":
      return "Equestrian";
    case "track":
      return "Multi-use";
    default:
      return null;
  }
}

interface OverpassElement {
  type: "way";
  id: number;
  geometry: Array<{ lat: number; lon: number }>;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export async function fetchOsmTrails(
  bbox: BoundingBox
): Promise<TrailFeatureCollection> {
  const { south, west, north, east } = bbox;
  const query = `[out:json][timeout:25];
(
  way["highway"~"^(path|footway|track|bridleway|cycleway)$"]["name"]
    (${south},${west},${north},${east});
);
out body geom;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }

  const json: OverpassResponse = await res.json();

  const features: TrailFeatureCollection["features"] = json.elements.map((el) => ({
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: el.geometry.map((pt) => [pt.lon, pt.lat]),
    },
    properties: {
      _source: "osm",
      _id: `osm-${el.id}`,
      _name: el.tags.name ?? null,
      OBJECTID: 0,
      OGF_ID: null,
      TRAIL_NAME: el.tags.name ?? null,
      TRAIL_ASSOCIATION: el.tags.operator ?? el.tags.network ?? null,
      PERMITTED_USES: osmHighwayToUse(el.tags.highway),
      TRAIL_LENGTH_KM: null,
      DESCRIPTION: null,
      osm_id: el.id,
      osm_highway: el.tags.highway,
      osm_operator: el.tags.operator ?? null,
      osm_network: el.tags.network ?? null,
    },
  }));

  return { type: "FeatureCollection", features };
}
