import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { SignatureCanvas } from "@/components/SignatureCanvas";

const DOC_TYPES = ["Passport", "Transcript", "Offer Letter", "Visa", "Qualification Certificate", "Share Code", "Proof of Address", "Other"];

const CONSENT_CLAUSES = [
  { id: "data_processing", title: "Data Processing Consent", text: "I consent to EduForYou UK collecting, processing, and storing my personal data for the purpose of facilitating my enrollment at the selected university." },
  { id: "document_sharing", title: "Document Sharing Consent", text: "I authorise EduForYou UK to share all documents I have provided with the university and relevant regulatory bodies." },
  { id: "communication", title: "Communication Consent", text: "I consent to being contacted by EduForYou UK and the university regarding my application." },
  { id: "student_finance", title: "Student Finance Consent", text: "Where applicable, I consent to EduForYou UK sharing my data with Student Finance England (SFE)." },
  { id: "accuracy", title: "Declaration of Accuracy", text: "I declare that all information I have provided is true, complete, and accurate to the best of my knowledge." },
];

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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Passport");

  // Re-generate consent state
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentChecks, setConsentChecks] = useState<Record<string, boolean>>({});
  const [consentSignature, setConsentSignature] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const allConsentsChecked = CONSENT_CLAUSES.every((c) => consentChecks[c.id]);
  const canSubmitConsent = allConsentsChecked && consentSignature.trim().length > 0 && !!signatureDataUrl;

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

  // Fetch enrollments for consent PDF context
  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments-for-consent", student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, universities(name), courses(name)")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return data || [];
    },
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

  const handleReGenerateConsent = async () => {
    if (!user || !canSubmitConsent) return;
    setGenerating(true);
    try {
      const enrollment = enrollments[0] as any;
      const universityName = enrollment?.universities?.name || "N/A";
      const courseName = enrollment?.courses?.name || "N/A";

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke("generate-consent-pdf", {
        body: {
          studentName: `${student.title ? student.title + " " : ""}${student.first_name} ${student.last_name}`,
          dateOfBirth: student.date_of_birth || null,
          nationality: student.nationality || null,
          address: student.full_address || null,
          universityName,
          courseName,
          agentName: agentProfile?.full_name || "EduForYou UK",
          signature: consentSignature,
          signatureImage: signatureDataUrl || null,
          consentDate: new Date().toLocaleDateString("en-GB"),
        },
      });

      if (pdfError) throw pdfError;

      const base64 = pdfData.pdf_base64;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: "application/pdf" });

      const agName = sanitizeName(agentProfile?.full_name || "agent");
      const stName = sanitizeName(`${student.first_name}_${student.last_name}`);
      const storagePath = `${agName}_${student.agent_id}/${stName}_${student.id}/Consent_Form_${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(storagePath, pdfBlob, { contentType: "application/pdf" });
      if (uploadError) throw uploadError;

      await supabase.from("student_documents").insert({
        student_id: student.id,
        agent_id: student.agent_id,
        doc_type: "Consent Form",
        file_name: `EduForYou_Consent_Form_${student.first_name}_${student.last_name}.pdf`,
        file_path: storagePath,
        file_size: pdfBlob.size,
        uploaded_by: user.id,
      });

      toast({ title: "Consent form re-generated", description: "New consent form PDF has been created and saved." });
      setConsentDialogOpen(false);
      setConsentChecks({});
      setConsentSignature("");
      setSignatureDataUrl(null);
      refetchDocs();
    } catch (err: any) {
      toast({ title: "Failed to generate consent form", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Documents</CardTitle>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setConsentDialogOpen(true)}>
                <RefreshCw className="w-3 h-3 mr-1" /> Re-generate Consent
              </Button>
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
                    {doc.doc_type === "Consent Form" ? (
                      <ShieldCheck className="w-4 h-4 text-accent" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
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

      {/* Re-generate Consent Form Dialog */}
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              Re-generate Consent Form
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            This will create a new consent form PDF for <strong>{student.first_name} {student.last_name}</strong>. 
            The student must agree to all declarations and sign again.
          </p>

          <div className="space-y-3">
            {CONSENT_CLAUSES.map((clause) => (
              <div key={clause.id} className="space-y-1 p-3 rounded-lg border bg-muted/20">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={!!consentChecks[clause.id]}
                    onCheckedChange={(checked) =>
                      setConsentChecks((prev) => ({ ...prev, [clause.id]: !!checked }))
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold">{clause.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{clause.text}</p>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Full Name (typed confirmation) *</Label>
            <Input
              value={consentSignature}
              onChange={(e) => setConsentSignature(e.target.value)}
              placeholder={`e.g. ${student.first_name} ${student.last_name}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Signature (draw below) *</Label>
            <SignatureCanvas onSignatureChange={setSignatureDataUrl} width={400} height={120} />
            <p className="text-xs text-muted-foreground">
              Date: {new Date().toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConsentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReGenerateConsent}
              disabled={!canSubmitConsent || generating}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {generating ? "Generating…" : "Generate & Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
