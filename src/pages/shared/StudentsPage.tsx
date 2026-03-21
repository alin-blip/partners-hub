import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;
const IMMIGRATION_OPTIONS = ["All", "Pre-settled", "Settled", "British Citizen", "Visa Holder", "Refugee", "Other"];

export default function StudentsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";
  const [search, setSearch] = useState("");
  const [immigrationFilter, setImmigrationFilter] = useState("All");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["all-students", search, immigrationFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("id, first_name, last_name, email, phone, immigration_status, created_at", { count: "exact" });

      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      if (immigrationFilter !== "All") {
        query = query.eq("immigration_status", immigrationFilter);
      }

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return { students: data || [], total: count || 0 };
    },
  });

  const students = data?.students || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExport = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Immigration Status", "Created"];
    const rows = students.map((s: any) => [
      s.first_name, s.last_name, s.email || "", s.phone || "", s.immigration_status || "",
      format(new Date(s.created_at), "yyyy-MM-dd"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          {role === "owner" && (
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
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={immigrationFilter} onValueChange={(v) => { setImmigrationFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Immigration" />
            </SelectTrigger>
            <SelectContent>
              {IMMIGRATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Immigration</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s: any) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`${prefix}/students/${s.id}`)}
                >
                  <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell>{s.immigration_status || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(s.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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
