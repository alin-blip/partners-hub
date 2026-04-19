import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Globe, Building2 } from "lucide-react";

const STATUS_VARIANTS: Record<string, string> = {
  new: "default", reviewing: "secondary", approved: "default", rejected: "destructive",
};

export default function CompanyApplicationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [active, setActive] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["company-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, approve }: { id: string; status: string; approve?: boolean }) => {
      let approved_company_id: string | null = null;
      if (approve && active) {
        const { data: company, error: cErr } = await supabase.from("companies").insert({
          name: active.company_name, business_type: active.business_type,
          contact_email: active.contact_email, contact_phone: active.contact_phone,
        }).select().single();
        if (cErr) throw cErr;
        approved_company_id = company.id;
      }
      const { error } = await supabase.from("company_applications").update({
        status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null,
        reviewer_notes: notes || null, ...(approved_company_id ? { approved_company_id } : {}),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-applications"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      setActive(null); setNotes("");
      toast({ title: "Application updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partner applications</h1>
          <p className="text-sm text-muted-foreground">Review and onboard new B2B partners.</p>
        </div>

        {isLoading ? <div className="text-muted-foreground">Loading…</div> :
         apps.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No applications yet.</CardContent></Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">
            {apps.map((a: any) => (
              <Card key={a.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActive(a); setNotes(a.reviewer_notes ?? ""); }}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" />{a.company_name}</p>
                      {a.business_type && <p className="text-xs text-muted-foreground">{a.business_type}</p>}
                    </div>
                    <Badge variant={(STATUS_VARIANTS[a.status] ?? "outline") as any}>{a.status}</Badge>
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p>{a.contact_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{a.contact_email}</p>
                    {a.contact_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{a.contact_phone}</p>}
                    {a.website && <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{a.website}</p>}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground pt-1">
                    {a.branches_count != null && <span>{a.branches_count} branches</span>}
                    {a.estimated_referrals_per_month != null && <span>{a.estimated_referrals_per_month}/mo referrals</span>}
                    <span className="ml-auto">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{active?.company_name}</DialogTitle></DialogHeader>
            {active && (
              <div className="space-y-3 text-sm">
                {active.message && <div><p className="text-xs uppercase text-muted-foreground mb-1">Message</p><p className="whitespace-pre-wrap">{active.message}</p></div>}
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Reviewer notes</p>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" onClick={() => updateStatus.mutate({ id: active.id, status: "rejected" })} disabled={updateStatus.isPending}>Reject</Button>
              <Button variant="secondary" onClick={() => updateStatus.mutate({ id: active.id, status: "reviewing" })} disabled={updateStatus.isPending}>Mark reviewing</Button>
              <Button onClick={() => updateStatus.mutate({ id: active.id, status: "approved", approve: true })} disabled={updateStatus.isPending}>
                Approve & create company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
