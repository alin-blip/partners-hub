import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, ClipboardList, Trophy, PoundSterling } from "lucide-react";
import { calcCommission } from "@/lib/commissions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: students = [] } = useQuery({
    queryKey: ["agent-students", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, email, created_at")
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["agent-enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select(`id, status, created_at, students!inner(first_name, last_name), universities!inner(name), courses!inner(name)`)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_tiers").select("*").order("min_students");
      return data || [];
    },
  });

  const activeEnrollments = enrollments.filter((e: any) => e.status === "active").length;
  const { tier: currentTier, amount: commissionAmount } = calcCommission(activeEnrollments, tiers);
  const monthlyTarget = 10;
  const thisMonthStudents = students.filter((s: any) => {
    const d = new Date(s.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <DashboardLayout allowedRoles={["agent"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98] transition-all"
            onClick={() => navigate("/agent/enroll")}
          >
            + New Student Enrollment
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="My Students" value={students.length} icon={Users} />
          <MetricCard title="Active Enrollments" value={activeEnrollments} icon={ClipboardList} />
          <MetricCard title="Commission Tier" value={currentTier?.tier_name || "—"} icon={Trophy} description={`£${commissionAmount.toLocaleString()} earned`} />
        </div>

        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Target</span>
            <span className="text-sm text-muted-foreground">{thisMonthStudents}/{monthlyTarget} students</span>
          </div>
          <Progress value={(thisMonthStudents / monthlyTarget) * 100} className="h-2" />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">My Enrollments</h2>
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No enrollments yet. Start by enrolling your first student!
                    </TableCell>
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
