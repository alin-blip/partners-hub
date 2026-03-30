import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { calcCommissionByEnrollments } from "@/lib/commissions";
import { PoundSterling, Users, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface UniBreakdownItem {
  universityId: string;
  universityName: string;
  count: number;
  ratePerStudent: number;
  subtotal: number;
  rateSource: string; // "Tier: Gold" | "Custom" | "Global Tier"
}

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
  const uniNameMap = new Map(universities.map((u: any) => [u.id, u.name]));
  const agentList = agents.filter((a: any) => roleMap.get(a.id) === "agent");

  const uniMap = new Map(uniCommissions.map((uc: any) => [uc.university_id, uc]));
  const tierMap = new Map(tiers.map((t: any) => [t.id, t]));

  // Group enrollments per agent, keeping university_id
  const agentEnrollments = new Map<string, { university_id: string }[]>();
  for (const e of enrollments) {
    const agentId = (e as any).students?.agent_id;
    if (agentId) {
      if (!agentEnrollments.has(agentId)) agentEnrollments.set(agentId, []);
      agentEnrollments.get(agentId)!.push({ university_id: e.university_id });
    }
  }

  // Build per-university breakdown for an agent
  function buildBreakdown(agentEnrs: { university_id: string }[]): UniBreakdownItem[] {
    const countByUni = new Map<string, number>();
    for (const e of agentEnrs) {
      countByUni.set(e.university_id, (countByUni.get(e.university_id) || 0) + 1);
    }

    // Count enrollments that fall back to global tier
    let globalTierCount = 0;
    const items: UniBreakdownItem[] = [];

    for (const [uniId, count] of countByUni) {
      const uc = uniMap.get(uniId);
      if (uc) {
        let rate: number;
        let source: string;
        if (uc.tier_id) {
          const linkedTier = tierMap.get(uc.tier_id);
          rate = linkedTier ? Number(linkedTier.commission_per_student) : Number(uc.commission_per_student);
          source = linkedTier ? `Tier: ${linkedTier.tier_name}` : "Custom";
        } else {
          rate = Number(uc.commission_per_student);
          source = "Custom";
        }
        items.push({
          universityId: uniId,
          universityName: uniNameMap.get(uniId) || uc.universities?.name || uniId,
          count,
          ratePerStudent: rate,
          subtotal: count * rate,
          rateSource: source,
        });
      } else {
        globalTierCount += count;
        // We'll add a single "Global Tier" line after
        // but still need the university name per row
        const globalTier = tiers.length > 0 ? tiers.find((t: any) =>
          globalTierCount >= t.min_students && (t.max_students === null || globalTierCount <= t.max_students)
        ) : null;
        const rate = globalTier ? Number(globalTier.commission_per_student) : 0;
        items.push({
          universityId: uniId,
          universityName: uniNameMap.get(uniId) || uniId,
          count,
          ratePerStudent: rate,
          subtotal: count * rate,
          rateSource: globalTier ? `Global: ${globalTier.tier_name}` : "No tier",
        });
      }
    }

    return items.sort((a, b) => b.subtotal - a.subtotal);
  }

  const agentCommissions = agentList.map((agent: any) => {
    const agentEnrs = agentEnrollments.get(agent.id) || [];
    const commission = calcCommissionByEnrollments(agentEnrs, uniCommissions, tiers);
    const breakdown = buildBreakdown(agentEnrs);
    return {
      ...agent,
      activeStudents: agentEnrs.length,
      commission,
      breakdown,
      adminName: agent.admin_id ? adminMap.get(agent.admin_id) || "—" : "—",
    };
  });

  const totalCommission = agentCommissions.reduce((s, a) => s + a.commission, 0);
  const totalActiveStudents = agentCommissions.reduce((s, a) => s + a.activeStudents, 0);
  const avgPerAgent = agentList.length > 0 ? Math.round(totalCommission / agentList.length) : 0;

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="Total Commission" value={`£${totalCommission.toLocaleString()}`} icon={PoundSterling} />
          <MetricCard title="Active Students" value={totalActiveStudents} icon={Users} />
          <MetricCard title="Avg per Agent" value={`£${avgPerAgent.toLocaleString()}`} icon={TrendingUp} />
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
                  <TableHead className="text-right">Active Students</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentCommissions.map((a) => {
                  const isExpanded = expandedAgents.has(a.id);
                  return (
                    <>
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => a.activeStudents > 0 && toggleExpand(a.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {a.activeStudents > 0 && (
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
                        <TableCell className="text-right tabular-nums">{a.activeStudents}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          £{a.commission.toLocaleString()}
                        </TableCell>
                      </TableRow>
                      {isExpanded && a.breakdown.length > 0 && (
                        <TableRow key={`${a.id}-breakdown`} className="bg-muted/20 hover:bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell colSpan={4} className="py-2">
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
                                  {a.breakdown.map((b: UniBreakdownItem) => (
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
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {agentCommissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
