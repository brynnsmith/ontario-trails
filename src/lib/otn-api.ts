import type { TrailFeatureCollection, TrailProperties } from "@/types/trail";

const BASE_URL =
  "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open04/MapServer/19/query";

// This service returns up to 2 000 records per page
const PAGE_SIZE = 2000;

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

function buildUrl(bbox: BoundingBox, offset: number): string {
  // ArcGIS expects literal commas in the geometry value — URLSearchParams
  // encodes them as %2C which causes a 400, so we append geometry manually.
  const geometry = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const params = new URLSearchParams({
    where: "OBJECTID > 0", // "1=1" is rejected by this ArcGIS service
    outFields:
      "OBJECTID,OGF_ID,TRAIL_NAME,TRAIL_ASSOCIATION,PERMITTED_USES,TRAIL_LENGTH_KM,DESCRIPTION",
    outSR: "4326",
    inSR: "4326",
    f: "geojson",
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  });
  return `${BASE_URL}?${params.toString()}&geometry=${geometry}`;
}

async function fetchPage(
  bbox: BoundingBox,
  offset: number
): Promise<TrailFeatureCollection> {
  const url = buildUrl(bbox, offset);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OTN API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<TrailFeatureCollection>;
}

/**
 * Fetch OTN trail segments for a bounding box, paginating up to maxPages.
 * Defaults to 5 pages (5 000 features) — enough for any realistic viewport
 * at zoom ≥ 9 without runaway requests.
 */
export async function fetchTrailSegments(
  bbox: BoundingBox,
  maxPages = 5
): Promise<TrailFeatureCollection> {
  const allFeatures: TrailFeatureCollection["features"] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(bbox, offset);
    allFeatures.push(...result.features);

    const raw = result as unknown as { exceededTransferLimit?: boolean };
    if (!raw.exceededTransferLimit || result.features.length === 0) break;

    offset += PAGE_SIZE;
  }

  for (const f of allFeatures) {
    const p = f.properties as TrailProperties;
    p._source = 'otn';
    p._id = `otn-${p.OBJECTID}`;
    p._name = p.TRAIL_NAME ?? null;
  }

  return { type: "FeatureCollection", features: allFeatures };
}
