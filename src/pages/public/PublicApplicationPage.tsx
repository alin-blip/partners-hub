import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, CheckCircle2, Loader2 } from "lucide-react";

interface AgentInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function PublicApplicationPage() {
  const { slug } = useParams<{ slug: string }>();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);

  // Cascading dropdowns
  const [universities, setUniversities] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<any[]>([]);
  const [timetableOptions, setTimetableOptions] = useState<any[]>([]);

  const [universityId, setUniversityId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [timetableOption, setTimetableOption] = useState("");

  const [selectedUni, setSelectedUni] = useState<any>(null);

  // Load agent + universities on mount
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: prof } = await supabase
        .from("public_agent_profiles" as any)
        .select("id, full_name, avatar_url")
        .eq("slug", slug)
        .single() as { data: { id: string; full_name: string; avatar_url: string | null } | null; error: any };

      if (!prof) { setNotFound(true); setLoading(false); return; }

      const { data: card } = await supabase
        .from("agent_card_settings")
        .select("is_public, ai_voice_enabled")
        .eq("user_id", prof.id)
        .eq("is_public", true)
        .single();

      if (!card) { setNotFound(true); setLoading(false); return; }
      setAiVoiceEnabled(!!(card as any).ai_voice_enabled);

      setAgent(prof);

      const { data: unis } = await supabase
        .from("universities")
        .select("id, name, timetable_available, timetable_message")
        .eq("is_active", true)
        .order("name");
      setUniversities(unis || []);
      setLoading(false);
    })();
  }, [slug]);

  // Load ElevenLabs widget script when AI voice is enabled
  useEffect(() => {
    if (!aiVoiceEnabled) return;
    const scriptId = "elevenlabs-convai-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://elevenlabs.io/convai-widget/index.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [aiVoiceEnabled]);

  // Load campuses + courses + intakes + timetable when university changes
  useEffect(() => {
    if (!universityId) {
      setCampuses([]); setCourses([]); setIntakes([]); setTimetableOptions([]);
      setCampusId(""); setCourseId(""); setIntakeId(""); setTimetableOption("");
      setSelectedUni(null);
      return;
    }
    setCampusId(""); setCourseId(""); setIntakeId(""); setTimetableOption("");
    setSelectedUni(universities.find(u => u.id === universityId) || null);

    (async () => {
      const [campusRes, courseRes, intakeRes, ttRes] = await Promise.all([
        supabase.from("campuses").select("id, name, city").eq("university_id", universityId).order("name"),
        supabase.from("courses").select("id, name, level, study_mode").eq("university_id", universityId).order("name"),
        supabase.from("intakes").select("id, label, start_date").eq("university_id", universityId).order("start_date"),
        supabase.from("timetable_options").select("id, label").eq("university_id", universityId).order("label"),
      ]);
      setCampuses(campusRes.data || []);
      setCourses(courseRes.data || []);
      setIntakes(intakeRes.data || []);
      setTimetableOptions(ttRes.data || []);
    })();
  }, [universityId, universities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setSubmitting(true);

    try {
      // Build course_interest text summary
      const uniName = universities.find(u => u.id === universityId)?.name || "";
      const campusName = campuses.find(c => c.id === campusId)?.name || "";
      const courseName = courses.find(c => c.id === courseId)?.name || "";
      const intakeLabel = intakes.find(i => i.id === intakeId)?.label || "";
      const parts = [uniName, campusName, courseName, intakeLabel, timetableOption].filter(Boolean);

      const leadId = crypto.randomUUID();

      const { error } = await supabase.from("leads").insert({
        id: leadId,
        agent_id: agent.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        nationality: nationality.trim() || null,
        course_interest: parts.join(" — ") || null,
        university_id: universityId || null,
        campus_id: campusId || null,
        course_id: courseId || null,
        intake_id: intakeId || null,
        timetable_option: timetableOption || null,
        status: "new",
      } as any);

      if (error) {
        console.error("Lead insert error:", error);
        // Show a user-friendly error message
        setSubmitting(false);
        return;
      }

      // Send email notification to the agent via edge function
      const leadName = `${firstName.trim()} ${lastName.trim()}`;
      const courseInterest = parts.join(" — ") || undefined;

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "new-lead-notification",
          recipientEmail: null,
          agentId: agent.id,
          idempotencyKey: `new-lead-${leadId}`,
          templateData: {
            leadName,
            leadEmail: email.trim().toLowerCase(),
            leadPhone: phone.trim() || undefined,
            nationality: nationality.trim() || undefined,
            courseInterest,
            leadsUrl: `${window.location.origin}/agent/leads`,
          },
        },
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="text-muted-foreground">This application form is not available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Thank you!</h2>
            <p className="text-muted-foreground">
              Your application has been submitted successfully. {agent.full_name} will be in touch soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = agent.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <Avatar className="w-16 h-16 border-2 border-accent">
              {agent.avatar_url ? <AvatarImage src={agent.avatar_url} alt={agent.full_name} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              Apply with {agent.full_name}
            </CardTitle>
            <CardDescription>Fill in your details and we'll get back to you</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} required maxLength={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255} placeholder="your@email.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="+44..." />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Input value={nationality} onChange={e => setNationality(e.target.value)} maxLength={100} placeholder="e.g. British" />
              </div>
            </div>

            {/* Course selection */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium">Course Interest</h4>

              <div className="space-y-2">
                <Label>University</Label>
                <Select value={universityId} onValueChange={setUniversityId}>
                  <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                  <SelectContent>
                    {universities.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {universityId && campuses.length > 0 && (
                <div className="space-y-2">
                  <Label>Campus / Location</Label>
                  <Select value={campusId} onValueChange={setCampusId}>
                    <SelectTrigger><SelectValue placeholder="Select campus..." /></SelectTrigger>
                    <SelectContent>
                      {campuses.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.city ? ` — ${c.city}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {universityId && courses.length > 0 && (
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.level} — {c.study_mode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {universityId && intakes.length > 0 && (
                <div className="space-y-2">
                  <Label>Intake</Label>
                  <Select value={intakeId} onValueChange={setIntakeId}>
                    <SelectTrigger><SelectValue placeholder="Select intake..." /></SelectTrigger>
                    <SelectContent>
                      {intakes.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {universityId && selectedUni?.timetable_available && timetableOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>Timetable Preference</Label>
                  <Select value={timetableOption} onValueChange={setTimetableOption}>
                    <SelectTrigger><SelectValue placeholder="Select timetable..." /></SelectTrigger>
                    <SelectContent>
                      {timetableOptions.map(t => (
                        <SelectItem key={t.id} value={t.label}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUni?.timetable_message && (
                    <p className="text-[10px] text-muted-foreground">{selectedUni.timetable_message}</p>
                  )}
                </div>
              )}
            </div>

            {/* GDPR Consent */}
            <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/50">
              <Checkbox
                id="gdpr"
                checked={gdprConsent}
                onCheckedChange={(v) => setGdprConsent(v === true)}
                className="mt-0.5"
                required
              />
              <label htmlFor="gdpr" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I consent to <strong>{agent.full_name}</strong> and <strong>EduForYou UK</strong> collecting and processing
                my personal data for the purpose of my education enquiry. I understand my data will be stored securely and
                used only to contact me regarding course applications, eligibility, and related services. I can withdraw
                my consent at any time by contacting the agent directly.
              </label>
            </div>

            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting || !gdprConsent}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
