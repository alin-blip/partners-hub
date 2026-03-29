import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notifyAgentOfStatusChange } from "@/lib/enrollment-emails";

const STATUSES = [
  "applied", "documents_pending", "documents_submitted", "processing",
  "offer_received", "accepted", "funding", "enrolled", "active", "rejected", "withdrawn",
];
const PAGE_SIZE = 20;

export default function EnrollmentsPage() {
  const { role, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canEdit = role === "owner" || role === "admin";
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-name"],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["enrollments-list", search, statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("enrollments")
        .select(`
          id, status, created_at, updated_at, notes,
          students!inner(first_name, last_name),
          universities!inner(name),
          courses!inner(name)
        `, { count: "exact" });

      if (search.trim()) {
        query = query.or(`students.first_name.ilike.%${search}%,students.last_name.ilike.%${search}%`, { referencedTable: "students" });
      }
      if (statusFilter !== "All") {
        query = query.eq("status", statusFilter);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return { enrollments: data || [], total: count || 0 };
    },
  });

  const enrollments = data?.enrollments || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, oldStatus }: { id: string; status: string; oldStatus: string }) => {
      const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
      if (error) throw error;
      return { id, status, oldStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments-list"] });
      toast({ title: "Status updated" });
      notifyAgentOfStatusChange(result.id, result.status, result.oldStatus, profile?.full_name);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    const headers = ["Student", "University", "Course", "Status", "Date"];
    const rows = enrollments.map((e: any) => [
      `${e.students?.first_name} ${e.students?.last_name}`,
      e.universities?.name || "",
      e.courses?.name || "",
      e.status,
      format(new Date(e.created_at), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enrollments_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
          {(role === "owner" || role === "admin") && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}><StatusBadge status={s} /></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

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
                        onValueChange={(v) => updateStatus.mutate({ id: e.id, status: v, oldStatus: e.status })}
                      >
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
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(e.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {enrollments.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No enrollments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
