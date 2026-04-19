import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BUSINESS_TYPES = [
  "Staffing / recruitment agency",
  "Accounting / bookkeeping firm",
  "Law practice",
  "Migration / immigration consultancy",
  "Education consultancy",
  "Retail or service business",
  "Religious / community organisation",
  "Other",
];

export default function ApplyPartnerPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    business_type: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    branches_count: "",
    estimated_referrals_per_month: "",
    message: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.company_name.trim().length < 2 || form.contact_name.trim().length < 2) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("company_applications").insert({
      company_name: form.company_name.trim(),
      business_type: form.business_type || null,
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
      website: form.website.trim() || null,
      branches_count: form.branches_count ? Number(form.branches_count) : null,
      estimated_referrals_per_month: form.estimated_referrals_per_month
        ? Number(form.estimated_referrals_per_month)
        : null,
      message: form.message.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/apply-partner/thank-you");
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/for-business" className="text-sm text-white/60 hover:text-white inline-block mb-6">
          ← Back
        </Link>
        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-bold">
            Become an <span className="text-[#D4AF37]">EduForYou</span> partner
          </h1>
          <p className="text-white/60">
            Tell us a little about your business. We review every application within 48 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Company name *">
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} required />
            </Field>
            <Field label="Business type">
              <Select value={form.business_type} onValueChange={(v) => update("business_type", v)}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Your name *">
              <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} required />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} required />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Phone"><Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} /></Field>
            <Field label="Website"><Input placeholder="https://…" value={form.website} onChange={(e) => update("website", e.target.value)} /></Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Number of branches">
              <Input type="number" min="1" value={form.branches_count} onChange={(e) => update("branches_count", e.target.value)} />
            </Field>
            <Field label="Estimated monthly referrals">
              <Input type="number" min="1" value={form.estimated_referrals_per_month} onChange={(e) => update("estimated_referrals_per_month", e.target.value)} />
            </Field>
          </div>

          <Field label="Tell us about your business">
            <Textarea rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} />
          </Field>

          <Button type="submit" disabled={loading} size="lg" className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 rounded-full">
            {loading ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/80 text-xs uppercase tracking-wider">{label}</Label>
      <div className="[&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-white [&_textarea]:bg-white/5 [&_textarea]:border-white/10 [&_textarea]:text-white">{children}</div>
    </div>
  );
}
