export interface ParkProperties {
  _source: 'parks';
  _id: string;           // PROTECTED_SITE_IDENT e.g. "P221"
  _name: string;         // COMMON_SHORT_NAME
  PROTECTED_AREA_NAME_ENG: string | null;
  PROVINCIAL_PARK_CLASS_ENG: string | null;
  REGULATED_AREA: number | null;  // hectares
  OPERATING_STATUS_IND: string | null;
  PROTDATE: number | null;        // year established
  URL: string | null;
}

export interface ParkFeature extends GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParkProperties
> {}

export interface ParkFeatureCollection extends GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParkProperties
> {}
