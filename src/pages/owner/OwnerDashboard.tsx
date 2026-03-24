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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ChartContainer, ChartTooltipContent, ChartConfig,
} from "@/components/ui/chart";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { PromoBanner } from "@/components/PromoBanner";

const chartConfig: ChartConfig = {
  students: { label: "Students", color: "hsl(var(--primary))" },
  enrollments: { label: "Enrollments", color: "hsl(var(--accent))" },
  commission: { label: "Commission (£)", color: "hsl(142 71% 45%)" },
};

export default function OwnerDashboard() {
  const [openAdmins, setOpenAdmins] = useState<Set<string>>(new Set());

  const { data: students = [] } = useQuery({
    queryKey: ["owner-students-all"],
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, agent_id");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["owner-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, admin_id, created_at")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ["owner-enrollments-recent"],
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

  const { data: allEnrollments = [] } = useQuery({
    queryKey: ["owner-enrollments-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, student_id");
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
  const admins = profiles.filter((p: any) => roleMap.get(p.id) === "admin");
  const agents = profiles.filter((p: any) => roleMap.get(p.id) === "agent");
  const activeAgents = agents.filter((a: any) => a.is_active);

  // Build student-to-agent map
  const studentAgentMap = new Map(students.map((s: any) => [s.id, s.agent_id]));

  // Count active enrollments per agent
  const agentActiveEnrollments = new Map<string, number>();
  const agentTotalEnrollments = new Map<string, number>();
  for (const e of allEnrollments) {
    const agentId = studentAgentMap.get((e as any).student_id);
    if (agentId) {
      agentTotalEnrollments.set(agentId, (agentTotalEnrollments.get(agentId) || 0) + 1);
      if (e.status === "active") {
        agentActiveEnrollments.set(agentId, (agentActiveEnrollments.get(agentId) || 0) + 1);
      }
    }
  }

  // Count students per agent
  const agentStudentCounts = new Map<string, number>();
  for (const s of students) {
    agentStudentCounts.set(s.agent_id, (agentStudentCounts.get(s.agent_id) || 0) + 1);
  }

  // Pipeline
  const pipelineCount = allEnrollments.filter((e: any) => !["active", "rejected"].includes(e.status)).length;

  // Total revenue
  const totalRevenue = activeAgents.reduce((sum: number, agent: any) => {
    const count = agentActiveEnrollments.get(agent.id) || 0;
    const { amount } = calcCommission(count, tiers);
    return sum + amount;
  }, 0);

  // Build hierarchical data: admins → agents
  const unassignedAgents = agents.filter((a: any) => !a.admin_id);

  const buildAgentData = (agentList: any[]) =>
    agentList.map((agent: any) => {
      const studentCount = agentStudentCounts.get(agent.id) || 0;
      const enrollmentCount = agentTotalEnrollments.get(agent.id) || 0;
      const activeCount = agentActiveEnrollments.get(agent.id) || 0;
      const { amount } = calcCommission(activeCount, tiers);
      return {
        name: agent.full_name || agent.email,
        students: studentCount,
        enrollments: enrollmentCount,
        commission: amount,
        isActive: agent.is_active,
      };
    });

  const adminChartData = admins.map((admin: any) => {
    const teamAgents = agents.filter((a: any) => a.admin_id === admin.id);
    const agentData = buildAgentData(teamAgents);
    const totalStudents = agentData.reduce((s, a) => s + a.students, 0);
    const totalEnrollments = agentData.reduce((s, a) => s + a.enrollments, 0);
    const totalCommission = agentData.reduce((s, a) => s + a.commission, 0);
    return {
      admin,
      agentData,
      totalStudents,
      totalEnrollments,
      totalCommission,
      agentCount: teamAgents.length,
    };
  });

  const toggleAdmin = (id: string) => {
    setOpenAdmins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Summary chart data for all admins
  const summaryChartData = adminChartData.map((a) => ({
    name: a.admin.full_name || a.admin.email,
    students: a.totalStudents,
    enrollments: a.totalEnrollments,
    commission: a.totalCommission,
  }));

  if (unassignedAgents.length > 0) {
    const unassignedData = buildAgentData(unassignedAgents);
    summaryChartData.push({
      name: "Unassigned",
      students: unassignedData.reduce((s, a) => s + a.students, 0),
      enrollments: unassignedData.reduce((s, a) => s + a.enrollments, 0),
      commission: unassignedData.reduce((s, a) => s + a.commission, 0),
    });
  }

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <PromoBanner />
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Students" value={students.length} icon={Users} />
          <MetricCard title="Active Agents" value={activeAgents.length} icon={UserCheck} />
          <MetricCard title="In Pipeline" value={pipelineCount} icon={ClipboardList} />
          <MetricCard
            title="Est. Revenue"
            value={`£${totalRevenue.toLocaleString()}`}
            icon={PoundSterling}
            description="Based on commission tiers"
          />
        </div>

        {/* Admin Performance Overview Chart */}
        {summaryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={summaryChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="students" fill="var(--color-students)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enrollments" fill="var(--color-enrollments)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commission" fill="var(--color-commission)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Hierarchical Admin → Agents breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Admin → Agent Hierarchy</h2>
          {adminChartData.map(({ admin, agentData, totalStudents, totalEnrollments, totalCommission, agentCount }) => (
            <Collapsible
              key={admin.id}
              open={openAdmins.has(admin.id)}
              onOpenChange={() => toggleAdmin(admin.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            openAdmins.has(admin.id) ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                        <div>
                          <CardTitle className="text-base">{admin.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold">{agentCount}</p>
                          <p className="text-muted-foreground text-xs">Agents</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{totalStudents}</p>
                          <p className="text-muted-foreground text-xs">Students</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{totalEnrollments}</p>
                          <p className="text-muted-foreground text-xs">Enrollments</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-green-600">£{totalCommission.toLocaleString()}</p>
                          <p className="text-muted-foreground text-xs">Commission</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {agentData.length > 0 ? (
                      <>
                        <ChartContainer config={chartConfig} className="h-[200px] w-full">
                          <BarChart data={agentData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="students" fill="var(--color-students)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="enrollments" fill="var(--color-enrollments)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="commission" fill="var(--color-commission)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Agent</TableHead>
                              <TableHead className="text-right">Students</TableHead>
                              <TableHead className="text-right">Enrollments</TableHead>
                              <TableHead className="text-right">Commission</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agentData.map((a) => (
                              <TableRow key={a.name}>
                                <TableCell className="font-medium">{a.name}</TableCell>
                                <TableCell className="text-right">{a.students}</TableCell>
                                <TableCell className="text-right">{a.enrollments}</TableCell>
                                <TableCell className="text-right font-medium">£{a.commission.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant={a.isActive ? "default" : "destructive"} className="text-xs">
                                    {a.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No agents assigned</p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {unassignedAgents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">Unassigned Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Enrollments</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildAgentData(unassignedAgents).map((a) => (
                      <TableRow key={a.name}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-right">{a.students}</TableCell>
                        <TableCell className="text-right">{a.enrollments}</TableCell>
                        <TableCell className="text-right font-medium">£{a.commission.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={a.isActive ? "default" : "destructive"} className="text-xs">
                            {a.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Enrollments */}
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
                {recentEnrollments.map((e: any) => (
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
                {recentEnrollments.length === 0 && (
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
