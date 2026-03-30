import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { calcCommissionByEnrollments } from "@/lib/commissions";
import { PoundSterling, Users, TrendingUp } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CommissionsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const { data: tiers = [] } = useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_tiers").select("*").order("min_students");
      return data || [];
    },
  });

  const { data: uniCommissions = [] } = useQuery({
    queryKey: ["university-commissions"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("university_commissions")
        .select("university_id, commission_per_student, universities(name)");
      return data || [];
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["all-agents-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, is_active, admin_id");
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data || [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["all-enrollments-commission", month, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, student_id, created_at, university_id, students!inner(agent_id)")
        .eq("status", "active");
      return data || [];
    },
  });

  const { data: adminProfiles = [] } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
  const adminMap = new Map(adminProfiles.map((p: any) => [p.id, p.full_name]));
  const agentList = agents.filter((a: any) => roleMap.get(a.id) === "agent");

  // Group enrollments per agent
  const agentEnrollments = new Map<string, { university_id: string }[]>();
  for (const e of enrollments) {
    const agentId = (e as any).students?.agent_id;
    if (agentId) {
      if (!agentEnrollments.has(agentId)) agentEnrollments.set(agentId, []);
      agentEnrollments.get(agentId)!.push({ university_id: e.university_id });
    }
  }

  const agentCommissions = agentList.map((agent: any) => {
    const agentEnrs = agentEnrollments.get(agent.id) || [];
    const commission = calcCommissionByEnrollments(agentEnrs, uniCommissions, tiers);
    return {
      ...agent,
      activeStudents: agentEnrs.length,
      commission,
      adminName: agent.admin_id ? adminMap.get(agent.admin_id) || "—" : "—",
    };
  });

  const totalCommission = agentCommissions.reduce((s, a) => s + a.commission, 0);
  const totalActiveStudents = agentCommissions.reduce((s, a) => s + a.activeStudents, 0);
  const avgPerAgent = agentList.length > 0 ? Math.round(totalCommission / agentList.length) : 0;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Commission"
            value={`£${totalCommission.toLocaleString()}`}
            icon={PoundSterling}
          />
          <MetricCard
            title="Active Students"
            value={totalActiveStudents}
            icon={Users}
          />
          <MetricCard
            title="Avg per Agent"
            value={`£${avgPerAgent.toLocaleString()}`}
            icon={TrendingUp}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Agent Breakdown</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-right">Active Students</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCommissions.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.adminName}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.activeStudents}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      £{a.commission.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {agentCommissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No agents found
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
