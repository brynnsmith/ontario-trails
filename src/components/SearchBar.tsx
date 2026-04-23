"use client";

import { useEffect, useRef, useState } from "react";
import { useMapStore } from "@/store/mapStore";
import type { TrailFeature } from "@/types/trail";

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number]; // [west, south, east, north]
  place_type: string[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
const DEBOUNCE_MS = 300;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function SearchBar() {
  const { trails, setSelectedTrail, setFlyToTrail, setFlyToCoords } = useMapStore();

  const [query, setQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeocodingFeature[]>([]);
  const [trailMatches, setTrailMatches] = useState<TrailFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Local trail filter — synchronous
  useEffect(() => {
    if (debouncedQuery.length < 2 || !trails) {
      setTrailMatches([]);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    const matches = trails.features
      .filter((f) => (f.properties._name ?? "").toLowerCase().includes(q))
      .slice(0, 4) as TrailFeature[];
    setTrailMatches(matches);
  }, [debouncedQuery, trails]);

  // Mapbox Geocoding — async
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setGeoResults([]);
      setIsLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      country: "CA",
      proximity: "-83.0,44.5",
      types: "place,locality,neighborhood,poi,region,district",
      limit: "5",
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(debouncedQuery)}.json?${params}`;

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setGeoResults(data.features ?? []);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  // Open dropdown when there are results
  useEffect(() => {
    if (debouncedQuery.length >= 2 && (trailMatches.length > 0 || geoResults.length > 0 || isLoading)) {
      setOpen(true);
    } else if (debouncedQuery.length < 2) {
      setOpen(false);
    }
  }, [debouncedQuery, trailMatches, geoResults, isLoading]);

  // Click outside closes dropdown
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function clearInput() {
    setQuery("");
    setTrailMatches([]);
    setGeoResults([]);
    setOpen(false);
    if (abortRef.current) abortRef.current.abort();
  }

  function selectTrail(trail: TrailFeature) {
    setSelectedTrail(trail);
    setFlyToTrail(trail);
    clearInput();
  }

  function selectGeoResult(feature: GeocodingFeature) {
    // Mapbox bbox is [west, south, east, north] — matches our FlyToCoords format
    setFlyToCoords({
      center: feature.center,
      bbox: feature.bbox,
    });
    clearInput();
  }

  const hasResults = trailMatches.length > 0 || geoResults.length > 0;

  return (
    <div ref={containerRef} className="relative px-3 pt-3 pb-2">
      {/* Input row */}
      <div className="relative flex items-center">
        <span className="absolute left-2.5 text-gray-400 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" clipRule="evenodd" />
          </svg>
        </span>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (hasResults && debouncedQuery.length >= 2) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); }
          }}
          placeholder="Search trails or places…"
          className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />

        {/* Loading spinner */}
        {isLoading && (
          <span className="absolute right-2.5 text-gray-400">
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        )}

        {/* Clear button */}
        {!isLoading && query.length > 0 && (
          <button
            onClick={clearInput}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (trailMatches.length > 0 || geoResults.length > 0) && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden max-h-72 overflow-y-auto">
          {/* Trail matches section */}
          {trailMatches.length > 0 && (
            <div>
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Trails
              </p>
              {trailMatches.map((trail) => (
                <button
                  key={trail.properties._id}
                  onClick={() => selectTrail(trail)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2 border-l-2 border-green-500"
                >
                  <span className="text-green-600 shrink-0">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="truncate text-gray-800">
                    {trail.properties._name ?? "(unnamed)"}
                  </span>
                  <span className={`ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                    trail.properties._source === "otn"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {trail.properties._source?.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Geocoding results section */}
          {geoResults.length > 0 && (
            <div>
              <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                Locations
              </p>
              {geoResults.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => selectGeoResult(feature)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-gray-400 shrink-0">
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="truncate text-gray-800 flex-1">
                    {feature.place_name}
                  </span>
                  <span className="ml-auto shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                    {feature.place_type[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
