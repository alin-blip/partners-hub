import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

const DOC_TYPES = ["Passport", "Transcript", "Offer Letter", "Visa", "Qualification Certificate", "Share Code", "Proof of Address", "Other"];

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
}

interface Props {
  student: any;
  canEdit: boolean;
}

export function StudentDocumentsTab({ student, canEdit }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Passport");

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["student-documents", student.id],
    queryFn: async () => {
      const { data } = await supabase.from("student_documents").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: agentProfile } = useQuery({
    queryKey: ["agent-profile", student.agent_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", student.agent_id).single();
      return data;
    },
    enabled: !!student.agent_id,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const agentName = sanitizeName(agentProfile?.full_name || "unknown");
      const studentName = sanitizeName(`${student.first_name}_${student.last_name}`);
      const ext = file.name.split(".").pop();
      const storagePath = `${agentName}_${student.agent_id}/${studentName}_${student.id}/${selectedDocType}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("student-documents").upload(storagePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from("student_documents").insert({
        student_id: student.id, agent_id: student.agent_id, doc_type: selectedDocType,
        file_name: file.name, file_path: storagePath, file_size: file.size, uploaded_by: user.id,
      });
      if (dbError) throw dbError;
      toast({ title: "Document uploaded" });
      refetchDocs();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from("student-documents").download(doc.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = doc.file_name; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    await supabase.storage.from("student-documents").remove([doc.file_path]);
    const { error } = await supabase.from("student_documents").delete().eq("id", doc.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Document deleted" }); refetchDocs(); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Documents</CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.doc_type}</p>
                    <p className="text-xs text-muted-foreground">{doc.file_name} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(0)} KB` : ""}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd MMM yyyy HH:mm")}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}><Download className="w-3.5 h-3.5" /></Button>
                  {canEdit && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteDoc(doc)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
