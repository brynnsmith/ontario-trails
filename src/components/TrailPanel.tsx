"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";
import type { TrailFeature } from "@/types/trail";
import { useAuth } from "@/app/providers";
import { useHikedTrails, useToggleHiked, useFavouriteTrails, useToggleFavourite, usePlannedTrails, useTogglePlanned } from "@/hooks/useHikedTrails";

interface TrailPanelProps {
  trail: TrailFeature;
  onClose: () => void;
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

function getTrailCenter(t: TrailFeature): [number, number] {
  const lines = t.geometry.type === "LineString"
    ? [t.geometry.coordinates]
    : t.geometry.coordinates;
  const pts = lines.flat() as [number, number][];
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ];
}

export default function TrailPanel({ trail, onClose }: TrailPanelProps) {
  const p = trail.properties;
  const name = p._name || "Unnamed Trail";
  const [centerLng, centerLat] = getTrailCenter(trail);
  const { user } = useAuth();
  const { data: hikedTrails = [] } = useHikedTrails();
  const { data: favouriteTrails = [] } = useFavouriteTrails();
  const { data: plannedTrails = [] } = usePlannedTrails();
  const toggleHiked = useToggleHiked();
  const toggleFavourite = useToggleFavourite();
  const togglePlanned = useTogglePlanned();
  const isHiked = hikedTrails.some((t) => t.trail_id === p._id);
  const isFavourite = favouriteTrails.some((t) => t.trail_id === p._id);
  const isPlanned = plannedTrails.some((t) => t.trail_id === p._id);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-4 flex items-start justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-base font-semibold leading-snug">{name}</h2>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${
            p._source === 'otn'
              ? 'bg-green-600 text-green-100'
              : 'bg-teal-600 text-teal-100'
          }`}>
            {p._source === 'otn' ? 'OTN' : 'OpenStreetMap'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 mt-0.5 text-white/70 hover:text-white transition-colors text-sm"
          aria-label="Back to list"
        >
          ← Back
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {p._source === 'otn' ? (
          <OtnFields p={p} />
        ) : (
          <OsmFields p={p} />
        )}
      </div>

      {/* Favourite toast */}
      <div className={`px-4 py-2 bg-yellow-50 border-t border-yellow-100 flex items-center gap-1.5 text-xs text-yellow-700 transition-all duration-300 overflow-hidden ${toastVisible ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>
        <Star size={12} className="fill-yellow-400 text-yellow-400 shrink-0" />
        Added to Favourite Trails
      </div>

      {/* Footer actions (Phase 2+) */}
      {(toggleHiked.error || togglePlanned.error) && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
          {((toggleHiked.error || togglePlanned.error) as Error).message}
        </div>
      )}
      <div className="border-t px-4 py-3 flex gap-2">
        <button
          disabled={!user || toggleFavourite.isPending}
          onClick={() =>
            toggleFavourite.mutate(
              { trailId: p._id, trailName: name, trailSource: p._source, isFavourite, centerLng, centerLat },
              { onSuccess: () => { if (!isFavourite) showToast(); } }
            )
          }
          title={!user ? "Sign in to save favourites" : isFavourite ? "Remove from favourites" : "Add to favourites"}
          aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
          className={`shrink-0 flex items-center justify-center w-10 rounded-lg border transition-colors ${
            isFavourite
              ? "border-yellow-400 bg-yellow-50 text-yellow-500"
              : !user
              ? "border-gray-200 text-gray-300 cursor-not-allowed"
              : "border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-400"
          }`}
        >
          <Star size={17} className={isFavourite ? "fill-yellow-400" : ""} />
        </button>
        <button
          disabled={!user || toggleHiked.isPending}
          onClick={() =>
            toggleHiked.mutate({
              trailId: p._id,
              trailName: name,
              trailSource: p._source,
              isHiked,
              centerLng,
              centerLat,
            })
          }
          title={!user ? "Sign in to track hikes" : undefined}
          className={`flex-1 text-sm rounded-lg py-2 transition-colors ${
            isHiked
              ? "bg-green-700 text-white hover:bg-green-800"
              : !user
              ? "bg-green-600 text-white opacity-50 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isHiked ? "✓ Hiked" : "Mark as Hiked"}
        </button>
        <button
          disabled={!user || togglePlanned.isPending}
          onClick={() =>
            togglePlanned.mutate({
              trailId: p._id,
              trailName: name,
              trailSource: p._source,
              isPlanned,
              centerLng,
              centerLat,
            })
          }
          title={!user ? "Sign in to plan hikes" : undefined}
          className={`flex-1 text-sm rounded-lg py-2 transition-colors border ${
            isPlanned
              ? "border-green-600 bg-green-50 text-green-800 hover:bg-green-100"
              : !user
              ? "border-green-300 text-green-400 opacity-50 cursor-not-allowed"
              : "border-green-600 text-green-800 hover:bg-green-50"
          }`}
        >
          {isPlanned ? "✓ Planned" : "Add to Planned Hikes"}
        </button>
      </div>
    </div>
  );
}

function OtnFields({ p }: { p: TrailFeature["properties"] }) {
  const lengthText = p.TRAIL_LENGTH_KM
    ? `${p.TRAIL_LENGTH_KM.toFixed(1)} km`
    : null;

  const uses = p.PERMITTED_USES
    ? p.PERMITTED_USES.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      {uses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uses.map((u) => (
            <Badge key={u} label={u} />
          ))}
        </div>
      )}
      <Row label="Length" value={lengthText} />
      <Row label="Trail Association" value={p.TRAIL_ASSOCIATION} />
      {p.DESCRIPTION && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Description</p>
          <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{p.DESCRIPTION}</p>
        </div>
      )}
    </>
  );
}

function OsmFields({ p }: { p: TrailFeature["properties"] }) {
  const highway = p.osm_highway as string | undefined;
  const operator = p.osm_operator as string | undefined;
  const network = p.osm_network as string | undefined;

  return (
    <>
      <Row label="Trail Type" value={highway} />
      <Row label="Operator" value={operator} />
      <Row label="Network" value={network} />
      <p className="text-xs text-gray-400 mt-2">
        Data from{" "}
        <a
          href="https://www.openstreetmap.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </p>
    </>
  );
}
