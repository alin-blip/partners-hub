import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const XP_VALUES: Record<string, number> = {
  daily_login: 10,
  enrollment_created: 50,
  student_added: 25,
  streak_bonus: 5, // per streak day
};

const LEVELS = [
  { level: 1, xpRequired: 0, title: "Rookie" },
  { level: 2, xpRequired: 100, title: "Explorer" },
  { level: 3, xpRequired: 300, title: "Achiever" },
  { level: 4, xpRequired: 600, title: "Pro Agent" },
  { level: 5, xpRequired: 1000, title: "Star Agent" },
  { level: 6, xpRequired: 1500, title: "Elite Agent" },
  { level: 7, xpRequired: 2500, title: "Legend" },
  { level: 8, xpRequired: 4000, title: "Champion" },
  { level: 9, xpRequired: 6000, title: "Grandmaster" },
  { level: 10, xpRequired: 10000, title: "Titan" },
];

export function getLevelInfo(totalXp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }
  const xpInLevel = totalXp - current.xpRequired;
  const xpForNext = next ? next.xpRequired - current.xpRequired : 1;
  const progress = next ? Math.min((xpInLevel / xpForNext) * 100, 100) : 100;
  return { current, next, progress, xpInLevel, xpForNext };
}

export function useAgentXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch streak data
  const { data: streak } = useQuery({
    queryKey: ["agent-streak", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Record daily login
  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const today = new Date().toISOString().split("T")[0];

      // Check if already logged today
      const { data: existing } = await supabase
        .from("agent_xp_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_type", "daily_login")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .maybeSingle();

      if (existing) return; // Already logged today

      // Get current streak
      const { data: currentStreak } = await supabase
        .from("agent_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = 1;
      let longestStreak = 1;

      if (currentStreak) {
        if (currentStreak.last_active_date === yesterdayStr) {
          newStreak = currentStreak.current_streak + 1;
        } else if (currentStreak.last_active_date === today) {
          return; // Already processed
        }
        longestStreak = Math.max(newStreak, currentStreak.longest_streak);
      }

      // Calculate XP: base login + streak bonus
      const streakBonus = Math.max(0, (newStreak - 1) * XP_VALUES.streak_bonus);
      const totalXpEarned = XP_VALUES.daily_login + streakBonus;
      const newTotalXp = (currentStreak?.total_xp || 0) + totalXpEarned;
      const newLevel = getLevelInfo(newTotalXp).current.level;

      // Insert XP event
      await supabase.from("agent_xp_events").insert({
        user_id: user.id,
        event_type: "daily_login",
        xp_amount: totalXpEarned,
        metadata: { streak: newStreak, bonus: streakBonus },
      });

      // Upsert streak
      await supabase.from("agent_streaks").upsert({
        user_id: user.id,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        total_xp: newTotalXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-streak"] });
    },
  });

  // Auto-record login on mount
  useEffect(() => {
    if (user) {
      loginMutation.mutate();
    }
  }, [user?.id]);

  return {
    streak,
    levelInfo: streak ? getLevelInfo(streak.total_xp) : getLevelInfo(0),
    XP_VALUES,
    LEVELS,
  };
}

// Hook to add XP for specific actions
export function useAddXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventType, metadata }: { eventType: string; metadata?: any }) => {
      if (!user) return;
      const xpAmount = XP_VALUES[eventType] || 10;

      await supabase.from("agent_xp_events").insert({
        user_id: user.id,
        event_type: eventType,
        xp_amount: xpAmount,
        metadata,
      });

      // Update total XP
      const { data: streak } = await supabase
        .from("agent_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const newTotalXp = (streak?.total_xp || 0) + xpAmount;
      const newLevel = getLevelInfo(newTotalXp).current.level;

      await supabase.from("agent_streaks").upsert({
        user_id: user.id,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        last_active_date: streak?.last_active_date || new Date().toISOString().split("T")[0],
        total_xp: newTotalXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-streak"] });
    },
  });
}
