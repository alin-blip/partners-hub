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
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast({ title: "Deleted" });
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
          </TabsList>

          <TabsContent value="universities" className="mt-4">
            <CrudSection
              title="Universities"
              items={universities}
              columns={["Name", "Active"]}
              renderRow={(u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ table: "universities", id: u.id })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              onAdd={(d) => addUni.mutate(d)}
              addFields={
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" required placeholder="University name" />
                </div>
              }
            />
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
