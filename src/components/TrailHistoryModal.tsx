"use client";

import { useEffect, useState } from "react";
import { X, Footprints, Trash2, Pencil, Check } from "lucide-react";
import { useHikedTrails, useToggleHiked, useUpdateHikedDate } from "@/hooks/useHikedTrails";
import { useMapStore } from "@/store/mapStore";

interface TrailHistoryModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TrailHistoryModal({ open, onClose }: TrailHistoryModalProps) {
  const { data: trails = [], isLoading } = useHikedTrails();
  const toggleHiked = useToggleHiked();
  const updateDate = useUpdateHikedDate();
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) { setEditingId(null); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, editingId]);

  if (!open) return null;

  function startEdit(id: string, currentDate: string | null) {
    setEditingId(id);
    setEditingDate(currentDate ?? new Date().toISOString().split("T")[0]);
  }

  function saveEdit(id: string) {
    if (editingDate) {
      updateDate.mutate({ id, hikedAt: editingDate });
    }
    setEditingId(null);
  }

  function formatDate(dateStr: string) {
    // hiked_at is a plain date (YYYY-MM-DD); parse as local to avoid timezone shift
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Footprints size={18} className="text-green-700" />
            <h2 className="font-semibold text-gray-800">Trail History</h2>
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
              <Footprints size={36} className="text-gray-200" />
              <p className="text-sm text-gray-500">No hikes recorded yet.</p>
              <p className="text-xs text-gray-400">
                Click a trail on the map and hit "Mark as Hiked" to add it here.
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        trail.trail_source === "otn"
                          ? "bg-green-100 text-green-700"
                          : "bg-teal-100 text-teal-700"
                      }`}>
                        {trail.trail_source === "otn" ? "OTN" : "OSM"}
                      </span>

                      {editingId === trail.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Date Hiked:</span>
                          <input
                            type="date"
                            value={editingDate}
                            onChange={(e) => setEditingDate(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(trail.id); }}
                            autoFocus
                            className="text-xs border border-green-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                          <button
                            onClick={() => saveEdit(trail.id)}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            aria-label="Save date"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            Date Hiked: {trail.hiked_at ? formatDate(trail.hiked_at) : "—"}
                          </span>
                          <button
                            onClick={() => startEdit(trail.id, trail.hiked_at)}
                            className="flex items-center gap-1 text-gray-300 hover:text-gray-500 transition-colors"
                            aria-label="Edit date"
                          >
                            <Pencil size={12} /><span className="text-xs">Edit date</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      toggleHiked.mutate({
                        trailId: trail.trail_id,
                        trailName: trail.trail_name ?? "",
                        trailSource: trail.trail_source ?? "",
                        isHiked: true,
                      })
                    }
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    aria-label="Remove from history"
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
            {trails.length} trail{trails.length !== 1 ? "s" : ""} hiked
          </div>
        )}
      </div>
    </div>
  );
}
