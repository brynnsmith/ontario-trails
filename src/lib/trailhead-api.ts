import type { BoundingBox } from "./otn-api";
import type { TrailheadFeature } from "@/types/trailhead";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

export async function fetchTrailheads(bbox: BoundingBox): Promise<TrailheadFeature[]> {
  const { south, west, north, east } = bbox;
  const query = `[out:json][timeout:25];
node["tourism"="trailhead"](${south},${west},${north},${east});
out body;`;

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }

  const json: OverpassResponse = await res.json();

  return json.elements.map((el) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [el.lon, el.lat],
    },
    properties: {
      _id: `th-${el.id}`,
      name: el.tags?.name ?? null,
      parking: Boolean(el.tags?.parking && el.tags.parking !== "no"),
      operator: el.tags?.operator ?? null,
    },
  }));
}
