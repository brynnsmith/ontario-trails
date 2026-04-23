"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/providers";
import AuthModal from "./AuthModal";
import TrailHistoryModal from "./TrailHistoryModal";
import FavouriteTrailsModal from "./FavouriteTrailsModal";
import PlannedHikesModal from "./PlannedHikesModal";

export default function NavBar() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [favouritesOpen, setFavouritesOpen] = useState(false);
  const [plannedOpen, setPlannedOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [dropdownOpen]);

  async function signOut() {
    setDropdownOpen(false);
    await supabase.auth.signOut();
  }

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? "?";
  const emailDisplay = user?.email ?? "";

  return (
    <>
      <header className="h-12 bg-green-800 text-white flex items-center justify-between px-4 shrink-0">
        <span className="font-semibold text-sm tracking-wide">Ontario Trail Tracker</span>

        {!loading && (
          <div className="flex items-center gap-3">
            {!user ? (
              <button
                onClick={() => setModalOpen(true)}
                className="text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors"
              >
                Sign in
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors"
                >
                  {/* Avatar circle */}
                  <span className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">
                    {avatarLetter}
                  </span>
                  {/* Email — hidden on small screens */}
                  <span className="hidden sm:block text-xs max-w-[140px] truncate">
                    {emailDisplay}
                  </span>
                  {/* Chevron */}
                  <svg
                    className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M2 4l4 4 4-4" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-white text-gray-800 rounded-lg shadow-lg py-1 z-40">
                    {[
                      { label: "Edit Profile", onClick: () => {} },
                      {
                        label: "Trail History",
                        onClick: () => { setDropdownOpen(false); setHistoryOpen(true); },
                      },
                      {
                        label: "Favourite Trails",
                        onClick: () => { setDropdownOpen(false); setFavouritesOpen(true); },
                      },
                      {
                        label: "Planned Hikes",
                        onClick: () => { setDropdownOpen(false); setPlannedOpen(true); },
                      },
                    ].map(({ label, onClick }) => (
                      <button
                        key={label}
                        onClick={() => { setDropdownOpen(false); onClick(); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={signOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <TrailHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <FavouriteTrailsModal open={favouritesOpen} onClose={() => setFavouritesOpen(false)} />
      <PlannedHikesModal open={plannedOpen} onClose={() => setPlannedOpen(false)} />
    </>
  );
}
