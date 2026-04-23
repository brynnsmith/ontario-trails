"use client";

import type { ParkFeature } from "@/types/park";

interface ParkPanelProps {
  park: ParkFeature;
  onClose: () => void;
}

const CLASS_COLOURS: Record<string, string> = {
  "Wilderness":          "bg-green-900 text-green-100",
  "Nature Reserve":      "bg-green-700 text-green-100",
  "Natural Environment": "bg-green-600 text-green-100",
  "Waterway":            "bg-blue-600  text-blue-100",
  "Recreational":        "bg-lime-600  text-lime-100",
  "Cultural Heritage":   "bg-amber-700 text-amber-100",
  "Urban":               "bg-violet-600 text-violet-100",
  "Adventure":           "bg-orange-600 text-orange-100",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

export default function ParkPanel({ park, onClose }: ParkPanelProps) {
  const p = park.properties;
  const parkClass = p.PROVINCIAL_PARK_CLASS_ENG ?? "";
  const badgeClass = CLASS_COLOURS[parkClass] ?? "bg-gray-600 text-gray-100";

  const areaText = p.REGULATED_AREA
    ? `${p.REGULATED_AREA.toLocaleString()} ha`
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-green-800 text-white px-4 py-4 flex items-start justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-base font-semibold leading-snug">{p._name}</h2>
          {parkClass && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded mt-1 inline-block ${badgeClass}`}>
              {parkClass}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 mt-0.5 text-white/70 hover:text-white transition-colors text-sm"
          aria-label="Close"
        >
          ← Back
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {p.PROTECTED_AREA_NAME_ENG && p.PROTECTED_AREA_NAME_ENG !== p._name && (
          <Row label="Full Name" value={p.PROTECTED_AREA_NAME_ENG} />
        )}
        <Row label="Area" value={areaText} />
        <Row label="Established" value={p.PROTDATE ? String(p.PROTDATE) : null} />
        <Row
          label="Operating Status"
          value={
            p.OPERATING_STATUS_IND === "Yes" ? (
              <span className="text-green-700 font-medium">Currently Operating</span>
            ) : p.OPERATING_STATUS_IND === "No" ? (
              <span className="text-gray-500">Not Currently Operating</span>
            ) : null
          }
        />
        {p.URL && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ontario Parks Page</p>
            <a
              href={p.URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 underline hover:text-green-900 mt-0.5 inline-block break-all"
            >
              View on Ontario Parks ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
