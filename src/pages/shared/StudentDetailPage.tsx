import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Download, Trash2, Pencil, Save, X, FileText } from "lucide-react";
import { format } from "date-fns";

const IMMIGRATION_OPTIONS = ["Pre-settled", "Settled", "British Citizen", "Visa Holder", "Refugee", "Other"];
const DOC_TYPES = ["Passport", "Transcript", "Offer Letter", "Visa", "Qualification Certificate", "Other"];

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Passport");
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  const { data: student, isLoading } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["student-enrollments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, created_at, universities!inner(name), courses!inner(name)")
        .eq("student_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents = [], refetch: refetchDocs } = useQuery({
    queryKey: ["student-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_documents")
        .select("*")
        .eq("student_id", id!)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!id,
  });

  const { data: agentProfile } = useQuery({
    queryKey: ["agent-profile", student?.agent_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", student!.agent_id)
        .single();
      return data;
    },
    enabled: !!student?.agent_id,
  });

  const updateStudent = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("students").update(updates).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-detail", id] });
      setEditing(false);
      toast({ title: "Student updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !student || !user) return;
    setUploading(true);

    try {
      // Build structured path: agentName_agentId/studentName_studentId/docType_timestamp.ext
      const agentName = sanitizeName(agentProfile?.full_name || "unknown");
      const studentName = sanitizeName(`${student.first_name}_${student.last_name}`);
      const ext = file.name.split(".").pop();
      const storagePath = `${agentName}_${student.agent_id}/${studentName}_${id}/${selectedDocType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to student_documents table
      const { error: dbError } = await supabase
        .from("student_documents")
        .insert({
          student_id: id,
          agent_id: student.agent_id,
          doc_type: selectedDocType,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          uploaded_by: user.id,
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
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteDoc = async (doc: any) => {
    // Delete from storage
    await supabase.storage.from("student-documents").remove([doc.file_path]);
    // Delete from DB
    const { error } = await supabase.from("student_documents").delete().eq("id", doc.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document deleted" });
      refetchDocs();
    }
  };

  const startEdit = () => {
    setEditData({
      first_name: student?.first_name || "",
      last_name: student?.last_name || "",
      email: student?.email || "",
      phone: student?.phone || "",
      date_of_birth: student?.date_of_birth || "",
      immigration_status: student?.immigration_status || "",
      qualifications: student?.qualifications || "",
      notes: student?.notes || "",
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateStudent.mutate({
      ...editData,
      email: editData.email || null,
      phone: editData.phone || null,
      date_of_birth: editData.date_of_birth || null,
      immigration_status: editData.immigration_status || null,
      qualifications: editData.qualifications || null,
      notes: editData.notes || null,
    });
  };

  const canEdit = role === "owner" || (role === "agent" && student?.agent_id === user?.id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Student not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${prefix}/students`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {student.first_name} {student.last_name}
          </h1>
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit} className="ml-auto">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )}
          {editing && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={updateStudent.isPending}>
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={editData.first_name} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={editData.last_name} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={editData.date_of_birth} onChange={(e) => setEditData({ ...editData, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Immigration Status</Label>
                  <Select value={editData.immigration_status} onValueChange={(v) => setEditData({ ...editData, immigration_status: v })}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {IMMIGRATION_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Qualifications</Label>
                  <Textarea value={editData.qualifications} onChange={(e) => setEditData({ ...editData, qualifications: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Email</p>
                  <p className="font-medium">{student.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Phone</p>
                  <p className="font-medium">{student.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Date of Birth</p>
                  <p className="font-medium">{student.date_of_birth ? format(new Date(student.date_of_birth), "dd MMM yyyy") : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Immigration Status</p>
                  <p className="font-medium">{student.immigration_status || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Qualifications</p>
                  <p className="font-medium">{student.qualifications || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Agent</p>
                  <p className="font-medium">{agentProfile?.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Created</p>
                  <p className="font-medium">{format(new Date(student.created_at), "dd MMM yyyy")}</p>
                </div>
                {student.notes && (
                  <div className="col-span-full">
                    <p className="text-muted-foreground text-xs mb-0.5">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{student.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Documents</CardTitle>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
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
                        <p className="text-xs text-muted-foreground">
                          {doc.file_name} {doc.file_size ? `• ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), "dd MMM yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteDoc(doc)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrollment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>University</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.universities?.name}</TableCell>
                    <TableCell>{e.courses?.name}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(e.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {enrollments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No enrollments
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
