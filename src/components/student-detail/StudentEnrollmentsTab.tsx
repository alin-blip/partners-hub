import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { notifyAgentOfStatusChange } from "@/lib/enrollment-emails";

const STATUSES = [
  "applied", "documents_pending", "documents_submitted", "processing",
  "offer_received", "accepted", "funding", "enrolled", "active", "rejected", "withdrawn",
];

interface Props {
  studentId: string;
  canChangeStatus: boolean;
}

export function StudentEnrollmentsTab({ studentId, canChangeStatus }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile-name"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, created_at, funding_status, funding_type, funding_reference, funding_notes, universities!inner(name), courses!inner(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, oldStatus }: { id: string; status: string; oldStatus: string }) => {
      const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
      if (error) throw error;
      return { id, status, oldStatus };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["student-enrollments", studentId] });
      toast({ title: "Status updated" });
      notifyAgentOfStatusChange(result.id, result.status, result.oldStatus, profile?.full_name);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Enrollment History</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>University</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.universities?.name}</TableCell>
                <TableCell>{e.courses?.name}</TableCell>
                <TableCell>
                  {canChangeStatus ? (
                    <Select value={e.status} onValueChange={(v) => updateStatus.mutate({ id: e.id, status: v, oldStatus: e.status })}>
                      <SelectTrigger className="w-[180px] h-8">
                        <StatusBadge status={e.status} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={e.status} />
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(e.created_at), "dd MMM yyyy")}</TableCell>
              </TableRow>
            ))}
            {enrollments.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No enrollments</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
