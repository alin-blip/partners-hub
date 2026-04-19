import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Sparkles, Trash2 } from "lucide-react";

export default function AIEmailGeneratorPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ sequence_name: "", audience: "", goal: "" });
  const [generating, setGenerating] = useState(false);

  const { data: sequences = [] } = useQuery({
    queryKey: ["email-sequences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("generated_email_sequences").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const generate = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      // Simple local generation as a starter — replace with edge function later.
      const emails = [
        { subject: `Welcome — ${form.audience || "valued partner"}`, body: `Hi {{first_name}},\n\nThanks for showing interest. ${form.goal}\n\nBest,\nThe team` },
        { subject: "A quick follow-up", body: `Hi {{first_name}},\n\nJust checking back on what we discussed. Let me know if you'd like to chat.\n\nBest` },
        { subject: "Last note from us", body: `Hi {{first_name}},\n\nWe'll stop here unless you'd like to continue. Reply anytime.\n\nBest` },
      ];
      const { error } = await supabase.from("generated_email_sequences").insert({
        created_by: user!.id,
        sequence_name: form.sequence_name.trim() || "Untitled sequence",
        audience: form.audience.trim() || null,
        goal: form.goal.trim() || null,
        emails,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      setForm({ sequence_name: "", audience: "", goal: "" });
      toast({ title: "Sequence drafted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    onSettled: () => setGenerating(false),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generated_email_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-sequences"] }),
  });

  return (
    <DashboardLayout allowedRoles={["owner", "admin", "company_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI email generator</h1>
          <p className="text-sm text-muted-foreground">Draft outreach sequences for your audience.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>New sequence</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Sequence name"><Input value={form.sequence_name} onChange={(e) => setForm({ ...form, sequence_name: e.target.value })} placeholder="Q1 partner outreach" /></Field>
              <Field label="Audience"><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Accounting firms in London" /></Field>
            </div>
            <Field label="Goal">
              <Textarea rows={3} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="Convince them to refer their clients to our UK university programs." />
            </Field>
            <Button onClick={() => generate.mutate()} disabled={generating || !form.goal.trim()}>
              <Sparkles className="w-4 h-4 mr-2" />{generating ? "Generating…" : "Generate sequence"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your sequences</h2>
          {sequences.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />No sequences yet.</CardContent></Card>
          ) : sequences.map((s: any) => (
            <Card key={s.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.sequence_name}</CardTitle>
                    {s.audience && <p className="text-xs text-muted-foreground mt-1">For: {s.audience}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(s.emails as any[]).map((em, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-muted/30">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Email {i + 1}</p>
                    <p className="font-medium mt-1">{em.subject}</p>
                    <pre className="text-xs whitespace-pre-wrap mt-2 font-sans text-muted-foreground">{em.body}</pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
