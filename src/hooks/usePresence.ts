import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceEntry {
  is_online: boolean;
  last_seen_at: string;
}

export type PresenceMap = Record<string, PresenceEntry>;

const HEARTBEAT_INTERVAL = 60_000; // 60s

export function usePresence(userId: string | undefined) {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const upsertPresence = useCallback(
    async (online: boolean) => {
      if (!userId) return;
      await supabase.from("user_presence" as any).upsert(
        { user_id: userId, is_online: online, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    },
    [userId]
  );

  // Fetch all presence rows the user can see
  const fetchPresence = useCallback(async () => {
    const { data } = await supabase.from("user_presence" as any).select("user_id, is_online, last_seen_at");
    if (data) {
      const map: PresenceMap = {};
      for (const row of data as any[]) {
        map[row.user_id] = { is_online: row.is_online, last_seen_at: row.last_seen_at };
      }
      setPresenceMap(map);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Go online
    upsertPresence(true);
    fetchPresence();

    // Heartbeat
    intervalRef.current = setInterval(() => {
      upsertPresence(true);
    }, HEARTBEAT_INTERVAL);

    // Realtime subscription
    const channel = supabase
      .channel("user-presence-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload: any) => {
          const row = payload.new as any;
          if (row?.user_id) {
            setPresenceMap((prev) => ({
              ...prev,
              [row.user_id]: { is_online: row.is_online, last_seen_at: row.last_seen_at },
            }));
          }
        }
      )
      .subscribe();

    // Go offline on tab close
    const handleUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${userId}`;
      const body = JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() });
      navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleUnload);
      supabase.removeChannel(channel);
      upsertPresence(false);
    };
  }, [userId, upsertPresence, fetchPresence]);

  return presenceMap;
}
