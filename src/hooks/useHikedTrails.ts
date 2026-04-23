import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/app/providers";

export interface HikedTrail {
  id: string;
  trail_id: string;
  trail_name: string | null;
  trail_source: string | null;
  created_at: string;
  hiked_at: string | null;
  center_lng: number | null;
  center_lat: number | null;
}

export function useHikedTrails() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;

  return useQuery({
    queryKey: ["hiked-trails", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_trails")
        .select("id, trail_id, trail_name, trail_source, created_at, hiked_at, center_lng, center_lat")
        .eq("status", "hiked")
        .order("hiked_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as HikedTrail[];
    },
  });
}

export function useToggleHiked() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trailId,
      trailName,
      trailSource,
      isHiked,
      centerLng,
      centerLat,
    }: {
      trailId: string;
      trailName: string;
      trailSource: string;
      isHiked: boolean;
      centerLng?: number;
      centerLat?: number;
    }) => {
      if (!user) throw new Error("Not signed in");

      if (isHiked) {
        const { error } = await supabase
          .from("user_trails")
          .delete()
          .eq("user_id", user.id)
          .eq("trail_id", trailId)
          .eq("status", "hiked");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_trails").insert({
          user_id: user.id,
          trail_id: trailId,
          trail_name: trailName,
          trail_source: trailSource,
          status: "hiked",
          hiked_at: new Date().toISOString().split("T")[0],
          center_lng: centerLng ?? null,
          center_lat: centerLat ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ["hiked-trails", user?.id] });
    },
  });
}

export function useUpdateHikedDate() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, hikedAt }: { id: string; hikedAt: string }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("user_trails")
        .update({ hiked_at: hikedAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiked-trails", user?.id] });
    },
  });
}

// ── Favourites ────────────────────────────────────────────────────────────────

export interface FavouriteTrail {
  id: string;
  trail_id: string;
  trail_name: string | null;
  trail_source: string | null;
  created_at: string;
  center_lng: number | null;
  center_lat: number | null;
}

export function useFavouriteTrails() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;

  return useQuery({
    queryKey: ["favourite-trails", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_trails")
        .select("id, trail_id, trail_name, trail_source, created_at, center_lng, center_lat")
        .eq("status", "favourite")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FavouriteTrail[];
    },
  });
}

export function useToggleFavourite() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trailId,
      trailName,
      trailSource,
      isFavourite,
      centerLng,
      centerLat,
    }: {
      trailId: string;
      trailName: string;
      trailSource: string;
      isFavourite: boolean;
      centerLng?: number;
      centerLat?: number;
    }) => {
      if (!user) throw new Error("Not signed in");

      if (isFavourite) {
        const { error } = await supabase
          .from("user_trails")
          .delete()
          .eq("user_id", user.id)
          .eq("trail_id", trailId)
          .eq("status", "favourite");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_trails").insert({
          user_id: user.id,
          trail_id: trailId,
          trail_name: trailName,
          trail_source: trailSource,
          status: "favourite",
          center_lng: centerLng ?? null,
          center_lat: centerLat ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favourite-trails", user?.id] });
    },
  });
}

// ── Planned Hikes ─────────────────────────────────────────────────────────────

export interface PlannedTrail {
  id: string;
  trail_id: string;
  trail_name: string | null;
  trail_source: string | null;
  created_at: string;
  sort_order: number;
  center_lng: number | null;
  center_lat: number | null;
}

export function usePlannedTrails() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;

  return useQuery({
    queryKey: ["planned-trails", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_trails")
        .select("id, trail_id, trail_name, trail_source, created_at, sort_order, center_lng, center_lat")
        .eq("status", "planned")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlannedTrail[];
    },
  });
}

export function useTogglePlanned() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trailId,
      trailName,
      trailSource,
      isPlanned,
      centerLng,
      centerLat,
    }: {
      trailId: string;
      trailName: string;
      trailSource: string;
      isPlanned: boolean;
      centerLng?: number;
      centerLat?: number;
    }) => {
      if (!user) throw new Error("Not signed in");

      if (isPlanned) {
        const { error } = await supabase
          .from("user_trails")
          .delete()
          .eq("user_id", user.id)
          .eq("trail_id", trailId)
          .eq("status", "planned");
        if (error) throw error;
      } else {
        // Place new item at the end
        const { count } = await supabase
          .from("user_trails")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "planned");
        const { error } = await supabase.from("user_trails").insert({
          user_id: user.id,
          trail_id: trailId,
          trail_name: trailName,
          trail_source: trailSource,
          status: "planned",
          sort_order: count ?? 0,
          center_lng: centerLng ?? null,
          center_lat: centerLat ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-trails", user?.id] });
    },
  });
}

export function useReorderPlanned() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!user) throw new Error("Not signed in");
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from("user_trails").update({ sort_order: index }).eq("id", id)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-trails", user?.id] });
    },
  });
}
