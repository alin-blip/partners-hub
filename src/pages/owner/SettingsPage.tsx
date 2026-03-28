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
import { Plus, Trash2, Upload, Loader2, Palette, Calendar, FileUp, Pencil } from "lucide-react";
import { DocumentProcessorDialog } from "@/components/DocumentProcessorDialog";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

/* ──────────────────────────────────────────────────────── */
/*  Generic CRUD Section with Add + Edit + Delete          */
/* ──────────────────────────────────────────────────────── */

function CrudSection({
  title,
  items,
  columns,
  renderRow,
  onAdd,
  addFields,
  editFields,
  onEdit,
}: {
  title: string;
  items: any[];
  columns: string[];
  renderRow: (item: any, onEditClick: (item: any) => void) => React.ReactNode;
  onAdd: (data: any) => void;
  addFields: React.ReactNode;
  editFields?: (item: any) => React.ReactNode;
  onEdit?: (data: any) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                onAdd(Object.fromEntries(formData));
                setAddOpen(false);
              }}
            >
              {addFields}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
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
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => renderRow(item, handleEditClick))}
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

      {/* Edit Dialog */}
      {onEdit && editFields && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            {editingItem && (
              <form
                className="space-y-4 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  onEdit({ id: editingItem.id, ...Object.fromEntries(formData) });
                  setEditOpen(false);
                }}
              >
                {editFields(editingItem)}
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Commission Tiers                                       */
/* ──────────────────────────────────────────────────────── */

function CommissionTiersSection({ deleteItem }: { deleteItem: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-tiers"] }); toast({ title: "Tier added" }); },
  });

  const updateTier = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("commission_tiers").update({
        tier_name: d.tier_name,
        min_students: Number(d.min_students),
        max_students: d.max_students ? Number(d.max_students) : null,
        commission_per_student: Number(d.commission_per_student),
      }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commission-tiers"] }); toast({ title: "Tier updated" }); },
  });

  const tierFormFields = (defaults?: any) => (
    <>
      <div className="space-y-2">
        <Label>Tier Name</Label>
        <Input name="tier_name" required placeholder="e.g. Bronze" defaultValue={defaults?.tier_name || ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Min Students</Label>
          <Input name="min_students" type="number" required min={0} defaultValue={defaults?.min_students ?? 0} />
        </div>
        <div className="space-y-2">
          <Label>Max Students</Label>
          <Input name="max_students" type="number" placeholder="∞" defaultValue={defaults?.max_students ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Commission per Student (£)</Label>
        <Input name="commission_per_student" type="number" required min={0} step="0.01" defaultValue={defaults?.commission_per_student ?? 500} />
      </div>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Commission Tiers</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Commission Tier</DialogTitle></DialogHeader>
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              addTier.mutate(Object.fromEntries(new FormData(e.currentTarget)));
              setAddOpen(false);
            }}>
              {tierFormFields()}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
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
              <TableHead className="w-24" />
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingTier(t); setEditOpen(true); }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "commission_tiers", id: t.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No tiers yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Commission Tier</DialogTitle></DialogHeader>
          {editingTier && (
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              updateTier.mutate({ id: editingTier.id, ...Object.fromEntries(new FormData(e.currentTarget)) });
              setEditOpen(false);
            }}>
              {tierFormFields(editingTier)}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Brand Settings (already editable, no changes needed)   */
