"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchParks } from "@/lib/parks-api";
import { useMapStore } from "@/store/mapStore";
import type { ParkFeature } from "@/types/park";

const CLASS_COLOURS: Record<string, { dot: string; badge: string }> = {
  "Wilderness":          { dot: "#14532d", badge: "bg-green-900 text-green-100" },
  "Nature Reserve":      { dot: "#166534", badge: "bg-green-700 text-green-100" },
  "Natural Environment": { dot: "#15803d", badge: "bg-green-600 text-green-100" },
  "Waterway":            { dot: "#1d4ed8", badge: "bg-blue-600 text-blue-100" },
  "Recreational":        { dot: "#4d7c0f", badge: "bg-lime-600 text-lime-100" },
  "Cultural Heritage":   { dot: "#92400e", badge: "bg-amber-700 text-amber-100" },
  "Urban":               { dot: "#6d28d9", badge: "bg-violet-600 text-violet-100" },
  "Adventure":           { dot: "#c2410c", badge: "bg-orange-600 text-orange-100" },
};
const DEFAULT_DOT = "#6b7280";
const DEFAULT_BADGE = "bg-gray-600 text-gray-100";

function parkBboxOverlaps(
  park: ParkFeature,
  vp: { west: number; south: number; east: number; north: number }
): boolean {
  const geom = park.geometry;
  const rings: number[][][] =
    geom.type === "Polygon" ? geom.coordinates[0] ? [geom.coordinates[0]] : [] : geom.coordinates.map((p) => p[0] ?? []);
  const lngs = rings.flat().map(([lng]) => lng);
  const lats = rings.flat().map(([, lat]) => lat);
  if (lngs.length === 0) return false;
  const w = Math.min(...lngs), e = Math.max(...lngs);
  const s = Math.min(...lats), n = Math.max(...lats);
  return w <= vp.east && e >= vp.west && s <= vp.north && n >= vp.south;
}

interface ItemProps {
  park: ParkFeature;
  isSelected: boolean;
  onSelect: () => void;
}

function ParkListItem({ park, isSelected, onSelect }: ItemProps) {
  const p = park.properties;
  const cls = p.PROVINCIAL_PARK_CLASS_ENG ?? "";
  const colours = CLASS_COLOURS[cls] ?? { dot: DEFAULT_DOT, badge: DEFAULT_BADGE };
  const area = p.REGULATED_AREA ? `${p.REGULATED_AREA.toLocaleString()} ha` : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-green-50" : ""
      }`}
    >
      <span
        className="mt-1.5 shrink-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: colours.dot }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm truncate ${
            isSelected ? "font-semibold text-green-900" : "font-medium text-gray-900"
          }`}
        >
          {p._name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {cls && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colours.badge}`}>
              {cls}
            </span>
          )}
          {area && <span className="text-xs text-gray-400 shrink-0">{area}</span>}
        </div>
      </div>
    </button>
  );
}

export default function ParkListPanel() {
  const { viewportBbox, selectedPark, setSelectedPark } = useMapStore();

  const { data: parksData } = useQuery({
    queryKey: ["parks"],
    queryFn: fetchParks,
    staleTime: Infinity,
  });

  const parks = parksData?.features ?? [];

  const visible = viewportBbox
    ? parks.filter((p) => parkBboxOverlaps(p, viewportBbox)).sort((a, b) =>
        a.properties._name.localeCompare(b.properties._name)
      )
    : parks.slice().sort((a, b) => a.properties._name.localeCompare(b.properties._name));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-green-700 text-white px-4 py-3 shrink-0">
        <h2 className="font-semibold text-sm">Parks in View</h2>
        <p className="text-xs text-white/70 mt-0.5">
          {visible.length} park{visible.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No parks found in this area.
          </p>
        ) : (
          visible.map((park) => (
            <ParkListItem
              key={park.properties._id}
              park={park}
              isSelected={park.properties._id === selectedPark?.properties._id}
              onSelect={() => setSelectedPark(park)}
            />
          ))
        )}
      </div>
    </div>
  );
}
