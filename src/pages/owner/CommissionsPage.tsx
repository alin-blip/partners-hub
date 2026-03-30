import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { calcCommissionByEnrollments, buildUniversityBreakdown, EnrollmentBreakdownItem } from "@/lib/commissions";
import { PoundSterling, Users, TrendingUp, ChevronDown, ChevronRight, CircleDollarSign } from "lucide-react";
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
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

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
        .select("university_id, commission_per_student, tier_id, universities(name)");
      return data || [];
    },
  });

  const { data: universities = [] } = useQuery({
    queryKey: ["all-universities-names"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("id, name");
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

  // Fetch enrollments for both stages
  const { data: enrollments = [] } = useQuery({
    queryKey: ["all-enrollments-commission", month, year],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, student_id, created_at, university_id, students!inner(agent_id)")
        .in("status", ["active", "offer_received", "accepted"]);
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
  const uniNameMap = new Map(universities.map((u: any) => [u.id, u.name]));
  const agentList = agents.filter((a: any) => roleMap.get(a.id) === "agent");
  const tierMap = new Map(tiers.map((t: any) => [t.id, t]));

  // Split enrollments by stage
  const generatedEnrollments = enrollments.filter((e: any) => e.status === "active");
  const possibleEnrollments = enrollments.filter((e: any) => e.status === "offer_received" || e.status === "accepted");

  // Group enrollments per agent
  function groupByAgent(enrs: any[]) {
    const map = new Map<string, { university_id: string }[]>();
    for (const e of enrs) {
      const agentId = (e as any).students?.agent_id;
      if (agentId) {
        if (!map.has(agentId)) map.set(agentId, []);
        map.get(agentId)!.push({ university_id: e.university_id });
      }
    }
    return map;
  }

  const generatedByAgent = groupByAgent(generatedEnrollments);
  const possibleByAgent = groupByAgent(possibleEnrollments);

  const agentCommissions = agentList.map((agent: any) => {
    const genEnrs = generatedByAgent.get(agent.id) || [];
    const posEnrs = possibleByAgent.get(agent.id) || [];
    const generated = calcCommissionByEnrollments(genEnrs, uniCommissions, tiers);
    const possible = calcCommissionByEnrollments(posEnrs, uniCommissions, tiers);
    const genBreakdown = buildUniversityBreakdown(genEnrs, uniCommissions, tiers, uniNameMap, tierMap);
    const posBreakdown = buildUniversityBreakdown(posEnrs, uniCommissions, tiers, uniNameMap, tierMap);
    return {
      ...agent,
      generatedStudents: genEnrs.length,
      possibleStudents: posEnrs.length,
      generated,
      possible,
      genBreakdown,
      posBreakdown,
      adminName: agent.admin_id ? adminMap.get(agent.admin_id) || "—" : "—",
    };
  });

  const totalGenerated = agentCommissions.reduce((s, a) => s + a.generated, 0);
  const totalPossible = agentCommissions.reduce((s, a) => s + a.possible, 0);
  const totalActiveStudents = agentCommissions.reduce((s, a) => s + a.generatedStudents, 0);
  const totalPossibleStudents = agentCommissions.reduce((s, a) => s + a.possibleStudents, 0);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const toggleExpand = (id: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Generated Commission" value={`£${totalGenerated.toLocaleString()}`} icon={PoundSterling} />
          <MetricCard title="Possible Commission" value={`£${totalPossible.toLocaleString()}`} icon={CircleDollarSign} />
          <MetricCard title="Active Students" value={totalActiveStudents} icon={Users} />
          <MetricCard title="Offer Stage Students" value={totalPossibleStudents} icon={TrendingUp} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Agent Breakdown</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Offer</TableHead>
                  <TableHead className="text-right">Generated</TableHead>
                  <TableHead className="text-right">Possible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCommissions.map((a) => {
                  const isExpanded = expandedAgents.has(a.id);
                  const hasData = a.generatedStudents > 0 || a.possibleStudents > 0;
                  return (
                    <>
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => hasData && toggleExpand(a.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {hasData && (
                            isExpanded
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{a.full_name}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{a.adminName}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.generatedStudents}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.possibleStudents}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          £{a.generated.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          £{a.possible.toLocaleString()}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${a.id}-breakdown`} className="bg-muted/20 hover:bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={6} className="py-2">
                            <BreakdownTables genBreakdown={a.genBreakdown} posBreakdown={a.posBreakdown} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {agentCommissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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

function BreakdownTables({ genBreakdown, posBreakdown }: { genBreakdown: EnrollmentBreakdownItem[]; posBreakdown: EnrollmentBreakdownItem[] }) {
  return (
    <div className="space-y-3">
      {genBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Generated (Active)</p>
          <BreakdownTable items={genBreakdown} />
        </div>
      )}
      {posBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Possible (Offer Stage)</p>
          <BreakdownTable items={posBreakdown} />
        </div>
      )}
      {genBreakdown.length === 0 && posBreakdown.length === 0 && (
        <p className="text-xs text-muted-foreground">No enrollments</p>
      )}
    </div>
  );
}

function BreakdownTable({ items }: { items: EnrollmentBreakdownItem[] }) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">University</TableHead>
            <TableHead className="text-xs text-right">Students</TableHead>
            <TableHead className="text-xs text-right">Rate</TableHead>
            <TableHead className="text-xs">Source</TableHead>
            <TableHead className="text-xs text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((b) => (
            <TableRow key={b.universityId}>
              <TableCell className="text-sm">{b.universityName}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">{b.count}</TableCell>
              <TableCell className="text-sm text-right tabular-nums">£{b.ratePerStudent.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs font-normal">
                  {b.rateSource}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-right font-medium tabular-nums">£{b.subtotal.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