/* ──────────────────────────────────────────────────────── */

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["brand-settings"] }); toast({ title: "Brand settings saved" }); },
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
                <p className="text-xs text-muted-foreground">PNG with transparent background recommended, min 200×200px</p>
              </div>
            </div>
          </div>

          <Button onClick={() => saveBrand.mutate()} disabled={saveBrand.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {saveBrand.isPending ? "Saving…" : "Save Brand Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Promotions                                             */
/* ──────────────────────────────────────────────────────── */

function PromotionsSection({ deleteItem }: { deleteItem: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

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
        target_role: d.target_role || "agent",
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

  const updatePromo = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await (supabase.from("promotions" as any) as any).update({
        title: d.title,
        description: d.description || null,
        deadline: d.deadline,
        bonus_amount: Number(d.bonus_amount),
        bonus_percentage: d.bonus_percentage ? Number(d.bonus_percentage) : null,
        target_students: Number(d.target_students),
        target_role: d.target_role || "agent",
      }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotions-settings"] });
      qc.invalidateQueries({ queryKey: ["active-promotions"] });
      toast({ title: "Promotion updated" });
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

  const promoFormFields = (defaults?: any) => (
    <>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input name="title" required placeholder="e.g. Spring Bonus Campaign" defaultValue={defaults?.title || ""} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input name="description" placeholder="Recruteaza si obtine 5 studenti admisi..." defaultValue={defaults?.description || ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Target Students</Label>
          <Input name="target_students" type="number" required min={1} defaultValue={defaults?.target_students ?? 5} />
        </div>
        <div className="space-y-2">
          <Label>Bonus Amount (£)</Label>
          <Input name="bonus_amount" type="number" required min={0} step="0.01" defaultValue={defaults?.bonus_amount ?? 500} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Bonus % Commission</Label>
          <Input name="bonus_percentage" type="number" min={0} max={100} placeholder="e.g. 25" defaultValue={defaults?.bonus_percentage ?? 25} />
        </div>
        <div className="space-y-2">
          <Label>Deadline</Label>
          <Input name="deadline" type="datetime-local" required defaultValue={defaults?.deadline ? defaults.deadline.slice(0, 16) : ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Target Role</Label>
        <select name="target_role" className="w-full h-10 rounded-md border px-3 text-sm" defaultValue={defaults?.target_role || "agent"}>
          <option value="agent">Agent (individual)</option>
          <option value="admin">Admin (echipă)</option>
        </select>
      </div>
    </>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Promotions</CardTitle>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Promotion</DialogTitle></DialogHeader>
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              addPromo.mutate(Object.fromEntries(new FormData(e.currentTarget)));
              setAddOpen(false);
            }}>
              {promoFormFields()}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Bonus</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell className="capitalize">{p.target_role || "agent"}</TableCell>
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingPromo(p); setEditOpen(true); }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "promotions", id: p.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {promotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">No promotions yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Promotion</DialogTitle></DialogHeader>
          {editingPromo && (
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              updatePromo.mutate({ id: editingPromo.id, ...Object.fromEntries(new FormData(e.currentTarget)) });
              setEditOpen(false);
            }}>
              {promoFormFields(editingPromo)}
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Universities                                           */
/* ──────────────────────────────────────────────────────── */

function UniversitiesSection({ universities, addUni, deleteItem, updateUni }: { universities: any[]; addUni: any; deleteItem: any; updateUni: any }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<any>(null);

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
              addUni.mutate(Object.fromEntries(new FormData(e.currentTarget)));
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
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {universities.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>
                  <Switch
                    checked={u.is_active}
                    onCheckedChange={(checked) => updateUni.mutate({ id: u.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingUni(u); setEditOpen(true); }}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "universities", id: u.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit University</DialogTitle></DialogHeader>
          {editingUni && (
            <form className="space-y-4 pt-2" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              updateUni.mutate({ id: editingUni.id, name: fd.get("name") });
              setEditOpen(false);
            }}>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required defaultValue={editingUni.name} />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Timetable Section (unchanged)                          */
/* ──────────────────────────────────────────────────────── */

function TimetableSection({ universities }: { universities: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newOption, setNewOption] = useState<{ uniId: string; label: string; courseIds: string[]; campusIds: string[] }>({ uniId: "", label: "", courseIds: [], campusIds: [] });

  const { data: timetableOptions = [] } = useQuery({
    queryKey: ["timetable-options"],
    queryFn: async () => {
      const { data } = await supabase.from("timetable_options" as any).select("*").order("label");
      return (data || []) as any[];
    },
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ["timetable-courses", newOption.uniId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, name").eq("university_id", newOption.uniId).order("name");
      return data || [];
    },
    enabled: !!newOption.uniId,
  });

  const { data: allCampuses = [] } = useQuery({
    queryKey: ["timetable-campuses", newOption.uniId],
    queryFn: async () => {
      const { data } = await supabase.from("campuses").select("id, name").eq("university_id", newOption.uniId).order("name");
      return data || [];
    },
    enabled: !!newOption.uniId,
  });

  const { data: courseGroups = [] } = useQuery({
    queryKey: ["course-timetable-groups"],
    queryFn: async () => {
      const { data } = await supabase.from("course_timetable_groups" as any).select("*");
      return (data || []) as any[];
    },
  });

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

  const addOption = useMutation({
    mutationFn: async ({ university_id, label, courseIds, campusIds }: { university_id: string; label: string; courseIds: string[]; campusIds: string[] }) => {
      // Insert timetable option
      const { data: inserted, error } = await (supabase.from("timetable_options" as any) as any).insert({ university_id, label }).select("id").single();
      if (error) throw error;
      const optionId = inserted.id;

      // Create course_timetable_groups for each course × campus combination
      if (courseIds.length > 0 && campusIds.length > 0) {
        const rows = courseIds.flatMap(courseId =>
          campusIds.map(campusId => ({
            course_id: courseId,
            campus_id: campusId,
            timetable_option_id: optionId,
            university_id,
          }))
        );
        const { error: ctgError } = await (supabase.from("course_timetable_groups" as any) as any).insert(rows);
        if (ctgError) throw ctgError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable-options"] });
      qc.invalidateQueries({ queryKey: ["course-timetable-groups"] });
      setNewOption({ uniId: "", label: "", courseIds: [], campusIds: [] });
      toast({ title: "Timetable option added with course mappings" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      // Delete course_timetable_groups first
      await (supabase.from("course_timetable_groups" as any) as any).delete().eq("timetable_option_id", id);
      const { error } = await (supabase.from("timetable_options" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timetable-options"] });
      qc.invalidateQueries({ queryKey: ["course-timetable-groups"] });
      toast({ title: "Option removed" });
    },
  });

  const toggleCourse = (courseId: string) => {
    setNewOption(p => ({
      ...p,
      courseIds: p.courseIds.includes(courseId)
        ? p.courseIds.filter(id => id !== courseId)
        : [...p.courseIds, courseId],
    }));
  };

  const toggleCampus = (campusId: string) => {
    setNewOption(p => ({
      ...p,
      campusIds: p.campusIds.includes(campusId)
        ? p.campusIds.filter(id => id !== campusId)
        : [...p.campusIds, campusId],
    }));
  };

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Available Timetable Options
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add study patterns per university. Select which courses and campuses each option applies to.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">University</Label>
                <select
                  className="w-full h-10 rounded-md border px-3 text-sm bg-background"
                  value={newOption.uniId}
                  onChange={(e) => setNewOption({ uniId: e.target.value, label: "", courseIds: [], campusIds: [] })}
                >
                  <option value="">Select university…</option>
                  {universities.filter((u: any) => u.timetable_available !== false).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Program Label</Label>
                <Input
                  value={newOption.label}
                  onChange={(e) => setNewOption((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Group A – Mon & Tue 09:45-14:45"
                />
              </div>
            </div>

            {newOption.uniId && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Campuses (select where this option is available)</Label>
                  <div className="flex flex-wrap gap-2">
                    {allCampuses.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCampus(c.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          newOption.campusIds.includes(c.id)
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-background text-muted-foreground border-border hover:border-accent/50"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                    {allCampuses.length === 0 && <span className="text-xs text-muted-foreground">No campuses for this university</span>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Courses (select which courses use this timetable option)</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {allCourses.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCourse(c.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          newOption.courseIds.includes(c.id)
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-background text-muted-foreground border-border hover:border-accent/50"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                    {allCourses.length === 0 && <span className="text-xs text-muted-foreground">No courses for this university</span>}
                  </div>
                </div>
              </>
            )}

            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={!newOption.uniId || !newOption.label.trim()}
              onClick={() => addOption.mutate({
                university_id: newOption.uniId,
                label: newOption.label.trim(),
                courseIds: newOption.courseIds,
                campusIds: newOption.campusIds,
              })}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Option
            </Button>
          </div>

          {universities.filter((u: any) => u.timetable_available !== false).map((u: any) => {
            const opts = timetableOptions.filter((o: any) => o.university_id === u.id);
            if (opts.length === 0) return null;
            return (
              <div key={u.id} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">{u.name}</h4>
                <div className="space-y-1">
                  {opts.map((o: any) => {
                    const mappings = courseGroups.filter((g: any) => g.timetable_option_id === o.id);
                    const mappedCourseCount = new Set(mappings.map((m: any) => m.course_id)).size;
                    const mappedCampusCount = new Set(mappings.map((m: any) => m.campus_id)).size;
                    return (
                      <div key={o.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{o.label}</span>
                        {mappings.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({mappedCourseCount} courses × {mappedCampusCount} campuses)
                          </span>
                        )}
                        <button
                          className="ml-auto text-destructive hover:text-destructive/80"
                          onClick={() => deleteOption.mutate(o.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {universities.filter((u: any) => u.timetable_available !== false).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Enable timetable for at least one university above first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Course Details Section                                 */
/* ──────────────────────────────────────────────────────── */

function CourseDetailsSection({ universities, courses }: { universities: any[]; courses: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filterUni, setFilterUni] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: courseDetails = [] } = useQuery({
    queryKey: ["course-details-all"],
    queryFn: async () => {
      const { data } = await supabase.from("course_details" as any).select("*, courses(name, university_id, universities(name))") as any;
      return (data || []) as any[];
    },
  });

  const filteredCourses = filterUni ? courses.filter((c: any) => c.university_id === filterUni) : courses;
  const filteredDetails = filterUni
    ? courseDetails.filter((d: any) => d.courses?.university_id === filterUni)
    : courseDetails;

  const coursesWithoutDetails = filteredCourses.filter(
    (c: any) => !courseDetails.some((d: any) => d.course_id === c.id)
  );

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("course_details" as any).upsert({
        course_id: data.course_id,
        personal_statement_guidelines: data.personal_statement_guidelines || null,
        admission_test_info: data.admission_test_info || null,
        interview_info: data.interview_info || null,
        entry_requirements: data.entry_requirements || null,
        documents_required: data.documents_required || null,
        additional_info: data.additional_info || null,
      }, { onConflict: "course_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-details-all"] });
      qc.invalidateQueries({ queryKey: ["course-details"] });
      toast({ title: "Course details saved" });
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_details" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-details-all"] });
      qc.invalidateQueries({ queryKey: ["course-details"] });
      toast({ title: "Course details deleted" });
    },
  });

  const FIELDS = [
    { key: "personal_statement_guidelines", label: "Personal Statement Guidelines" },
    { key: "admission_test_info", label: "Admission Test Info" },
    { key: "interview_info", label: "Interview Info" },
    { key: "entry_requirements", label: "Entry Requirements" },
    { key: "documents_required", label: "Documents Required" },
    { key: "additional_info", label: "Additional Info" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Course Details & Requirements</CardTitle>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={filterUni}
            onChange={(e) => setFilterUni(e.target.value)}
          >
            <option value="">All Universities</option>
            {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add for a course */}
        {coursesWithoutDetails.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border px-3 text-sm flex-1"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setEditingId("new");
                  setEditData({ course_id: e.target.value });
                }
              }}
            >
              <option value="">+ Add details for a course…</option>
              {coursesWithoutDetails.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} — {(c as any).universities?.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Edit form */}
        {editingId && (
          <Card className="border-accent/40">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-medium">
                {editingId === "new"
                  ? courses.find((c: any) => c.id === editData.course_id)?.name
                  : courseDetails.find((d: any) => d.id === editingId)?.courses?.name}
              </p>
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Textarea
                    className="text-sm min-h-[60px]"
                    value={editData[key] || ""}
                    onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                    placeholder={label}
                  />
                </div>
              ))}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => saveMutation.mutate(editData)}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {filteredDetails.length === 0 && !editingId && (
          <p className="text-sm text-muted-foreground text-center py-4">No course details yet. Upload a document or add manually above.</p>
        )}
        {filteredDetails.map((d: any) => (
          <Card key={d.id} className="border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{d.courses?.name} <span className="text-muted-foreground font-normal">— {d.courses?.universities?.name}</span></p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingId(d.id);
                    setEditData({
                      course_id: d.course_id,
                      personal_statement_guidelines: d.personal_statement_guidelines || "",
                      admission_test_info: d.admission_test_info || "",
                      interview_info: d.interview_info || "",
                      entry_requirements: d.entry_requirements || "",
                      documents_required: d.documents_required || "",
                      additional_info: d.additional_info || "",
                    });
                  }}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                {FIELDS.map(({ key, label }) => d[key] && (
                  <p key={key}><span className="font-medium text-foreground">{label}:</span> {d[key]}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Main Page                                              */
/* ──────────────────────────────────────────────────────── */

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

  const updateUni = useMutation({
    mutationFn: async (d: any) => {
      const updates: any = {};
      if (d.name !== undefined) updates.name = d.name;
      if (d.is_active !== undefined) updates.is_active = d.is_active;
      const { error } = await supabase.from("universities").update(updates).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["universities"] }); toast({ title: "University updated" }); },
  });

  const deleteItem = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      if (table === "universities") {
        await supabase.from("intakes").delete().eq("university_id", id);
        await supabase.from("courses").delete().eq("university_id", id);
        await supabase.from("campuses").delete().eq("university_id", id);
      }
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error deleting", description: e.message, variant: "destructive" }),
  });

  const addCampus = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("campuses").insert({ name: d.name, city: d.city || null, university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-campuses"] }); toast({ title: "Campus added" }); },
  });

  const updateCampus = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("campuses").update({ name: d.name, city: d.city || null, university_id: d.university_id }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-campuses"] }); toast({ title: "Campus updated" }); },
  });

  const addCourse = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("courses").insert({ name: d.name, study_mode: d.study_mode || "blended", level: d.level || "undergraduate", university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-courses"] }); toast({ title: "Course added" }); },
  });

  const updateCourse = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("courses").update({ name: d.name, study_mode: d.study_mode || "blended", level: d.level || "undergraduate", university_id: d.university_id }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-courses"] }); toast({ title: "Course updated" }); },
  });

  const addIntake = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("intakes").insert({ label: d.label, start_date: d.start_date, application_deadline: d.application_deadline || null, university_id: d.university_id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-intakes"] }); toast({ title: "Intake added" }); },
  });

  const updateIntake = useMutation({
    mutationFn: async (d: any) => {
      const { error } = await supabase.from("intakes").update({ label: d.label, start_date: d.start_date, application_deadline: d.application_deadline || null, university_id: d.university_id }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-intakes"] }); toast({ title: "Intake updated" }); },
  });

  const [importOpen, setImportOpen] = useState(false);

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <Button onClick={() => setImportOpen(true)} variant="outline">
            <FileUp className="h-4 w-4 mr-2" /> Import from Document
          </Button>
        </div>

        <DocumentProcessorDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          universities={universities}
        />

        <Tabs defaultValue="universities">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="universities">Universities</TabsTrigger>
            <TabsTrigger value="campuses">Campuses</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="intakes">Intakes</TabsTrigger>
            <TabsTrigger value="course-details">Course Details</TabsTrigger>
            <TabsTrigger value="commissions">Commission Tiers</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="brand">Brand / AI</TabsTrigger>
          </TabsList>

          <TabsContent value="universities" className="mt-4">
            <UniversitiesSection universities={universities} addUni={addUni} deleteItem={deleteItem} updateUni={updateUni} />
          </TabsContent>

          <TabsContent value="timetable" className="mt-4">
            <TimetableSection universities={universities} />
          </TabsContent>

          <TabsContent value="course-details" className="mt-4">
            <CourseDetailsSection universities={universities} courses={courses} />
          </TabsContent>

          <TabsContent value="campuses" className="mt-4">
            <CrudSection
              title="Campuses"
              items={campuses}
              columns={["Name", "City", "University"]}
              renderRow={(c, onEditClick) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                  <TableCell>{(c as any).universities?.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditClick(c)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "campuses", id: c.id })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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
              onEdit={(d) => updateCampus.mutate(d)}
              editFields={(item) => (
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm" defaultValue={item.university_id}>
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input name="name" required defaultValue={item.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input name="city" defaultValue={item.city || ""} />
                  </div>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="courses" className="mt-4">
            <CrudSection
              title="Courses"
              items={courses}
              columns={["Name", "Level", "Mode", "University"]}
              renderRow={(c, onEditClick) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.level}</TableCell>
                  <TableCell className="capitalize">{c.study_mode}</TableCell>
                  <TableCell>{(c as any).universities?.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditClick(c)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "courses", id: c.id })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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
              onEdit={(d) => updateCourse.mutate(d)}
              editFields={(item) => (
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm" defaultValue={item.university_id}>
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Course Name</Label>
                    <Input name="name" required defaultValue={item.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Input name="level" defaultValue={item.level} />
                  </div>
                  <div className="space-y-2">
                    <Label>Study Mode</Label>
                    <Input name="study_mode" defaultValue={item.study_mode} />
                  </div>
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="intakes" className="mt-4">
            <CrudSection
              title="Intakes"
              items={intakes}
              columns={["Label", "Start Date", "Deadline", "University"]}
              renderRow={(i, onEditClick) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.label}</TableCell>
                  <TableCell>{i.start_date}</TableCell>
                  <TableCell>{i.application_deadline || "—"}</TableCell>
                  <TableCell>{(i as any).universities?.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditClick(i)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "intakes", id: i.id })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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
              onEdit={(d) => updateIntake.mutate(d)}
              editFields={(item) => (
                <>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <select name="university_id" required className="w-full h-10 rounded-md border px-3 text-sm" defaultValue={item.university_id}>
                      <option value="">Select…</option>
                      {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input name="label" required defaultValue={item.label} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input name="start_date" type="date" required defaultValue={item.start_date} />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Deadline</Label>
                    <Input name="application_deadline" type="date" defaultValue={item.application_deadline || ""} />
                  </div>
                </>
              )}
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
