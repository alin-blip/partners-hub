import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, Mail } from "lucide-react";

export default function BranchCardPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: branch, isLoading } = useQuery({
    queryKey: ["public-branch", slug],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("*, companies(name, business_type, logo_url)").eq("slug", slug!).eq("is_active", true).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0A1628] text-white/60">Loading…</div>;
  if (!branch) return <div className="min-h-screen flex items-center justify-center bg-[#0A1628] text-white">Branch not found.</div>;

  const company = (branch as any).companies;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white py-12 px-4">
      <div className="max-w-md mx-auto bg-white/[0.04] border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="text-center space-y-2">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-20 h-20 mx-auto rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#D4AF37] text-[#0A1628] flex items-center justify-center">
              <Building2 className="w-10 h-10" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{company?.name}</h1>
          <p className="text-[#D4AF37] font-medium">{branch.name}</p>
          {company?.business_type && <p className="text-xs text-white/50 uppercase tracking-wider">{company.business_type}</p>}
        </div>

        <div className="space-y-2 text-sm">
          {branch.address && (
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
              <MapPin className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
              <div>
                <p>{branch.address}</p>
                {branch.city && <p className="text-white/60">{branch.city} {branch.postcode ?? ""}</p>}
              </div>
            </div>
          )}
          {branch.phone && (
            <a href={`tel:${branch.phone}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <Phone className="w-4 h-4 text-[#D4AF37]" />
              <span>{branch.phone}</span>
            </a>
          )}
          {branch.email && (
            <a href={`mailto:${branch.email}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <span>{branch.email}</span>
            </a>
          )}
        </div>

        <Button asChild className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 rounded-full">
          <Link to={`/widget/${branch.slug}`}>Get more info</Link>
        </Button>
      </div>
    </div>
  );
}
