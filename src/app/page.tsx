import dynamic from "next/dynamic";
import SidePanel from "@/components/SidePanel";

const TrailMap = dynamic(() => import("@/components/TrailMap"), { ssr: false });

export default function Home() {
  return (
    <main className="flex h-full bg-gray-100 p-4 gap-4">
      {/* Map — fills remaining space */}
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden shadow-lg">
        <TrailMap />
      </div>

      {/* Side panel — fixed width, lives outside the map */}
      <div className="w-[420px] shrink-0 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
        <SidePanel />
      </div>
    </main>
  );
}
