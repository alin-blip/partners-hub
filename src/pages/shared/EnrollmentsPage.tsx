import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  "applied", "documents_submitted", "processing", "accepted", "enrolled", "active", "rejected",
];

export default function EnrollmentsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = role === "owner" || role === "admin";

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select(`
          id, status, created_at, updated_at, notes,
          students!inner(first_name, last_name),
          universities!inner(name),
          courses!inner(name)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments-list"] });
      toast({ title: "Status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>University</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.students?.first_name} {e.students?.last_name}</TableCell>
                  <TableCell>{e.universities?.name}</TableCell>
                  <TableCell>{e.courses?.name}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={e.status}
                        onValueChange={(v) => updateStatus.mutate({ id: e.id, status: v })}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <StatusBadge status={e.status} />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <StatusBadge status={s} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusBadge status={e.status} />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(e.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No enrollments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
