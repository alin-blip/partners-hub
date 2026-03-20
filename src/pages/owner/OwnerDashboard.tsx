import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, UserCheck, ClipboardList, PoundSterling } from "lucide-react";
import { calcCommission } from "@/lib/commissions";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function OwnerDashboard() {
  const { data: students = [] } = useQuery({
    queryKey: ["owner-students"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id");
      return data || [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["owner-agents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["owner-enrollments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select(`
          id, status, created_at,
          students!inner(first_name, last_name, agent_id),
          universities!inner(name),
          courses!inner(name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["owner-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data || [];
    },
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_tiers").select("*").order("min_students");
      return data || [];
    },
  });

  const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
  const activeAgents = agents.filter((a: any) => roleMap.get(a.id) === "agent" && a.is_active);
  const pipelineCount = enrollments.filter((e: any) => !["active", "rejected"].includes(e.status)).length;

  // Calculate real revenue from commission tiers
  const agentStudentCounts = new Map<string, number>();
  for (const e of enrollments) {
    const agentId = (e as any).students?.agent_id;
    if (agentId && e.status === "active") {
      agentStudentCounts.set(agentId, (agentStudentCounts.get(agentId) || 0) + 1);
    }
  }
  const totalRevenue = activeAgents.reduce((sum: number, agent: any) => {
    const count = agentStudentCounts.get(agent.id) || 0;
    const { amount } = calcCommission(count, tiers);
    return sum + amount;
  }, 0);

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Students" value={students.length} icon={Users} />
          <MetricCard title="Active Agents" value={activeAgents.length} icon={UserCheck} />
          <MetricCard title="In Pipeline" value={pipelineCount} icon={ClipboardList} />
          <MetricCard
            title="Est. Revenue"
            value={`£${(activeAgents.length * 500).toLocaleString()}`}
            icon={PoundSterling}
            description="Based on current tier"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Users</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{agent.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {(roleMap.get(agent.id) as string) || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.is_active ? "default" : "destructive"} className="text-xs">
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
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
                    <TableCell className="font-medium">
                      {e.students?.first_name} {e.students?.last_name}
                    </TableCell>
                    <TableCell>{e.universities?.name}</TableCell>
                    <TableCell>{e.courses?.name}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
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
      </div>
    </DashboardLayout>
  );
}
