import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, Loader2, Palette, Calendar } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

function CrudSection({
  title,
  items,
  columns,
  renderRow,
  onAdd,
  addFields,
}: {
  title: string;
  items: any[];
  columns: string[];
  renderRow: (item: any) => React.ReactNode;
  onAdd: (data: any) => void;
  addFields: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData);
                onAdd(data);
                setOpen(false);
              }}
            >
              {addFields}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => renderRow(item))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-6">
                  No {title.toLowerCase()} yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CommissionTiersSection({ deleteItem }: { deleteItem: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: tiers = [] } = useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_tiers").select("*").order("min_students");
      return data || [];
    },
  });

  const addTier = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("commission_tiers").insert({
        tier_name: d.tier_name,
        min_students: Number(d.min_students),
        max_students: d.max_students ? Number(d.max_students) : null,
        commission_per_student: Number(d.commission_per_student),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commission-tiers"] });
      toast({ title: "Tier added" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Commission Tiers</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Commission Tier</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addTier.mutate(Object.fromEntries(formData));
                setOpen(false);
              }}
            >
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input name="tier_name" required placeholder="e.g. Bronze" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min Students</Label>
                  <Input name="min_students" type="number" required min={0} defaultValue={0} />
                </div>
                <div className="space-y-2">
                  <Label>Max Students</Label>
                  <Input name="max_students" type="number" placeholder="∞" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Commission per Student (£)</Label>
                <Input name="commission_per_student" type="number" required min={0} step="0.01" defaultValue={500} />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tier</TableHead>
              <TableHead>Min Students</TableHead>
              <TableHead>Max Students</TableHead>
              <TableHead>£ per Student</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.tier_name}</TableCell>
                <TableCell>{t.min_students}</TableCell>
                <TableCell>{t.max_students ?? "∞"}</TableCell>
                <TableCell>£{t.commission_per_student}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "commission_tiers", id: t.id })}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No tiers yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BrandSettingsSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("brand_settings" as any).select("*").limit(1).single();
      return data as any;
    },
  });

  const [brandPrompt, setBrandPrompt] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (brand && !initialized) {
    setBrandPrompt(brand.brand_prompt || "");
    setLogoUrl(brand.logo_url || "");
    setInitialized(true);
  }

  const saveBrand = useMutation({
    mutationFn: async () => {
      if (!brand?.id) throw new Error("No brand settings found");
      const { error } = await (supabase.from("brand_settings" as any) as any)
        .update({ brand_prompt: brandPrompt, logo_url: logoUrl || null, updated_at: new Date().toISOString() })
        .eq("id", brand.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-settings"] });
      toast({ title: "Brand settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("brand-assets").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      setLogoUrl(url);
      toast({ title: "Logo uploaded — click Save to apply" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Brand Guidelines for AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brand Prompt / Style Instructions</Label>
            <Textarea
              value={brandPrompt}
              onChange={(e) => setBrandPrompt(e.target.value)}
              placeholder="e.g. Use navy blue (#1a1a2e) and orange (#e94560) colors, modern minimalist style, include company name EduForYou UK. Professional tone, clean layouts."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              These instructions will be automatically included in every AI image generation to ensure brand consistency.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className="w-20 h-20 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div className="space-y-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      {uploading ? "Uploading…" : "Upload Logo"}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground">
                  PNG with transparent background recommended, min 200×200px
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => saveBrand.mutate()}
            disabled={saveBrand.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saveBrand.isPending ? "Saving…" : "Save Brand Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PromotionsSection({ deleteItem }: { deleteItem: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("promotions" as any).select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const addPromo = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await (supabase.from("promotions" as any) as any).insert({
        title: d.title,
        description: d.description || null,
        deadline: d.deadline,
        bonus_amount: Number(d.bonus_amount),
        bonus_percentage: d.bonus_percentage ? Number(d.bonus_percentage) : null,
        target_students: Number(d.target_students),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions-settings"] });
      qc.invalidateQueries({ queryKey: ["active-promotions"] });
      toast({ title: "Promotion added" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("promotions" as any) as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions-settings"] });
      qc.invalidateQueries({ queryKey: ["active-promotions"] });
      toast({ title: "Promotion updated" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Promotions</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Promotion</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addPromo.mutate(Object.fromEntries(formData));
                setOpen(false);
              }}
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" required placeholder="e.g. Spring Bonus Campaign" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input name="description" placeholder="Recruteaza si obtine 5 studenti admisi..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Target Students</Label>
                  <Input name="target_students" type="number" required min={1} defaultValue={5} />
                </div>
                <div className="space-y-2">
                  <Label>Bonus Amount (£)</Label>
                  <Input name="bonus_amount" type="number" required min={0} step="0.01" defaultValue={500} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Bonus % Commission</Label>
                  <Input name="bonus_percentage" type="number" min={0} max={100} placeholder="e.g. 25" defaultValue={25} />
                </div>
                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input name="deadline" type="datetime-local" required />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.target_students} students</TableCell>
                <TableCell>£{p.bonus_amount}{p.bonus_percentage ? ` + ${p.bonus_percentage}%` : ""}</TableCell>
                <TableCell className="text-sm">{format(new Date(p.deadline), "dd MMM yyyy HH:mm")}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={p.is_active ? "text-green-600" : "text-muted-foreground"}
                    onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                  >
                    {p.is_active ? "Active" : "Inactive"}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "promotions", id: p.id })}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {promotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  No promotions yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UniversitiesSection({ universities, addUni, deleteItem }: { universities: any[]; addUni: any; deleteItem: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const toggleTimetable = useMutation({
    mutationFn: async ({ id, timetable_available }: { id: string; timetable_available: boolean }) => {
      const { error } = await supabase.from("universities").update({ timetable_available } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); },
  });

  const updateMessage = useMutation({
    mutationFn: async ({ id, timetable_message }: { id: string; timetable_message: string }) => {
      const { error } = await supabase.from("universities").update({ timetable_message: timetable_message || null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); toast({ title: "Message saved" }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Universities</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add University</DialogTitle></DialogHeader>
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addUni.mutate(Object.fromEntries(formData));
              setAddOpen(false);
            }}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required placeholder="University name" />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {universities.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "universities", id: u.id })}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {universities.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No universities yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TimetableSection({ universities }: { universities: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const toggleTimetable = useMutation({
    mutationFn: async ({ id, timetable_available }: { id: string; timetable_available: boolean }) => {
      const { error } = await supabase.from("universities").update({ timetable_available } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); },
  });

  const updateMessage = useMutation({
    mutationFn: async ({ id, timetable_message }: { id: string; timetable_message: string }) => {
      const { error } = await supabase.from("universities").update({ timetable_message: timetable_message || null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); toast({ title: "Message saved" }); },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Timetable Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure per-university whether students can select a study pattern during enrollment, or display a custom message instead.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>University</TableHead>
              <TableHead>Timetable Selectable</TableHead>
              <TableHead>Custom Message (when disabled)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {universities.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>
                  <Switch
                    checked={u.timetable_available !== false}
                    onCheckedChange={(checked) => toggleTimetable.mutate({ id: u.id, timetable_available: checked })}
                  />
                </TableCell>
                <TableCell>
                  {u.timetable_available === false ? (
                    <Input
                      defaultValue={u.timetable_message || ""}
                      placeholder="e.g. Studentul își alege programul după testul de admitere"
                      className="text-sm"
                      onBlur={(e) => {
                        if (e.target.value !== (u.timetable_message || "")) {
                          updateMessage.mutate({ id: u.id, timetable_message: e.target.value });
                        }
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {universities.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No universities yet. Add universities first.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("*").order("name");
      return data || [];
    },
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ["all-campuses"],
    queryFn: async () => {
      const { data } = await supabase.from("campuses").select("*, universities(name)").order("name");
      return data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*, universities(name)").order("name");
      return data || [];
    },
  });

  const { data: intakes = [] } = useQuery({
    queryKey: ["all-intakes"],
    queryFn: async () => {
      const { data } = await supabase.from("intakes").select("*, universities(name)").order("start_date");
      return data || [];
    },
  });

  const addUni = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("universities").insert({ name: d.name });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); toast({ title: "University added" }); },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      // For universities, delete related data first
      if (table === "universities") {
        await supabase.from("intakes").delete().eq("university_id", id);
        await supabase.from("courses").delete().eq("university_id", id);
        await supabase.from("campuses").delete().eq("university_id", id);
      }
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast({ title: "Deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error deleting", description: e.message, variant: "destructive" });
    },
  });

  const addCampus = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("campuses").insert({ name: d.name, city: d.city || null, university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-campuses"] }); toast({ title: "Campus added" }); },
  });

  const addCourse = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("courses").insert({ name: d.name, study_mode: d.study_mode || "blended", level: d.level || "undergraduate", university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-courses"] }); toast({ title: "Course added" }); },
  });

  const addIntake = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("intakes").insert({ label: d.label, start_date: d.start_date, application_deadline: d.application_deadline || null, university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-intakes"] }); toast({ title: "Intake added" }); },
  });

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>

        <Tabs defaultValue="universities">
          <TabsList>
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="campuses">Campuses</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="intakes">Intakes</TabsTrigger>
            <TabsTrigger value="commissions">Commission Tiers</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="brand">Brand / AI</TabsTrigger>
          </TabsList>

          <TabsContent value="universities" className="mt-4">
            <UniversitiesSection universities={universities} addUni={addUni} deleteItem={deleteItem} />
          </TabsContent>

          <TabsContent value="campuses" className="mt-4">
            <CrudSection
              title="Campuses"
              items={campuses}
              columns={["Name", "City", "University"]}
              renderRow={(c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell>{(c as any).universities?.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "campuses", id: c.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              onAdd={(d) => addCampus.mutate(d)}
              addFields={
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm">
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input name="name" required placeholder="Campus name" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input name="city" placeholder="City (optional)" />
                  </div>
                </>
              }
            />
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <CrudSection
              title="Courses"
              items={courses}
              columns={["Name", "Level", "Mode", "University"]}
              renderRow={(c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.level}</TableCell>
                  <TableCell className="capitalize">{c.study_mode}</TableCell>
                  <TableCell>{(c as any).universities?.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "courses", id: c.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              onAdd={(d) => addCourse.mutate(d)}
              addFields={
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm">
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course Name</Label>
                    <Input name="name" required placeholder="Course name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Input name="level" placeholder="e.g. undergraduate" defaultValue="undergraduate" />
                  </div>
                  <div className="space-y-2">
                    <Label>Study Mode</Label>
                    <Input name="study_mode" placeholder="e.g. blended" defaultValue="blended" />
                  </div>
                </>
              }
            />
          </TabsContent>

          <TabsContent value="intakes" className="mt-4">
            <CrudSection
              title="Intakes"
              items={intakes}
              columns={["Label", "Start Date", "Deadline", "University"]}
              renderRow={(i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.label}</TableCell>
                  <TableCell>{i.start_date}</TableCell>
                  <TableCell>{i.application_deadline || "—"}</TableCell>
                  <TableCell>{(i as any).universities?.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "intakes", id: i.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              onAdd={(d) => addIntake.mutate(d)}
              addFields={
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm">
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input name="label" required placeholder="e.g. January 2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input name="start_date" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Deadline</Label>
                    <Input name="application_deadline" type="date" />
                  </div>
                </>
              }
            />
          </TabsContent>

          <TabsContent value="commissions" className="mt-4">
            <CommissionTiersSection deleteItem={deleteItem} />
          </TabsContent>

          <TabsContent value="promotions" className="mt-4">
            <PromotionsSection deleteItem={deleteItem} />
          </TabsContent>

          <TabsContent value="brand" className="mt-4">
            <BrandSettingsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
