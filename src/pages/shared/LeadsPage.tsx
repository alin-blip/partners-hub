import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, UserPlus, ArrowRight, Phone, Mail, StickyNote, AlertTriangle, MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

const STATUSES = ["new", "contacted", "qualified", "converted"] as const;
type LeadStatus = typeof STATUSES[number];

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  contacted: { label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  qualified: { label: "Qualified", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  converted: { label: "Converted", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

export default function LeadsPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [convertLead, setConvertLead] = useState<any | null>(null);
  const [notesLead, setNotesLead] = useState<any | null>(null);
  const [notesText, setNotesText] = useState("");
  const [duplicateError, setDuplicateError] = useState<{ lead: any; existingAgentName: string } | null>(null);
  const [contactingAdmin, setContactingAdmin] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const agentIds = [...new Set(leads.map((l: any) => l.agent_id))];
  const { data: agents = [] } = useQuery({
    queryKey: ["lead-agents", agentIds.join(",")],
    queryFn: async () => {
      if (agentIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", agentIds);
      return data || [];
    },
    enabled: agentIds.length > 0,
  });

  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a.full_name]));

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ notes } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Notes saved" });
      setNotesLead(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const convertToStudent = useMutation({
    mutationFn: async (lead: any) => {
      // Duplicate check by email (case-insensitive)
      const checks: Promise<any>[] = [];

      if (lead.email) {
        checks.push(
          supabase
            .from("students")
            .select("id, first_name, last_name, agent_id")
            .ilike("email", lead.email)
            .limit(1)
        );
      }

      if (lead.phone) {
        checks.push(
          supabase
            .from("students")
            .select("id, first_name, last_name, agent_id")
            .eq("phone", lead.phone)
            .limit(1)
        );
      }

      const results = await Promise.all(checks);
      const duplicate = results.flatMap((r) => r.data || []).find((s) => s);

      if (duplicate) {
        // Get agent name of existing student
        const { data: existingAgent } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", duplicate.agent_id)
          .single();

        throw new Error(`DUPLICATE:${existingAgent?.full_name || "Unknown agent"}`);
      }

      // No duplicate — proceed with conversion
      const { data: student, error: studentErr } = await supabase.from("students").insert({
        agent_id: lead.agent_id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone || null,
        nationality: lead.nationality || null,
        notes: lead.course_interest ? `Course interest: ${lead.course_interest}` : null,
      }).select("id").single();
      if (studentErr) throw studentErr;

      if (lead.university_id && lead.course_id && student) {
        const { error: enrollErr } = await supabase.from("enrollments").insert({
          student_id: student.id,
          university_id: lead.university_id,
          course_id: lead.course_id,
          campus_id: lead.campus_id || null,
          intake_id: lead.intake_id || null,
          status: "applied",
        });
        if (enrollErr) console.error("Enrollment creation failed:", enrollErr);
      }

      const { error: updateErr } = await supabase
        .from("leads")
        .update({ status: "converted" } as any)
        .eq("id", lead.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollments"] });
      toast({ title: "Lead converted to student!" });
      setConvertLead(null);
    },
    onError: (e: any) => {
      if (e.message?.startsWith("DUPLICATE:")) {
        const agentName = e.message.replace("DUPLICATE:", "");
        setDuplicateError({ lead: convertLead, existingAgentName: agentName });
        setConvertLead(null);
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    },
  });

  const handleContactAdmin = async () => {
    if (!duplicateError || !user) return;
    setContactingAdmin(true);
    try {
      const lead = duplicateError.lead;

      // Find agent's admin_id
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("admin_id")
        .eq("id", user.id)
        .single();

      let adminId = myProfile?.admin_id;

      // Fallback to owner if no admin_id
      if (!adminId) {
        const { data: ownerRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "owner")
          .limit(1)
          .single();
        adminId = ownerRole?.user_id;
      }

      if (!adminId) {
        toast({ title: "Error", description: "Could not find an admin to contact.", variant: "destructive" });
        return;
      }

      // Find or create conversation
      const { data: existingConvo } = await supabase
        .from("direct_conversations")
        .select("id")
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${adminId}),and(participant_1.eq.${adminId},participant_2.eq.${user.id})`)
        .limit(1)
        .maybeSingle();

      let conversationId = existingConvo?.id;

      if (!conversationId) {
        const { data: newConvo, error: convoErr } = await supabase
          .from("direct_conversations")
          .insert({ participant_1: user.id, participant_2: adminId })
          .select("id")
          .single();
        if (convoErr) throw convoErr;
        conversationId = newConvo.id;
      }

      // Send automated message
      const studentName = `${lead.first_name} ${lead.last_name}`;
      const agentName = profile?.full_name || "An agent";
      const contactInfo = [lead.email, lead.phone].filter(Boolean).join(", ");

      const message = `⚠️ Duplicate student detected\n\nI tried to enrol ${studentName} (${contactInfo}) but they appear as a duplicate in the system.\n\nPlease guide me on how to proceed.\n\n— ${agentName}`;

      const { error: msgErr } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message,
        });
      if (msgErr) throw msgErr;

      toast({ title: "Message sent", description: "Your admin has been notified about the duplicate." });
      setDuplicateError(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setContactingAdmin(false);
    }
  };

  const filtered = leads.filter((lead: any) => {
    const matchesSearch =
      !search ||
      `${lead.first_name} ${lead.last_name} ${lead.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l: any) => l.status === s).length;
    return acc;
  }, {} as Record<LeadStatus, number>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Lead Management</h1>
          <Badge variant="outline" className="text-sm">{leads.length} total leads</Badge>
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUSES.map((status) => (
            <Card
              key={status}
              className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === status ? "ring-2 ring-accent" : ""}`}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            >
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{counts[status]}</p>
                <p className="text-xs text-muted-foreground capitalize">{statusConfig[status].label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Nationality</TableHead>
                  <TableHead className="hidden lg:table-cell">Interest</TableHead>
                  <TableHead className="hidden md:table-cell">Agent</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead: any) => {
                    const status = lead.status as LeadStatus;
                    const currentIdx = STATUSES.indexOf(status);
                    const nextStatus = currentIdx < STATUSES.length - 1 ? STATUSES[currentIdx + 1] : null;

                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5 text-xs">
                            {lead.email && (
                              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-accent">
                                <Mail className="w-3 h-3" /> {lead.email}
                              </a>
                            )}
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-accent">
                                <Phone className="w-3 h-3" /> {lead.phone}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{lead.nationality || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm max-w-[140px] truncate">{lead.course_interest || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{agentMap[lead.agent_id] || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[status].color} border-0 text-[10px]`}>
                            {statusConfig[status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => { setNotesLead(lead); setNotesText(lead.notes || ""); }}
                            >
                              <StickyNote className="w-3 h-3 mr-1" />
                              Notes
                              {lead.notes && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                            </Button>
                            {nextStatus && nextStatus !== "converted" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => updateStatus.mutate({ id: lead.id, status: nextStatus })}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                {statusConfig[nextStatus].label}
                              </Button>
                            )}
                            {status !== "converted" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                                onClick={() => setConvertLead(lead)}
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Convert
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Convert dialog */}
      <Dialog open={!!convertLead} onOpenChange={() => setConvertLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Student</DialogTitle>
            <DialogDescription>
              This will create a new student record with the lead's information and mark the lead as converted.
            </DialogDescription>
          </DialogHeader>
          {convertLead && (
            <div className="space-y-2 text-sm py-2">
              <p><strong>Name:</strong> {convertLead.first_name} {convertLead.last_name}</p>
              <p><strong>Email:</strong> {convertLead.email}</p>
              {convertLead.phone && <p><strong>Phone:</strong> {convertLead.phone}</p>}
              {convertLead.nationality && <p><strong>Nationality:</strong> {convertLead.nationality}</p>}
              {convertLead.course_interest && <p><strong>Course Interest:</strong> {convertLead.course_interest}</p>}
              <p><strong>Agent:</strong> {agentMap[convertLead.agent_id] || "Unknown"}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertLead(null)}>Cancel</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={convertToStudent.isPending}
              onClick={() => convertLead && convertToStudent.mutate(convertLead)}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              {convertToStudent.isPending ? "Converting..." : "Convert to Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate detected dialog */}
      <Dialog open={!!duplicateError} onOpenChange={() => setDuplicateError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Duplicate Student Detected
            </DialogTitle>
            <DialogDescription>
              A student with the same contact details already exists in the system.
            </DialogDescription>
          </DialogHeader>
          {duplicateError && (
            <div className="space-y-4 py-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>This student already exists in the database</AlertTitle>
                <AlertDescription>
                  <strong>{duplicateError.lead.first_name} {duplicateError.lead.last_name}</strong> ({duplicateError.lead.email})
                  is already registered and belongs to another agent: <strong>{duplicateError.existingAgentName}</strong>.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Please contact your admin for guidance on how to proceed with this student.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDuplicateError(null)}>Close</Button>
            <Button
              onClick={handleContactAdmin}
              disabled={contactingAdmin}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {contactingAdmin ? "Sending..." : "Contact Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog open={!!notesLead} onOpenChange={() => setNotesLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes — {notesLead?.first_name} {notesLead?.last_name}</DialogTitle>
            <DialogDescription>
              Add or edit notes for this lead.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Write notes about this lead..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesLead(null)}>Cancel</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={saveNotes.isPending}
              onClick={() => notesLead && saveNotes.mutate({ id: notesLead.id, notes: notesText })}
            >
              {saveNotes.isPending ? "Saving..." : "Save Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
