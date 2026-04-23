"use client";

import { useEffect, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import TrailListPanel from "./TrailListPanel";
import ParkListPanel from "./ParkListPanel";
import TrailPanel from "./TrailPanel";
import ParkPanel from "./ParkPanel";
import SearchBar from "./SearchBar";

const MIN_ZOOM = 9;
const LIST_ZOOM = 11;

type Tab = "trails" | "parks";

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
      {children}
    </div>
  );
}

export default function SidePanel() {
  const {
    zoom, trails,
    selectedTrail, setSelectedTrail,
    selectedPark, setSelectedPark,
    setHoveredTrailName, setFlyToTrail,
  } = useMapStore();

  const [activeTab, setActiveTab] = useState<Tab>("trails");

  // Auto-switch tab to match what was clicked on the map
  useEffect(() => {
    if (selectedTrail) setActiveTab("trails");
  }, [selectedTrail]);

  useEffect(() => {
    if (selectedPark) setActiveTab("parks");
  }, [selectedPark]);

  const selectedTrailName = selectedTrail?.properties._name ?? null;
  const inDetailView = selectedTrail !== null || selectedPark !== null;
  const inListView = !inDetailView && zoom >= LIST_ZOOM;

  return (
    <div className="flex flex-col h-full">
      <SearchBar />

      {/* Tabs — shown in list mode only */}
      {inListView && (
        <div className="flex shrink-0 border-b border-gray-200 bg-white">
          {(["trails", "parks"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-green-700 text-green-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "trails" ? "Trails in View" : "Parks in View"}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {selectedTrail ? (
          <TrailPanel
            trail={selectedTrail}
            onClose={() => setSelectedTrail(null)}
          />
        ) : selectedPark ? (
          <ParkPanel
            park={selectedPark}
            onClose={() => setSelectedPark(null)}
          />
        ) : zoom < MIN_ZOOM ? (
          <Placeholder>
            <p className="text-2xl mb-3">🗺️</p>
            <p className="text-sm font-medium text-gray-500">
              Zoom in to explore Ontario trails
            </p>
          </Placeholder>
        ) : zoom < LIST_ZOOM ? (
          <Placeholder>
            <p className="text-2xl mb-3">🔍</p>
            <p className="text-sm font-medium text-gray-500">
              Keep zooming to load the trail list
            </p>
          </Placeholder>
        ) : activeTab === "trails" ? (
          trails ? (
            <TrailListPanel
              trails={trails}
              selectedTrailName={selectedTrailName}
              onSelect={(trail) => { setSelectedTrail(trail); setFlyToTrail(trail); }}
              onHover={setHoveredTrailName}
              onHoverEnd={() => setHoveredTrailName(null)}
            />
          ) : (
            <Placeholder>
              <p className="text-sm font-medium text-gray-500">Loading trails…</p>
            </Placeholder>
          )
        ) : (
          <ParkListPanel />
        )}
      </div>
    </div>
  );
}
