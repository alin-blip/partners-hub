import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, ClipboardCheck, Users, BookOpen, FolderOpen, Info } from "lucide-react";

interface Props {
  courseId: string;
  compact?: boolean;
}

const SECTIONS = [
  { key: "entry_requirements", label: "Entry Requirements", icon: ClipboardCheck, color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { key: "admission_test_info", label: "Admission Test", icon: FileText, color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  { key: "interview_info", label: "Interview", icon: Users, color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
  { key: "documents_required", label: "Documents Required", icon: FolderOpen, color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  { key: "personal_statement_guidelines", label: "Personal Statement", icon: BookOpen, color: "text-rose-400 border-rose-400/30 bg-rose-400/10" },
  { key: "additional_info", label: "Additional Info", icon: Info, color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10" },
] as const;

export function CourseDetailsInfoCard({ courseId, compact = false }: Props) {
  const { data: details } = useQuery({
    queryKey: ["course-details", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_details")
        .select("*")
        .eq("course_id", courseId)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId,
  });

  if (!details) return null;

  const activeSections = SECTIONS.filter((s) => (details as any)[s.key]);
  if (activeSections.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-1">
        <Accordion type="single" collapsible className="w-full">
          {activeSections.map(({ key, label, icon: Icon, color }) => (
            <AccordionItem key={key} value={key} className="border-none">
              <AccordionTrigger className="hover:no-underline py-2 px-0 gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${color.split(" ")[0]}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
                    {label}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0">
                <div className={`pl-4 border-l-2 ${color.split(" ")[1]} ml-1.5`}>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {(details as any)[key]}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Course Requirements</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {activeSections.map(({ key, label, icon: Icon }) => {
            const value = (details as any)[key];
            return (
              <div key={key} className="flex gap-2">
                <Icon className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-muted-foreground whitespace-pre-line text-sm">{value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
