import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const IMMIGRATION_OPTIONS = [
  "Pre-settled",
  "Settled",
  "British Citizen",
  "Visa Holder",
  "Refugee",
  "Other",
];

export default function EnrollStudent() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Form state
  const [universityId, setUniversityId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [immigrationStatus, setImmigrationStatus] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [notes, setNotes] = useState("");

  // Queries for cascading dropdowns
  const { data: universities = [] } = useQuery({
    queryKey: ["universities"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ["campuses", universityId],
    queryFn: async () => {
      const { data } = await supabase.from("campuses").select("*").eq("university_id", universityId).order("name");
      return data || [];
    },
    enabled: !!universityId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", universityId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("university_id", universityId).order("name");
      return data || [];
    },
    enabled: !!universityId,
  });

  const { data: intakes = [] } = useQuery({
    queryKey: ["intakes", universityId],
    queryFn: async () => {
      const { data } = await supabase.from("intakes").select("*").eq("university_id", universityId).order("start_date");
      return data || [];
    },
    enabled: !!universityId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          agent_id: user!.id,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: phone || null,
          date_of_birth: dob || null,
          immigration_status: immigrationStatus || null,
          qualifications: qualifications || null,
          notes: notes || null,
        })
        .select("id")
        .single();

      if (studentError) throw studentError;

      // Create enrollment
      const { error: enrollError } = await supabase.from("enrollments").insert({
        student_id: student.id,
        university_id: universityId,
        campus_id: campusId || null,
        course_id: courseId,
        intake_id: intakeId || null,
        status: "applied",
      });

      if (enrollError) throw enrollError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-students"] });
      queryClient.invalidateQueries({ queryKey: ["agent-enrollments"] });
      toast({ title: "Student enrolled!", description: "The application has been submitted." });
      navigate("/agent/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const canProceedStep1 = universityId && courseId;
  const canProceedStep2 = firstName && lastName;

  const selectedUniversity = universities.find((u: any) => u.id === universityId);
  const selectedCampus = campuses.find((c: any) => c.id === campusId);
  const selectedCourse = courses.find((c: any) => c.id === courseId);
  const selectedIntake = intakes.find((i: any) => i.id === intakeId);

  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  return (
    <DashboardLayout allowedRoles={["agent", "admin", "owner"]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">New Student Enrollment</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? "bg-accent text-accent-foreground"
                    : s < step
                    ? "bg-accent/20 text-accent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-accent" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Academic Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>University *</Label>
                <Select value={universityId} onValueChange={(v) => { setUniversityId(v); setCampusId(""); setCourseId(""); setIntakeId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                  <SelectContent>
                    {universities.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {universityId && (
                <>
                  <div className="space-y-2">
                    <Label>Campus</Label>
                    <Select value={campusId} onValueChange={setCampusId}>
                      <SelectTrigger><SelectValue placeholder="Select campus (optional)" /></SelectTrigger>
                      <SelectContent>
                        {campuses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Course *</Label>
                    <Select value={courseId} onValueChange={setCourseId}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name} ({c.level})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Intake Date</Label>
                    <Select value={intakeId} onValueChange={setIntakeId}>
                      <SelectTrigger><SelectValue placeholder="Select intake (optional)" /></SelectTrigger>
                      <SelectContent>
                        {intakes.map((i: any) => (
                          <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Immigration Status</Label>
                  <Select value={immigrationStatus} onValueChange={setImmigrationStatus}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {IMMIGRATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Qualifications</Label>
                <Textarea value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="Previous qualifications…" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes…" />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Review <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">University</span>
                <span className="font-medium">{selectedUniversity?.name}</span>
                {selectedCampus && (
                  <>
                    <span className="text-muted-foreground">Campus</span>
                    <span className="font-medium">{selectedCampus.name}</span>
                  </>
                )}
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium">{selectedCourse?.name}</span>
                {selectedIntake && (
                  <>
                    <span className="text-muted-foreground">Intake</span>
                    <span className="font-medium">{selectedIntake.label}</span>
                  </>
                )}
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium">{firstName} {lastName}</span>
                {email && (
                  <>
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{email}</span>
                  </>
                )}
                {phone && (
                  <>
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{phone}</span>
                  </>
                )}
                {immigrationStatus && (
                  <>
                    <span className="text-muted-foreground">Immigration</span>
                    <span className="font-medium">{immigrationStatus}</span>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.98]"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit Enrollment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
