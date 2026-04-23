"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Map, {
  Layer,
  MapRef,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
} from "react-map-gl";
import { useQuery } from "@tanstack/react-query";
import { fetchTrailSegments, type BoundingBox } from "@/lib/otn-api";
import { fetchOsmTrails } from "@/lib/overpass-api";
import { fetchTrailheads } from "@/lib/trailhead-api";
import { fetchParks } from "@/lib/parks-api";
import { useMapStore } from "@/store/mapStore";
import { getTrailType, type TrailFeature } from "@/types/trail";
import type { ParkFeature } from "@/types/park";

const MIN_ZOOM = 9;
const TRAILHEAD_ZOOM = 12;

const INITIAL_VIEW = {
  longitude: -85.0,
  latitude: 50.0,
  zoom: 5.5,
};

function snapBbox(bbox: BoundingBox): BoundingBox {
  const snap = (v: number) => Math.round(v * 10) / 10;
  return {
    west: snap(bbox.west),
    south: snap(bbox.south),
    east: snap(bbox.east),
    north: snap(bbox.north),
  };
}

/** Fraction of `stable`'s area that overlaps with `viewport`. */
function bboxOverlapRatio(viewport: BoundingBox, stable: BoundingBox): number {
  const overlapW = Math.max(viewport.west, stable.west);
  const overlapE = Math.min(viewport.east, stable.east);
  const overlapS = Math.max(viewport.south, stable.south);
  const overlapN = Math.min(viewport.north, stable.north);
  if (overlapE <= overlapW || overlapN <= overlapS) return 0;
  const overlapArea = (overlapE - overlapW) * (overlapN - overlapS);
  const stableArea = (stable.east - stable.west) * (stable.north - stable.south);
  return overlapArea / stableArea;
}

function bboxUnion(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    west: Math.min(a.west, b.west),
    east: Math.max(a.east, b.east),
    south: Math.min(a.south, b.south),
    north: Math.max(a.north, b.north),
  };
}

// Cap the stable bbox at ~4° × 4° (~440 km × 440 km) to avoid huge API queries
const MAX_STABLE_AREA = 16;

