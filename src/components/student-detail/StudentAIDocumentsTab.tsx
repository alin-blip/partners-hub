import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Loader2, ScrollText, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  studentId: string;
  studentName: string;
}

export function StudentAIDocumentsTab({ studentId, studentName }: Props) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState<"cv" | "personal_statement" | null>(null);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const [psContent, setPsContent] = useState<string | null>(null);
  const [psAiScore, setPsAiScore] = useState<number | null>(null);
  const [useGuidelines, setUseGuidelines] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const generate = async (type: "cv" | "personal_statement") => {
    setGenerating(type);
    try {
      const { data, error } = await supabase.functions.invoke("generate-student-document", {
        body: { student_id: studentId, document_type: type, use_guidelines: type === "personal_statement" ? useGuidelines : true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (type === "cv") {
        setCvContent(data.content);
      } else {
        setPsContent(data.content);
        setPsAiScore(data.ai_score ?? null);
      }

      toast({ title: `${type === "cv" ? "CV" : "Personal Statement"} generated successfully` });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  const handlePrint = (content: string, title: string) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title} - ${studentName}</title>
      <style>
        body { font-family: Georgia, 'Times New Roman', serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #222; line-height: 1.6; }
        h1 { font-size: 1.6em; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 1.2em; margin-top: 1.5em; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        h3 { font-size: 1em; margin-top: 1em; }
        ul { padding-left: 20px; }
        p { margin: 0.5em 0; }
        @media print { body { margin: 0; } }
      </style></head><body>`);

    const html = content
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^\- (.*$)/gm, "<li>$1</li>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/<\/li>\n<li>/g, "</li><li>");

    const withUl = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);

    win.document.write(`<p>${withUl}</p></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const AiScoreBadge = ({ score }: { score: number }) => {
    if (score < 15) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          AI Score: {score}% ✓
        </Badge>
      );
    }
    if (score <= 25) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700 gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          AI Score: {score}% ⚠
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700 gap-1">
        <ShieldX className="w-3.5 h-3.5" />
        AI Score: {score}% ✗
      </Badge>
    );
  };

  const DocumentCard = ({
    title,
    icon: Icon,
    type,
    content,
    aiScore,
  }: {
    title: string;
    icon: any;
    type: "cv" | "personal_statement";
    content: string | null;
    aiScore?: number | null;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" /> {title}
          {aiScore !== null && aiScore !== undefined && <AiScoreBadge score={aiScore} />}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => generate(type)}
            disabled={generating !== null}
          >
            {generating === type ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating…</>
            ) : content ? (
              "Regenerate"
            ) : (
              "Generate"
            )}
          </Button>
          {content && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePrint(content, title)}
            >
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          )}
        </div>
      </CardHeader>
      {content && (
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert border rounded-md p-4 bg-muted/30 max-h-[500px] overflow-y-auto">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-4 pt-4" ref={printRef}>
      <p className="text-sm text-muted-foreground">
        Generate AI-powered documents based on this student's profile and enrollment data.
      </p>
      <DocumentCard title="Curriculum Vitae (CV)" icon={FileText} type="cv" content={cvContent} />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch id="use-guidelines" checked={useGuidelines} onCheckedChange={setUseGuidelines} />
          <Label htmlFor="use-guidelines" className="text-sm cursor-pointer">Use course-specific guidelines</Label>
        </div>
        <DocumentCard title="Personal Statement" icon={ScrollText} type="personal_statement" content={psContent} aiScore={psAiScore} />
      </div>
    </div>
  );
}
