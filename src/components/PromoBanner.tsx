import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, X } from "lucide-react";
import { useState, useEffect } from "react";

function useCountdown(deadline: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        expired: false,
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return timeLeft;
}

export function PromoBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("dismissed-promos");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["active-promotions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions" as any)
        .select("*")
        .eq("is_active", true)
        .gte("deadline", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      return (data || []) as any[];
    },
  });

  const promo = promotions.find((p: any) => !dismissed.has(p.id));

  if (!promo) return null;

  return <PromoBannerCard promo={promo} onDismiss={(id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-promos", JSON.stringify([...next]));
  }} />;
}

function PromoBannerCard({ promo, onDismiss }: { promo: any; onDismiss: (id: string) => void }) {
  const { days, hours, mins, secs, expired } = useCountdown(promo.deadline);

  if (expired) return null;

  return (
    <div className="relative rounded-lg bg-gradient-to-r from-accent/90 to-accent p-4 sm:p-5 text-accent-foreground overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <button
        onClick={() => onDismiss(promo.id)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <Trophy className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg leading-tight">{promo.title}</h3>
          {promo.description && (
            <p className="text-sm mt-1 opacity-90">{promo.description}</p>
          )}
          <p className="text-sm mt-1 font-medium opacity-80">
            🎯 Target: {promo.target_students} students · 💰 Bonus: £{promo.bonus_amount}
            {promo.bonus_percentage ? ` + ${promo.bonus_percentage}% commission` : ""}
          </p>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          {[
            { val: days, label: "Days" },
            { val: hours, label: "Hrs" },
            { val: mins, label: "Min" },
            { val: secs, label: "Sec" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center bg-white/20 rounded-md px-2 py-1.5 min-w-[48px]">
              <p className="text-xl font-bold leading-none">{String(val).padStart(2, "0")}</p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
