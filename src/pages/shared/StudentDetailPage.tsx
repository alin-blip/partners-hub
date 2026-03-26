import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, FileText, GraduationCap, DollarSign, MessageSquare, Sparkles } from "lucide-react";
import { StudentOverviewTab } from "@/components/student-detail/StudentOverviewTab";
import { StudentDocumentsTab } from "@/components/student-detail/StudentDocumentsTab";
import { StudentEnrollmentsTab } from "@/components/student-detail/StudentEnrollmentsTab";
import { StudentFundingTab } from "@/components/student-detail/StudentFundingTab";
import { StudentNotesTab } from "@/components/student-detail/StudentNotesTab";
import { StudentAIDocumentsTab } from "@/components/student-detail/StudentAIDocumentsTab";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: agentProfile } = useQuery({
    queryKey: ["agent-profile", student?.agent_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", student!.agent_id).single();
      return data;
    },
    enabled: !!student?.agent_id,
  });

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div></DashboardLayout>;
  }
  if (!student) {
    return <DashboardLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Student not found</div></DashboardLayout>;
  }

  const canEdit = role === "owner" || role === "admin" || (role === "agent" && student.agent_id === user?.id);
  const canChangeStatus = role === "owner" || role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${prefix}/students`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {student.title ? `${student.title} ` : ""}{student.first_name} {student.last_name}
          </h1>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5"><User className="w-3.5 h-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Documents</TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Enrollments</TabsTrigger>
            <TabsTrigger value="funding" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Funding</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <StudentOverviewTab student={student} agentName={agentProfile?.full_name || ""} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="documents">
            <StudentDocumentsTab student={student} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="enrollments">
            <StudentEnrollmentsTab studentId={student.id} canChangeStatus={canChangeStatus} />
          </TabsContent>

          <TabsContent value="funding">
            <StudentFundingTab studentId={student.id} canEdit={canChangeStatus} />
          </TabsContent>

          <TabsContent value="notes">
            <StudentNotesTab studentId={student.id} studentName={`${student.first_name} ${student.last_name}`} canSendRequests={canChangeStatus} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
