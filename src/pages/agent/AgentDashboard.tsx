import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Users, ClipboardList, Trophy, PoundSterling, HelpCircle, CheckCircle2, Clock } from "lucide-react";
import { PromoBanner } from "@/components/PromoBanner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CommissionOfferCards } from "@/components/CommissionOfferCards";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { DashboardSearchCard } from "@/components/DashboardSearchCard";

export default function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showTour, setShowTour] = useState(false);

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

  // Fetch commission snapshots for this agent (with intake info)
  const { data: snapshots = [] } = useQuery({
    queryKey: ["agent-snapshots", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_snapshots")
        .select("id, agent_rate, snapshot_status, eligible_at, enrollments(intake_id, universities(name), students(first_name, last_name), intakes(label))")
        .eq("agent_id", user!.id);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const { data: myPayments = [] } = useQuery({
    queryKey: ["agent-payments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_payments")
        .select("amount")
        .eq("recipient_id", user!.id)
        .eq("recipient_role", "agent");
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const activeEnrollments = enrollments.filter((e: any) => e.status === "active").length;
  const totalCommission = snapshots.reduce((s: number, snap: any) => s + Number(snap.agent_rate), 0);
  const totalPaid = myPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalRemaining = totalCommission - totalPaid;
  const readyForFull = snapshots.filter((s: any) => s.snapshot_status === "ready_full").length;

  // Per-intake eligibility
  const intakeGroups = new Map<string, { label: string; count: number }>();
  for (const snap of snapshots) {
    const intakeId = snap.enrollments?.intake_id || "no-intake";
    const intakeLabel = snap.enrollments?.intakes?.label || "No Intake";
    if (!intakeGroups.has(intakeId)) intakeGroups.set(intakeId, { label: intakeLabel, count: 0 });
    intakeGroups.get(intakeId)!.count++;
  }
  const qualifiesFor25 = Array.from(intakeGroups.values()).some(g => g.count >= 5);
  const bestIntake = Array.from(intakeGroups.values()).sort((a, b) => b.count - a.count)[0];

  const monthlyTarget = 10;
  const thisMonthStudents = students.filter((s: any) => {
    const d = new Date(s.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <DashboardLayout allowedRoles={["agent"]}>
      <div className="space-y-6">
        <div data-onboarding="step-promo">
          <PromoBanner />
        </div>
        <DashboardSearchCard />

        <div data-onboarding="step-commissions">
          <CommissionOfferCards />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">My Dashboard</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("onboarding-completed");
                setShowTour(true);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Tour
            </Button>
          </div>
          <div data-onboarding="step-new-student">
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98] transition-all"
              onClick={() => navigate("/agent/enroll")}
            >
              + New Student Enrollment
            </Button>
          </div>
        </div>

        <div data-onboarding="step-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="My Students" value={students.length} icon={Users} />
          <MetricCard title="Active Enrollments" value={activeEnrollments} icon={ClipboardList} />
          <MetricCard title="Total Commission" value={`£${totalCommission.toLocaleString()}`} icon={PoundSterling} description={`£${totalPaid.toLocaleString()} paid`} />
          <MetricCard title="Remaining" value={`£${totalRemaining.toLocaleString()}`} icon={Clock} />
        </div>

        {/* Commission eligibility card */}
        <Card className="border bg-card">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">25% Monthly Payout Eligibility</span>
              {qualifiesFor25 ? (
                <Badge className="bg-green-500/10 text-green-700 border-green-200" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Eligible
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-700 border-amber-200" variant="outline">
                  {bestIntake ? `${bestIntake.count}/5 (${bestIntake.label})` : `${snapshots.length}/5`} students
                </Badge>
              )}
            </div>
            <Progress value={Math.min((snapshots.length / 5) * 100, 100)} className="h-2" />
            {readyForFull > 0 && (
              <p className="text-xs text-green-700">
                {readyForFull} enrollment(s) ready for full commission payment
              </p>
            )}
          </CardContent>
        </Card>

        <div data-onboarding="step-target" className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Monthly Target</span>
            <span className="text-sm text-muted-foreground">{thisMonthStudents}/{monthlyTarget} students</span>
          </div>
          <Progress value={(thisMonthStudents / monthlyTarget) * 100} className="h-2" />
        </div>

        <div data-onboarding="step-enrollments" className="space-y-4">
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

      <OnboardingWizard
        forceOpen={showTour}
        onClose={() => setShowTour(false)}
      />
    </DashboardLayout>
  );
}
