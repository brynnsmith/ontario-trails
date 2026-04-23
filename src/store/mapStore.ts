import { create } from "zustand";
import type { TrailFeature, TrailFeatureCollection, TrailType } from "@/types/trail";
import type { ParkFeature } from "@/types/park";
import type { BoundingBox } from "@/lib/otn-api";

export type TrailTypeFilter = Record<TrailType, boolean>;

export interface FlyToCoords {
  center: [number, number];
  bbox?: [number, number, number, number]; // [west, south, east, north]
}

interface MapState {
  // Trail selection (map click → side panel)
  selectedTrail: TrailFeature | null;
  setSelectedTrail: (trail: TrailFeature | null) => void;
  // Park selection (map click → side panel)
  selectedPark: ParkFeature | null;
  setSelectedPark: (park: ParkFeature | null) => void;
  // One-shot trigger: list click → map flies to trail, then cleared
  flyToTrail: TrailFeature | null;
  setFlyToTrail: (trail: TrailFeature | null) => void;
  // One-shot trigger: search geocoding result → map flies to coords, then cleared
  flyToCoords: FlyToCoords | null;
  setFlyToCoords: (v: FlyToCoords | null) => void;
  // Trail hover (list hover → map highlight)
  hoveredTrailName: string | null;
  setHoveredTrailName: (name: string | null) => void;
  // Current map zoom + viewport bbox (synced from TrailMap)
  zoom: number;
  setZoom: (zoom: number) => void;
  viewportBbox: BoundingBox | null;
  setViewportBbox: (bbox: BoundingBox | null) => void;
  // Fetched trail data (synced from TrailMap)
  trails: TrailFeatureCollection | null;
  setTrails: (trails: TrailFeatureCollection | null) => void;
  // Pending selection: set by modals when trail isn't in current viewport yet
  pendingSelectId: string | null;
  setPendingSelectId: (id: string | null) => void;
  // Trail type visibility filter
  activeTrailTypes: TrailTypeFilter;
  toggleTrailType: (type: TrailType) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedTrail: null,
  setSelectedTrail: (trail) => set({ selectedTrail: trail, selectedPark: null }),
  selectedPark: null,
  setSelectedPark: (park) => set({ selectedPark: park, selectedTrail: null }),
  flyToTrail: null,
  setFlyToTrail: (trail) => set({ flyToTrail: trail }),
  flyToCoords: null,
  setFlyToCoords: (v) => set({ flyToCoords: v }),
  hoveredTrailName: null,
  setHoveredTrailName: (name) => set({ hoveredTrailName: name }),
  zoom: 5.5,
  setZoom: (zoom) => set({ zoom }),
  viewportBbox: null,
  setViewportBbox: (bbox) => set({ viewportBbox: bbox }),
  trails: null,
  setTrails: (trails) => set({ trails }),
  pendingSelectId: null,
  setPendingSelectId: (id) => set({ pendingSelectId: id }),
  activeTrailTypes: { hiking: true, cycling: false, skiing: true, equestrian: true, other: true },
  toggleTrailType: (type) =>
    set((s) => ({ activeTrailTypes: { ...s.activeTrailTypes, [type]: !s.activeTrailTypes[type] } })),
}));
