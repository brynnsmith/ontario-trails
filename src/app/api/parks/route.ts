import { NextResponse } from "next/server";

const BASE =
  "https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_OPEN_DATA/LIO_Open03/MapServer/4";

export async function GET() {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: [
      "PROTECTED_SITE_IDENT",
      "COMMON_SHORT_NAME",
      "PROTECTED_AREA_NAME_ENG",
      "PROVINCIAL_PARK_CLASS_ENG",
      "REGULATED_AREA",
      "OPERATING_STATUS_IND",
      "PROTDATE",
      "URL",
    ].join(","),
    outSR: "4326",
    f: "geojson",
  });

  const res = await fetch(`${BASE}/query?${params}`, { next: { revalidate: 86400 } });
  if (!res.ok) {
    return NextResponse.json({ error: `Parks API error: ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
