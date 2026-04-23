export interface TrailheadProperties {
  _id: string;          // "th-{osm_id}"
  name: string | null;
  parking: boolean;     // true if tags.parking exists and !== "no"
  operator: string | null;
}

export type TrailheadFeature = GeoJSON.Feature<GeoJSON.Point, TrailheadProperties>;
export type TrailheadFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, TrailheadProperties>;
