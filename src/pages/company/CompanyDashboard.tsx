import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Users, Inbox } from "lucide-react";

export default function CompanyDashboard() {
  const { user } = useAuth();

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("company_users").select("company_id").eq("user_id", user.id).maybeSingle();
      return data?.company_id ?? null;
    },
    enabled: !!user,
  });

  const { data: company } = useQuery({
    queryKey: ["my-company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["my-company-branches", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("branches").select("*").eq("company_id", companyId).order("name");
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const { data: leadsTotal = 0 } = useQuery({
    queryKey: ["my-company-leads-total", companyId],
    queryFn: async () => {
      if (!companyId || branches.length === 0) return 0;
      const { count } = await supabase.from("widget_leads").select("id", { count: "exact", head: true })
        .in("branch_id", branches.map((b: any) => b.id));
      return count ?? 0;
    },
    enabled: !!companyId && branches.length > 0,
  });

  return (
    <DashboardLayout allowedRoles={["company_admin", "owner"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{company?.name ?? "Company dashboard"}</h1>
          {company?.business_type && <p className="text-sm text-muted-foreground">{company.business_type}</p>}
        </div>

        {!companyId ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            You are not yet linked to a company. Ask your platform administrator to assign you.
          </CardContent></Card>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <Stat icon={<Building2 />} label="Branches" value={branches.length} />
              <Stat icon={<Inbox />} label="Widget leads" value={leadsTotal} />
              <Stat icon={<Users />} label="Status" value={company?.is_active ? "Active" : "Inactive"} />
            </div>

            <Card>
              <CardHeader><CardTitle>Branches</CardTitle></CardHeader>
              <CardContent>
                {branches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No branches yet.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map((b: any) => (
                      <Link key={b.id} to={`/company/branches/${b.id}`}>
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                          <CardContent className="p-4">
                            <p className="font-medium">{b.name}</p>
                            {b.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{b.city}</p>}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
