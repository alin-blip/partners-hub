import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BranchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: branch } = useQuery({
    queryKey: ["branch", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*, companies(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: widget } = useQuery({
    queryKey: ["branch-widget", id],
    queryFn: async () => {
      const { data } = await supabase.from("branch_widget_settings").select("*").eq("branch_id", id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["widget-leads", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("widget_leads").select("*").eq("branch_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const [edit, setEdit] = useState<any>(null);
  useEffect(() => { if (branch && !edit) setEdit(null); }, [branch, edit]);

  const updateBranch = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("branches").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch", id] }); setEdit(null); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const upsertWidget = useMutation({
    mutationFn: async (patch: any) => {
      if (widget) {
        const { error } = await supabase.from("branch_widget_settings").update(patch).eq("branch_id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branch_widget_settings").insert({ branch_id: id!, ...patch });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branch-widget", id] }); toast({ title: "Widget saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!branch) return <DashboardLayout allowedRoles={["owner"]}><div className="text-muted-foreground">Loading…</div></DashboardLayout>;

  const b = edit ?? branch;
  const widgetUrl = `${window.location.origin}/widget/${branch.slug}`;
  const branchCardUrl = `${window.location.origin}/branch-card/${branch.slug}`;

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div>
          <Link to={`/owner/companies/${branch.company_id}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← {(branch as any).companies?.name ?? "Company"}
          </Link>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{branch.name}</h1>
            <Badge variant={branch.is_active ? "default" : "secondary"}>{branch.is_active ? "Active" : "Inactive"}</Badge>
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
            <TabsTrigger value="leads">Widget leads ({leads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader><CardTitle>Branch details</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <Field label="Name"><Input value={b.name ?? ""} onChange={(e) => setEdit({ ...b, name: e.target.value })} /></Field>
                <Field label="City"><Input value={b.city ?? ""} onChange={(e) => setEdit({ ...b, city: e.target.value })} /></Field>
                <Field label="Address"><Input value={b.address ?? ""} onChange={(e) => setEdit({ ...b, address: e.target.value })} /></Field>
                <Field label="Postcode"><Input value={b.postcode ?? ""} onChange={(e) => setEdit({ ...b, postcode: e.target.value })} /></Field>
                <Field label="Phone"><Input value={b.phone ?? ""} onChange={(e) => setEdit({ ...b, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={b.email ?? ""} onChange={(e) => setEdit({ ...b, email: e.target.value })} /></Field>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={!!b.is_active} onCheckedChange={(v) => setEdit({ ...b, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="md:col-span-2 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Public card:</span>
                    <a href={branchCardUrl} target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1">
                      {branchCardUrl} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    {edit && <Button variant="outline" onClick={() => setEdit(null)}>Discard</Button>}
                    <Button disabled={!edit || updateBranch.isPending} onClick={() => edit && updateBranch.mutate({
                      name: edit.name, city: edit.city, address: edit.address, postcode: edit.postcode,
                      phone: edit.phone, email: edit.email, is_active: edit.is_active,
                    })}>
                      {updateBranch.isPending ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="widget">
            <WidgetTab widget={widget} widgetUrl={widgetUrl} onSave={(patch) => upsertWidget.mutate(patch)} saving={upsertWidget.isPending} />
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardContent className="p-0">
                {leads.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No widget leads yet.</div>
                ) : (
                  <div className="divide-y">
                    {leads.map((l: any) => (
                      <div key={l.id} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{l.first_name} {l.last_name}</p>
                          <p className="text-xs text-muted-foreground">{l.email} {l.phone && `· ${l.phone}`}</p>
                          {l.course_interest && <p className="text-xs text-muted-foreground mt-1">Interested in: {l.course_interest}</p>}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{l.status}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(l.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function WidgetTab({ widget, widgetUrl, onSave, saving }: any) {
  const { toast } = useToast();
  const [w, setW] = useState<any>(widget ?? {
    is_enabled: true, primary_color: "#0A1628", accent_color: "#D4AF37",
    greeting_text: "Interested in studying in the UK? Let us help.", button_text: "Get info",
  });
  useEffect(() => { if (widget) setW(widget); }, [widget]);

  return (
    <Card>
      <CardHeader><CardTitle>Lead-capture widget</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch checked={!!w.is_enabled} onCheckedChange={(v) => setW({ ...w, is_enabled: v })} />
          <Label>Widget enabled</Label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Greeting text"><Input value={w.greeting_text ?? ""} onChange={(e) => setW({ ...w, greeting_text: e.target.value })} /></Field>
          <Field label="Button text"><Input value={w.button_text ?? ""} onChange={(e) => setW({ ...w, button_text: e.target.value })} /></Field>
          <Field label="Primary color"><Input type="color" value={w.primary_color ?? "#0A1628"} onChange={(e) => setW({ ...w, primary_color: e.target.value })} /></Field>
          <Field label="Accent color"><Input type="color" value={w.accent_color ?? "#D4AF37"} onChange={(e) => setW({ ...w, accent_color: e.target.value })} /></Field>
        </div>
        <div className="bg-muted rounded-lg p-3 flex items-center justify-between gap-2">
          <code className="text-xs truncate">{widgetUrl}</code>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(widgetUrl); toast({ title: "Link copied" }); }}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-end">
          <Button disabled={saving} onClick={() => onSave({
            is_enabled: w.is_enabled, primary_color: w.primary_color, accent_color: w.accent_color,
            greeting_text: w.greeting_text, button_text: w.button_text,
          })}>{saving ? "Saving…" : "Save widget settings"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
