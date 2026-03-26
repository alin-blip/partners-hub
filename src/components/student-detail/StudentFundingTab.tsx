import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useState } from "react";

const FUNDING_STATUSES = ["not_started", "application_submitted", "approved", "rejected", "disbursed"];
const FUNDING_TYPES = ["SFE (Student Finance England)", "SFW (Student Finance Wales)", "SAAS", "Student Finance NI", "Bursary", "Scholarship", "Self-funded", "Employer Sponsored", "Other"];

interface Props {
  studentId: string;
  canEdit: boolean;
}

export function StudentFundingTab({ studentId, canEdit }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments-funding", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, funding_status, funding_type, funding_reference, funding_notes, universities!inner(name), courses!inner(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateFunding = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("enrollments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-enrollments-funding", studentId] });
      setEditingId(null);
      toast({ title: "Funding updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditData({
      funding_status: e.funding_status || "not_started",
      funding_type: e.funding_type || "",
      funding_reference: e.funding_reference || "",
      funding_notes: e.funding_notes || "",
    });
  };

  return (
    <div className="space-y-4">
      {enrollments.length === 0 ? (
        <Card><CardContent className="py-6"><p className="text-sm text-muted-foreground text-center">No enrollments to track funding for</p></CardContent></Card>
      ) : (
        enrollments.map((e: any) => (
          <Card key={e.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{e.universities?.name} — {e.courses?.name}</span>
                <StatusBadge status={e.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingId === e.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Funding Status</Label>
                      <Select value={editData.funding_status} onValueChange={(v) => setEditData({ ...editData, funding_status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{FUNDING_STATUSES.map((s) => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Funding Type</Label>
                      <Select value={editData.funding_type} onValueChange={(v) => setEditData({ ...editData, funding_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{FUNDING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Number</Label>
                    <Input value={editData.funding_reference} onChange={(e) => setEditData({ ...editData, funding_reference: e.target.value })} placeholder="e.g. SFE reference" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={editData.funding_notes} onChange={(e) => setEditData({ ...editData, funding_notes: e.target.value })} placeholder="Funding notes..." />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateFunding.mutate({ id: e.id, ...editData })} disabled={updateFunding.isPending}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Funding Status</p>
                    <StatusBadge status={e.funding_status || "not_started"} />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Type</p>
                    <p className="font-medium">{e.funding_type || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Reference</p>
                    <p className="font-medium">{e.funding_reference || "—"}</p>
                  </div>
                  <div>
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(e)} className="mt-3">Edit Funding</Button>
                    )}
                  </div>
                  {e.funding_notes && (
                    <div className="col-span-full">
                      <p className="text-muted-foreground text-xs mb-0.5">Notes</p>
                      <p className="font-medium whitespace-pre-wrap">{e.funding_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
