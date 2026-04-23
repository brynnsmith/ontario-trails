"use client";

import { useEffect } from "react";
import { X, Star, Trash2 } from "lucide-react";
import { useFavouriteTrails, useToggleFavourite } from "@/hooks/useHikedTrails";
import { useMapStore } from "@/store/mapStore";

interface FavouriteTrailsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FavouriteTrailsModal({ open, onClose }: FavouriteTrailsModalProps) {
  const { data: trails = [], isLoading } = useFavouriteTrails();
  const toggleFavourite = useToggleFavourite();
  const { trails: mapTrails, setSelectedTrail, setFlyToTrail, setFlyToCoords, setPendingSelectId } = useMapStore();

  function navigateToTrail(trailId: string, centerLng: number | null, centerLat: number | null) {
    const match = mapTrails?.features.find((f) => f.properties._id === trailId);
    if (match) {
      setSelectedTrail(match);
      setFlyToTrail(match);
    } else {
      setPendingSelectId(trailId);
      if (centerLng != null && centerLat != null) {
        setFlyToCoords({ center: [centerLng, centerLat] });
      }
    }
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Star size={18} className="fill-yellow-400 text-yellow-400" />
            <h2 className="font-semibold text-gray-800">Favourite Trails</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading…
            </div>
          ) : trails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
              <Star size={36} className="text-gray-200" />
              <p className="text-sm text-gray-500">No favourites saved yet.</p>
              <p className="text-xs text-gray-400">
                Click a trail on the map and tap the star to save it here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {trails.map((trail) => (
                <li key={trail.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigateToTrail(trail.trail_id, trail.center_lng, trail.center_lat)}
                      className="text-sm font-medium text-gray-800 hover:text-green-700 hover:underline truncate text-left w-full transition-colors"
                    >
                      {trail.trail_name ?? "Unnamed Trail"}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        trail.trail_source === "otn"
                          ? "bg-green-100 text-green-700"
                          : "bg-teal-100 text-teal-700"
                      }`}>
                        {trail.trail_source === "otn" ? "OTN" : "OSM"}
                      </span>
                      <span className="text-xs text-gray-400">
                        Added: {new Date(trail.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      toggleFavourite.mutate({
                        trailId: trail.trail_id,
                        trailName: trail.trail_name ?? "",
                        trailSource: trail.trail_source ?? "",
                        isFavourite: true,
                      })
                    }
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    aria-label="Remove from favourites"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {trails.length > 0 && (
          <div className="px-5 py-3 border-t shrink-0 text-xs text-gray-400">
            {trails.length} trail{trails.length !== 1 ? "s" : ""} favourited
          </div>
        )}
      </div>
    </div>
  );
}