/** Returns [west, south, east, north] from a trail feature's geometry, or null if empty. */
function getFeatureBbox(feature: TrailFeature): [number, number, number, number] | null {
  const geom = feature.geometry;
  const lines: number[][][] =
    geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
  const lngs: number[] = [];
  const lats: number[] = [];
  for (const line of lines) {
    for (const [lng, lat] of line) {
      lngs.push(lng);
      lats.push(lat);
    }
  }
  if (lngs.length === 0) return null;
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

export default function TrailMap() {
  const mapRef = useRef<MapRef>(null);
  // stableBbox: used for API queries. Expands on zoom-out/pan, holds steady on zoom-in,
  // resets when the user pans to a substantially different area.
  const [stableBbox, setStableBbox] = useState<BoundingBox | null>(null);
  const [isHoveringTrail, setIsHoveringTrail] = useState(false);

  const { zoom, setZoom, setTrails, selectedTrail, setSelectedTrail, selectedPark, setSelectedPark,
          hoveredTrailName, flyToTrail, setFlyToTrail, flyToCoords, setFlyToCoords,
          pendingSelectId, setPendingSelectId,
          activeTrailTypes, setViewportBbox } = useMapStore();

  const queryEnabled = zoom >= MIN_ZOOM && stableBbox !== null;

  const { data: otnTrails, isFetching: otnFetching } = useQuery({
    queryKey: ["otn-trails", stableBbox?.west, stableBbox?.south, stableBbox?.east, stableBbox?.north],
    queryFn: () => fetchTrailSegments(stableBbox!),
    enabled: queryEnabled,
    placeholderData: (prev) => prev,
  });

  const { data: osmTrails, isFetching: osmFetching } = useQuery({
    queryKey: ["osm-trails", stableBbox?.west, stableBbox?.south, stableBbox?.east, stableBbox?.north],
    queryFn: () => fetchOsmTrails(stableBbox!),
    enabled: queryEnabled,
    placeholderData: (prev) => prev,
  });

  const { data: parksData } = useQuery({
    queryKey: ["parks"],
    queryFn: fetchParks,
    staleTime: Infinity, // park boundaries rarely change
  });

  const { data: trailheadData } = useQuery({
    queryKey: ["trailheads", stableBbox?.west, stableBbox?.south, stableBbox?.east, stableBbox?.north],
    queryFn: () => fetchTrailheads(stableBbox!),
    enabled: zoom >= TRAILHEAD_ZOOM && stableBbox !== null,
    placeholderData: (prev) => prev,
  });

  const trails = useMemo(() => {
    if (!otnTrails && !osmTrails) return null;
    return {
      type: "FeatureCollection" as const,
      features: [...(otnTrails?.features ?? []), ...(osmTrails?.features ?? [])],
    };
  }, [otnTrails, osmTrails]);

  const trailheadCollection = useMemo(() => {
    if (!trailheadData || trailheadData.length === 0) return null;
    return { type: "FeatureCollection" as const, features: trailheadData };
  }, [trailheadData]);

  // Filter trails by active types for map rendering (store holds full data for search/list)
  const filteredForMap = useMemo(() => {
    if (!trails) return null;
    return {
      ...trails,
      features: trails.features.filter((f) =>
        activeTrailTypes[getTrailType(f.properties.PERMITTED_USES)]
      ),
    };
  }, [trails, activeTrailTypes]);

  // Sync merged trails into the store so SidePanel can read them
  useEffect(() => {
    setTrails(trails ?? null);
  }, [trails, setTrails]);

  // Auto-select a pending trail once it appears in loaded data
  useEffect(() => {
    if (!pendingSelectId || !trails) return;
    const match = trails.features.find((f) => f.properties._id === pendingSelectId);
    if (match) {
      setSelectedTrail(match);
      setFlyToTrail(match);
      setPendingSelectId(null);
    }
  }, [trails, pendingSelectId, setSelectedTrail, setFlyToTrail, setPendingSelectId]);

  // Fly to a trail when selected from the list (one-shot trigger)
  useEffect(() => {
    if (!flyToTrail || !mapRef.current) return;
    const bbox = getFeatureBbox(flyToTrail);
    if (bbox) {
      mapRef.current.fitBounds(bbox, { padding: 80, maxZoom: 14, duration: 800 });
    }
    setFlyToTrail(null);
  }, [flyToTrail, setFlyToTrail]);

  // Fly to geocoding result from search bar (one-shot trigger)
  useEffect(() => {
    if (!flyToCoords || !mapRef.current) return;
    if (flyToCoords.bbox) {
      mapRef.current.fitBounds(
        flyToCoords.bbox as [number, number, number, number],
        { padding: 60, maxZoom: 14, duration: 1000 }
      );
    } else {
      mapRef.current.flyTo({ center: flyToCoords.center, zoom: 13, duration: 1000 });
    }
    setFlyToCoords(null);
  }, [flyToCoords, setFlyToCoords]);

  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      const map = e.target;
      const bounds = map.getBounds();
      if (!bounds) return;
      const newZoom = map.getZoom();
      setZoom(newZoom);
      const viewport = snapBbox({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
      setViewportBbox(viewport);
      setStableBbox((prev) => {
        if (!prev) return viewport;
        // Significant pan: new viewport barely overlaps the old query area → reset
        if (bboxOverlapRatio(viewport, prev) < 0.5) return viewport;
        const union = bboxUnion(prev, viewport);
        const area = (union.east - union.west) * (union.north - union.south);
        // Union is too large (user zoomed way out) → reset to current viewport
        if (area > MAX_STABLE_AREA) return viewport;
        // Zoom-in: union === prev (viewport is a subset of prev) — query unchanged
        // Zoom-out/minor pan: union expands prev — new query fetches more trails
        return union;
      });
    },
    [setZoom, setViewportBbox]
  );

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    setIsHoveringTrail((e.features?.length ?? 0) > 0);
  }, []);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const features = e.features;
      if (!features || features.length === 0) {
        setSelectedTrail(null);
        setSelectedPark(null);
        return;
      }

      // Trailhead pin click: name-match to associated trail
      const thFeature = features.find((f) => f.layer?.id === "trailhead-circles");
      if (thFeature) {
        const thName = (thFeature.properties?.name as string | null)?.toLowerCase() ?? null;
        if (thName && trails) {
          const match = trails.features
            .filter((f) => {
              const tn = (f.properties._name ?? "").toLowerCase();
              return tn.length > 2 && (thName.includes(tn) || tn.includes(thName));
            })
            .sort((a, b) => (b.properties._name?.length ?? 0) - (a.properties._name?.length ?? 0))[0];
          if (match) setSelectedTrail(match);
        }
        return;
      }

      // Trail line click (takes priority over parks)
      const trailFeature = features.find((f) => f.layer?.id === "trail-lines");
      if (trailFeature) {
        setSelectedTrail(trailFeature as unknown as TrailFeature);
        return;
      }

      // Park polygon click
      const parkFeature = features.find((f) => f.layer?.id === "park-fills");
      if (parkFeature) {
        setSelectedPark(parkFeature as unknown as ParkFeature);
        return;
      }

      setSelectedTrail(null);
      setSelectedPark(null);
    },
    [setSelectedTrail, setSelectedPark, trails]
  );

  const isFetching = otnFetching || osmFetching;

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        interactiveLayerIds={[
          ...(parksData ? ["park-fills"] : []),
          ...(filteredForMap ? ["trail-lines"] : []),
          ...(trailheadCollection ? ["trailhead-circles"] : []),
        ]}
        onMoveEnd={handleMoveEnd}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        cursor={isHoveringTrail ? "pointer" : "grab"}
      >
        <NavigationControl position="top-right" />

        {parksData && (
          <Source id="ontario-parks" type="geojson" data={parksData}>
            <Layer
              id="park-fills"
              type="fill"
              paint={{
                "fill-color": [
                  "match",
                  ["get", "PROVINCIAL_PARK_CLASS_ENG"],
                  "Wilderness",          "#14532d",
                  "Nature Reserve",      "#166534",
                  "Natural Environment", "#15803d",
                  "Waterway",            "#1d4ed8",
                  "Recreational",        "#4d7c0f",
                  "Cultural Heritage",   "#92400e",
                  "Urban",               "#6d28d9",
                  "Adventure",           "#c2410c",
                  "#15803d",
                ],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "_id"], selectedPark?.properties?._id ?? ""],
                  0.35,
                  0.12,
                ],
              }}
            />
            <Layer
              id="park-borders"
              type="line"
              paint={{
                "line-color": "#15803d",
                "line-width": [
                  "case",
                  ["==", ["get", "_id"], selectedPark?.properties?._id ?? ""],
                  2,
                  1,
                ],
                "line-opacity": 0.5,
              }}
            />
          </Source>
        )}

        {filteredForMap && (
          <Source id="otn-trails" type="geojson" data={filteredForMap}>
            <Layer
              id="trail-lines"
              type="line"
              paint={{
                "line-color": [
                  "match",
                  ["downcase", ["coalesce", ["get", "PERMITTED_USES"], ""]],
                  ["hiking", "walking"], "#16a34a",
                  ["cycling", "biking", "mountain biking"], "#2563eb",
                  ["skiing", "cross-country skiing"], "#7c3aed",
                  ["equestrian", "horseback riding"], "#b45309",
                  "#6b7280",
                ],
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  5, 1,
                  10, 2.5,
                  14, 4,
                ],
                "line-opacity": 0.8,
              }}
            />
            {/* Hover highlight — sits above base trails, below selected */}
            <Layer
              id="trail-lines-hovered"
              type="line"
              filter={hoveredTrailName !== null
                ? ["==", ["get", "_name"], hoveredTrailName]
                : ["boolean", false]}
              paint={{
                "line-color": "#fde047",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  5, 3,
                  10, 5,
                  14, 7,
                ],
                "line-opacity": 0.9,
              }}
            />
            {/* Selected highlight — always on top */}
            <Layer
              id="trail-lines-selected"
              type="line"
              filter={["==", ["get", "_id"], selectedTrail?.properties?._id ?? ""]}
              paint={{
                "line-color": "#f59e0b",
                "line-width": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  5, 4,
                  10, 6,
                  14, 8,
                ],
              }}
            />
          </Source>
        )}

        {trailheadCollection && (
          <Source id="trailheads" type="geojson" data={trailheadCollection}>
            <Layer
              id="trailhead-circles"
              type="circle"
              minzoom={TRAILHEAD_ZOOM}
              paint={{
                "circle-radius": 7,
                "circle-color": "#0d9488",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
            <Layer
              id="trailhead-parking-label"
              type="symbol"
              minzoom={TRAILHEAD_ZOOM}
              filter={["==", ["get", "parking"], true]}
              layout={{
                "text-field": "P",
                "text-size": 10,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-allow-overlap": true,
              }}
              paint={{ "text-color": "#ffffff" }}
            />
          </Source>
        )}
      </Map>

      {/* Loading pill — shown while either source is fetching */}
      {isFetching && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 text-xs text-gray-600 px-3 py-1 rounded-full shadow pointer-events-none">
          Loading trails…
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-3 bg-white/90 rounded-lg shadow p-2.5 text-xs space-y-1">
        <p className="font-semibold text-gray-700 mb-1">Trail Type</p>
        {[
          { color: "#16a34a", label: "Hiking" },
          { color: "#2563eb", label: "Cycling" },
          { color: "#7c3aed", label: "Skiing" },
          { color: "#b45309", label: "Equestrian" },
          { color: "#6b7280", label: "Other" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
