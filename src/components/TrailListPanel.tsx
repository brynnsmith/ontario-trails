"use client";

import { useState } from "react";
import { useMapStore } from "@/store/mapStore";
import { getTrailType, type TrailFeature, type TrailFeatureCollection, type TrailType } from "@/types/trail";

function useColor(permittedUse: string | null): string {
  if (!permittedUse) return "#6b7280";
  const u = permittedUse.toLowerCase();
  if (u.includes("hik") || u.includes("walk")) return "#16a34a";
  if (u.includes("cycl") || u.includes("bike")) return "#2563eb";
  if (u.includes("ski")) return "#7c3aed";
  if (u.includes("equestrian") || u.includes("horse")) return "#b45309";
  return "#6b7280";
}

function SourceBadge({ source }: { source: 'otn' | 'osm' }) {
  if (source === 'otn') {
    return (
      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
        OTN
      </span>
    );
  }
  return (
    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">
      OSM
    </span>
  );
}

interface ItemProps {
  trail: TrailFeature;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

function TrailListItem({ trail, isSelected, onSelect, onHover, onHoverEnd }: ItemProps) {
  const p = trail.properties;
  const name = p._name ?? "Unnamed Trail";
  const primaryUse = p.PERMITTED_USES?.split(/[,;/]/)[0]?.trim() ?? null;
  const length = p.TRAIL_LENGTH_KM ? `${p.TRAIL_LENGTH_KM.toFixed(1)} km` : null;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-amber-50" : ""
      }`}
    >
      <span
        className="mt-1.5 shrink-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: useColor(primaryUse ?? null) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`text-sm truncate ${
              isSelected
                ? "font-semibold text-amber-900"
                : "font-medium text-gray-900"
            }`}
          >
            {name}
          </p>
          <SourceBadge source={p._source} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {primaryUse && (
            <span className="text-xs text-gray-500 truncate">{primaryUse}</span>
          )}
          {length && (
            <span className="text-xs text-gray-400 shrink-0">{length}</span>
          )}
        </div>
      </div>
    </button>
  );
}

interface Props {
  trails: TrailFeatureCollection;
  selectedTrailName: string | null;
  onSelect: (trail: TrailFeature) => void;
  onHover: (name: string) => void;
  onHoverEnd: () => void;
}

const TYPE_META: { type: TrailType; label: string; active: string; inactive: string }[] = [
  { type: 'hiking',     label: 'Hiking',      active: 'bg-green-100 text-green-800',   inactive: 'bg-green-900/40 text-white/30' },
  { type: 'cycling',    label: 'Cycling',     active: 'bg-blue-100 text-blue-800',     inactive: 'bg-green-900/40 text-white/30' },
  { type: 'skiing',     label: 'Skiing',      active: 'bg-purple-100 text-purple-800', inactive: 'bg-green-900/40 text-white/30' },
  { type: 'equestrian', label: 'Equestrian',  active: 'bg-amber-100 text-amber-800',   inactive: 'bg-green-900/40 text-white/30' },
  { type: 'other',      label: 'Other',       active: 'bg-gray-100 text-gray-700',     inactive: 'bg-green-900/40 text-white/30' },
];

export default function TrailListPanel({
  trails,
  selectedTrailName,
  onSelect,
  onHover,
  onHoverEnd,
}: Props) {
  const [showOtn, setShowOtn] = useState(true);
  const [showOsm, setShowOsm] = useState(true);
  const { activeTrailTypes, toggleTrailType } = useMapStore();

  // Deduplicate named trails by _name, keeping the first feature per name
  const namedMap = new Map<string, TrailFeature>();
  for (const f of trails.features) {
    if (f.properties._name && !namedMap.has(f.properties._name)) {
      namedMap.set(f.properties._name, f);
    }
  }
  const named = Array.from(namedMap.values()).sort((a, b) =>
    (a.properties._name ?? "").localeCompare(b.properties._name ?? "")
  );
  const unnamed = trails.features.filter((f) => !f.properties._name);
  const all = [...named, ...unnamed].filter((f) => {
    const src = f.properties._source;
    if (src === "otn" && !showOtn) return false;
    if (src === "osm" && !showOsm) return false;
    return activeTrailTypes[getTrailType(f.properties.PERMITTED_USES)];
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-green-700 text-white px-4 py-3 shrink-0 space-y-2">
        {/* Row 1: title + source toggles */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Trails in View</h2>
            <p className="text-xs text-white/70 mt-0.5">
              {all.length} trail{all.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowOtn((v) => !v)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                showOtn ? "bg-green-100 text-green-800" : "bg-green-900/50 text-green-300/60"
              }`}
            >
              OTN
            </button>
            <button
              onClick={() => setShowOsm((v) => !v)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                showOsm ? "bg-teal-100 text-teal-800" : "bg-green-900/50 text-teal-300/60"
              }`}
            >
              OSM
            </button>
          </div>
        </div>
        {/* Row 2: trail type toggles */}
        <div className="flex flex-wrap gap-1">
          {TYPE_META.map(({ type, label, active, inactive }) => (
            <button
              key={type}
              onClick={() => toggleTrailType(type)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                activeTrailTypes[type] ? active : inactive
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {all.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            No trails found in this area.
          </p>
        ) : (
          all.map((trail) => (
            <TrailListItem
              key={trail.properties._id}
              trail={trail}
              isSelected={
                trail.properties._name !== null &&
                trail.properties._name === selectedTrailName
              }
              onSelect={() => onSelect(trail)}
              onHover={() => {
                if (trail.properties._name) onHover(trail.properties._name);
              }}
              onHoverEnd={onHoverEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
