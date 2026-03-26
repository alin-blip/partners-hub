import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, MessageSquare, FileWarning, DollarSign } from "lucide-react";
import { format } from "date-fns";

const NOTE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  note: { label: "Note", icon: MessageSquare, color: "bg-blue-500/10 text-blue-700" },
  status_change: { label: "Status Change", icon: AlertTriangle, color: "bg-yellow-500/10 text-yellow-700" },
  document_request: { label: "Document Request", icon: FileWarning, color: "bg-red-500/10 text-red-700" },
  funding_update: { label: "Funding Update", icon: DollarSign, color: "bg-green-500/10 text-green-700" },
};

interface Props {
  studentId: string;
  canSendRequests: boolean; // owner/admin only
}

export function StudentNotesTab({ studentId, canSendRequests }: Props) {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("note");

  const { data: notes = [] } = useQuery({
    queryKey: ["student-notes", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_notes")
        .select("*, profiles:user_id(full_name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("student_notes").insert({
        student_id: studentId,
        user_id: user!.id,
        content,
        note_type: noteType,
        is_agent_visible: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-notes", studentId] });
      setContent("");
      setNoteType("note");
      toast({ title: "Note added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const availableTypes = canSendRequests
    ? ["note", "document_request", "funding_update"]
    : ["note"];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Notes & Activity</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
          <div className="flex gap-2">
            {canSendRequests && (
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => {
                    const cfg = NOTE_TYPE_CONFIG[t];
                    return <SelectItem key={t} value={t}>{cfg.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={noteType === "document_request" ? "Describe which documents are needed..." : "Write a note..."}
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => addNote.mutate()} disabled={!content.trim() || addNote.isPending}>
              <Send className="w-3 h-3 mr-1" /> {addNote.isPending ? "Sending…" : "Add Note"}
            </Button>
          </div>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note: any) => {
              const cfg = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.note;
              const Icon = cfg.icon;
              return (
                <div key={note.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      <span className="text-xs font-medium">{(note as any).profiles?.full_name || "Unknown"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
