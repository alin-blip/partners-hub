import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ClipboardCheck, Users, BookOpen, FolderOpen, Info } from "lucide-react";

interface Props {
  courseId: string;
  compact?: boolean;
}

const SECTIONS = [
  { key: "entry_requirements", label: "Entry Requirements", icon: ClipboardCheck },
  { key: "admission_test_info", label: "Admission Test", icon: FileText },
  { key: "interview_info", label: "Interview", icon: Users },
  { key: "documents_required", label: "Documents Required", icon: FolderOpen },
  { key: "personal_statement_guidelines", label: "Personal Statement", icon: BookOpen },
  { key: "additional_info", label: "Additional Info", icon: Info },
] as const;

export function CourseDetailsInfoCard({ courseId, compact = false }: Props) {
  const { data: details } = useQuery({
    queryKey: ["course-details", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_details" as any)
        .select("*")
        .eq("course_id", courseId)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId,
  });

  if (!details) return null;

  const hasAny = SECTIONS.some((s) => (details as any)[s.key]);
  if (!hasAny) return null;

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className={compact ? "pb-2 pt-3 px-4" : "pb-3"}>
        <CardTitle className={compact ? "text-sm" : "text-base"}>Course Requirements</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-3 pt-0" : "pt-0"}>
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const value = (details as any)[key];
            if (!value) return null;
            return (
              <div key={key} className="flex gap-2">
                <Icon className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} mt-0.5 text-accent shrink-0`} />
                <div>
                  <p className={`font-medium ${compact ? "text-xs" : "text-sm"}`}>{label}</p>
                  <p className={`text-muted-foreground whitespace-pre-line ${compact ? "text-xs" : "text-sm"}`}>{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
