import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, UserCheck, ClipboardList } from "lucide-react";
import { PromoBanner } from "@/components/PromoBanner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CommissionOfferCards } from "@/components/CommissionOfferCards";
import { DashboardSearchCard } from "@/components/DashboardSearchCard";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: agents = [] } = useQuery({
    queryKey: ["admin-agents", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active")
        .eq("admin_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: students = [] } = useQuery({
    queryKey: ["admin-students", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, first_name, last_name, agent_id");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["admin-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select(`id, status, created_at, students!inner(first_name, last_name), universities!inner(name), courses!inner(name)`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <div className="space-y-6">
        <PromoBanner />
        <CommissionOfferCards />
        <DashboardSearchCard />
        <h1 className="text-2xl font-bold tracking-tight">Team Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="My Agents" value={agents.length} icon={UserCheck} />
          <MetricCard title="Team Students" value={students.length} icon={Users} />
          <MetricCard title="Team Enrollments" value={enrollments.length} icon={ClipboardList} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Agents</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${a.is_active ? "text-green-600" : "text-red-500"}`}>
                        {a.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {agents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No agents assigned to you yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Enrollments</h2>
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
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(e.created_at), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                ))}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No enrollments yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
