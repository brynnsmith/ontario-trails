"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlannedTrails, useTogglePlanned, useReorderPlanned, type PlannedTrail } from "@/hooks/useHikedTrails";
import { useMapStore } from "@/store/mapStore";

interface PlannedHikesModalProps {
  open: boolean;
  onClose: () => void;
}

function SortableRow({
  trail,
  onRemove,
  onNavigate,
}: {
  trail: PlannedTrail;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: trail.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-5 py-3 bg-white"
    >
      <div className="flex-1 min-w-0">
        <button
          onClick={onNavigate}
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
        onClick={onRemove}
        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
        aria-label="Remove from planned hikes"
      >
        <Trash2 size={15} />
      </button>

      <button
        {...attributes}
        {...listeners}
        className="shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
    </li>
  );
}

export default function PlannedHikesModal({ open, onClose }: PlannedHikesModalProps) {
  const { data: serverTrails = [], isLoading } = usePlannedTrails();
  const togglePlanned = useTogglePlanned();
  const reorderPlanned = useReorderPlanned();
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

  // Local copy for optimistic reorder
  const [trails, setTrails] = useState<PlannedTrail[]>([]);
  useEffect(() => { setTrails(serverTrails); }, [serverTrails]);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTrails((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id);
      const newIndex = prev.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderPlanned.mutate(reordered.map((t) => t.id));
      return reordered;
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
            <MapPin size={18} className="text-green-700" />
            <h2 className="font-semibold text-gray-800">Planned Hikes</h2>
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
              <MapPin size={36} className="text-gray-200" />
              <p className="text-sm text-gray-500">No planned hikes yet.</p>
              <p className="text-xs text-gray-400">
                Click a trail on the map and hit "Add to Planned Hikes" to save it here.
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={trails.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y">
                  {trails.map((trail) => (
                    <SortableRow
                      key={trail.id}
                      trail={trail}
                      onNavigate={() => navigateToTrail(trail.trail_id, trail.center_lng, trail.center_lat)}
                      onRemove={() =>
                        togglePlanned.mutate({
                          trailId: trail.trail_id,
                          trailName: trail.trail_name ?? "",
                          trailSource: trail.trail_source ?? "",
                          isPlanned: true,
                        })
                      }
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {trails.length > 0 && (
          <div className="px-5 py-3 border-t shrink-0 text-xs text-gray-400">
            {trails.length} hike{trails.length !== 1 ? "s" : ""} planned
          </div>
        )}
      </div>
    </div>
  );
}
