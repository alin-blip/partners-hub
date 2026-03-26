import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [courseInterest, setCourseInterest] = useState("");

  // Universities for dropdown
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("slug", slug)
        .single();

      if (!prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check card is published
      const { data: card } = await supabase
        .from("agent_card_settings")
        .select("is_public")
        .eq("user_id", prof.id)
        .eq("is_public", true)
        .single();

      if (!card) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setAgent(prof);

      // Fetch universities
      const { data: unis } = await supabase
        .from("universities")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setUniversities(unis || []);

      setLoading(false);
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setSubmitting(true);

    const { error } = await supabase.from("leads").insert({
      agent_id: agent.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      nationality: nationality.trim() || null,
      course_interest: courseInterest || null,
      status: "new",
    } as any);

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
    }
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
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="+44..." />
            </div>
            <div className="space-y-2">
              <Label>Nationality</Label>
              <Input value={nationality} onChange={e => setNationality(e.target.value)} maxLength={100} placeholder="e.g. British" />
            </div>
            <div className="space-y-2">
              <Label>Course Interest</Label>
              {universities.length > 0 ? (
                <Select value={courseInterest} onValueChange={setCourseInterest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a university..." />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map(u => (
                      <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={courseInterest} onChange={e => setCourseInterest(e.target.value)} maxLength={200} placeholder="What course are you interested in?" />
              )}
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              By submitting this form you agree to be contacted by {agent.full_name} regarding your education enquiry.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
