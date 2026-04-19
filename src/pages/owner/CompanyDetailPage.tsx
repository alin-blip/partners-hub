import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["company-branches", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from("branches").select("*").eq("company_id", id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const [editing, setEditing] = useState<any>(null);
  const update = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("companies").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company", id] });
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const [branchOpen, setBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: "", city: "", address: "", phone: "", email: "" });
  const createBranch = useMutation({
    mutationFn: async () => {
      const slug = branchForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from("branches").insert({
        company_id: id!,
        name: branchForm.name.trim(),
        city: branchForm.city.trim() || null,
        address: branchForm.address.trim() || null,
        phone: branchForm.phone.trim() || null,
        email: branchForm.email.trim() || null,
        slug,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-branches", id] });
      setBranchOpen(false);
      setBranchForm({ name: "", city: "", address: "", phone: "", email: "" });
      toast({ title: "Branch created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <DashboardLayout allowedRoles={["owner"]}><div className="text-muted-foreground">Loading…</div></DashboardLayout>;
  if (!company) return <DashboardLayout allowedRoles={["owner"]}><div>Not found.</div></DashboardLayout>;

  const c = editing ?? company;

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link to="/owner/companies" className="text-xs text-muted-foreground hover:text-foreground">← Companies</Link>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {company.business_type && <span className="text-sm text-muted-foreground">{company.business_type}</span>}
              <Badge variant={company.is_active ? "default" : "secondary"}>{company.is_active ? "Active" : "Inactive"}</Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="branches">Branches ({branches.length})</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Company details</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <Field label="Name"><Input value={c.name ?? ""} onChange={(e) => setEditing({ ...c, name: e.target.value })} /></Field>
                <Field label="Business type"><Input value={c.business_type ?? ""} onChange={(e) => setEditing({ ...c, business_type: e.target.value })} /></Field>
                <Field label="Contact email"><Input value={c.contact_email ?? ""} onChange={(e) => setEditing({ ...c, contact_email: e.target.value })} /></Field>
                <Field label="Contact phone"><Input value={c.contact_phone ?? ""} onChange={(e) => setEditing({ ...c, contact_phone: e.target.value })} /></Field>
                <Field label="Logo URL"><Input value={c.logo_url ?? ""} onChange={(e) => setEditing({ ...c, logo_url: e.target.value })} /></Field>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={!!c.is_active} onCheckedChange={(v) => setEditing({ ...c, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="md:col-span-2"><Field label="Notes"><Textarea rows={3} value={c.notes ?? ""} onChange={(e) => setEditing({ ...c, notes: e.target.value })} /></Field></div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  {editing && <Button variant="outline" onClick={() => setEditing(null)}>Discard</Button>}
                  <Button disabled={!editing || update.isPending} onClick={() => editing && update.mutate({
                    name: editing.name, business_type: editing.business_type, contact_email: editing.contact_email,
                    contact_phone: editing.contact_phone, logo_url: editing.logo_url, is_active: editing.is_active, notes: editing.notes,
                  }, { onSuccess: () => setEditing(null) })}>
                    {update.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
                <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New branch</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create branch</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Field label="Name *"><Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} /></Field>
                    <Field label="City"><Input value={branchForm.city} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} /></Field>
                    <Field label="Address"><Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} /></Field>
                    <Field label="Phone"><Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} /></Field>
                    <Field label="Email"><Input type="email" value={branchForm.email} onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })} /></Field>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBranchOpen(false)}>Cancel</Button>
                    <Button onClick={() => createBranch.mutate()} disabled={!branchForm.name.trim() || createBranch.isPending}>
                      {createBranch.isPending ? "Creating…" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {branches.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />No branches yet.</CardContent></Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map((b: any) => (
                  <Link key={b.id} to={`/owner/branches/${b.id}`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                      <CardHeader>
                        <CardTitle className="text-base flex items-start justify-between gap-2">
                          <span>{b.name}</span>
                          <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-1">
                        {b.city && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.city}</p>}
                        {b.email && <p>{b.email}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contract">
            <Card>
              <CardHeader><CardTitle>Contract terms</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={10} placeholder="Paste or draft contract terms…"
                  value={c.contract_terms ?? ""} onChange={(e) => setEditing({ ...c, contract_terms: e.target.value })} />
                <div className="flex justify-end">
                  <Button disabled={!editing || update.isPending} onClick={() => editing && update.mutate({ contract_terms: editing.contract_terms }, { onSuccess: () => setEditing(null) })}>
                    {update.isPending ? "Saving…" : "Save contract"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
