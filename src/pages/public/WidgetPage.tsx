import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WidgetPage() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", course_interest: "", message: "" });

  const { data: branch, isLoading: branchLoading } = useQuery({
    queryKey: ["widget-branch", branchSlug],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name, slug, companies(name, logo_url)").eq("slug", branchSlug!).eq("is_active", true).maybeSingle();
      return data;
    },
    enabled: !!branchSlug,
  });

  const { data: settings } = useQuery({
    queryKey: ["widget-settings", (branch as any)?.id],
    queryFn: async () => {
      if (!branch) return null;
      const { data } = await supabase.from("branch_widget_settings").select("*").eq("branch_id", (branch as any).id).eq("is_enabled", true).maybeSingle();
      return data;
    },
    enabled: !!branch,
  });

  if (branchLoading) return <Center>Loading…</Center>;
  if (!branch) return <Center>Branch not found or inactive.</Center>;
  if (!settings) return <Center>This widget is currently disabled.</Center>;

  const primary = settings.primary_color || "#0A1628";
  const accent = settings.accent_color || "#D4AF37";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("widget_leads").insert({
      branch_id: (branch as any).id,
      first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim(), phone: form.phone.trim() || null,
      course_interest: form.course_interest.trim() || null,
      message: form.message.trim() || null,
      source_url: window.location.href,
    });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: primary }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 text-white" style={{ backgroundColor: primary }}>
          <div className="flex items-center gap-3">
            {(branch as any).companies?.logo_url ? (
              <img src={(branch as any).companies.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent, color: primary }}>
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div>
              <p className="font-semibold">{(branch as any).companies?.name}</p>
              <p className="text-xs opacity-70">{branch.name}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: accent }} />
              <h2 className="text-xl font-bold">Thank you!</h2>
              <p className="text-muted-foreground text-sm">We've received your details. Someone will be in touch soon.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{settings.greeting_text}</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First name *"><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
                  <Field label="Last name *"><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
                </div>
                <Field label="Email *"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Course interest"><Input value={form.course_interest} onChange={(e) => setForm({ ...form, course_interest: e.target.value })} /></Field>
                <Field label="Message"><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
                <Button type="submit" disabled={loading} className="w-full rounded-full" style={{ backgroundColor: accent, color: primary }}>
                  {loading ? "Sending…" : settings.button_text}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-[#0A1628] text-white/70 p-6 text-center">{children}</div>;
}
