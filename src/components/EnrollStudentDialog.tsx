import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

const IMMIGRATION_OPTIONS = [
  "Pre-settled", "Settled", "British Citizen", "Visa Holder", "Refugee", "Other",
];
const TITLE_OPTIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Other"];
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const STUDY_PATTERNS = ["Weekdays", "Weekend", "Evenings"];
const RELATIONSHIP_OPTIONS = ["Parent", "Spouse", "Sibling", "Friend", "Other"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnrollStudentDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1 — Institution
  const [universityId, setUniversityId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [studyPattern, setStudyPattern] = useState<string[]>([]);

  // Step 2 — Applicant
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [ukEntryDate, setUkEntryDate] = useState("");
  const [immigrationStatus, setImmigrationStatus] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [niNumber, setNiNumber] = useState("");
  const [previousFundingYears, setPreviousFundingYears] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3 — Next of Kin
  const [nokName, setNokName] = useState("");
  const [nokPhone, setNokPhone] = useState("");
  const [nokRelationship, setNokRelationship] = useState("");

  const resetForm = () => {
    setStep(1);
    setUniversityId(""); setCampusId(""); setCourseId(""); setIntakeId(""); setStudyPattern([]);
    setTitle(""); setFirstName(""); setLastName(""); setNationality(""); setGender("");
    setDob(""); setEmail(""); setPhone(""); setFullAddress("");
    setUkEntryDate(""); setImmigrationStatus(""); setShareCode(""); setNiNumber("");
    setPreviousFundingYears(""); setQualifications(""); setNotes("");
    setNokName(""); setNokPhone(""); setNokRelationship("");
  };

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
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          agent_id: user!.id,
          title: title || null,
          first_name: firstName,
          last_name: lastName,
          nationality: nationality || null,
          gender: gender || null,
          email: email || null,
          phone: phone || null,
          date_of_birth: dob || null,
          full_address: fullAddress || null,
          uk_entry_date: ukEntryDate || null,
          immigration_status: immigrationStatus || null,
          share_code: shareCode || null,
          ni_number: niNumber || null,
          previous_funding_years: previousFundingYears ? parseInt(previousFundingYears) : null,
          study_pattern: studyPattern.length > 0 ? studyPattern.join(", ") : null,
          qualifications: qualifications || null,
          notes: notes || null,
          next_of_kin_name: nokName || null,
          next_of_kin_phone: nokPhone || null,
          next_of_kin_relationship: nokRelationship || null,
        } as any)
        .select("id")
        .single();
      if (studentError) throw studentError;

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
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      queryClient.invalidateQueries({ queryKey: ["agent-students"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["agent-enrollments"] });
      toast.success("Student enrolled successfully!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canProceedStep1 = universityId && courseId;
  const canProceedStep2 = firstName && lastName;

  const selectedUniversity = universities.find((u: any) => u.id === universityId);
  const selectedCampus = campuses.find((c: any) => c.id === campusId);
  const selectedCourse = courses.find((c: any) => c.id === courseId);
  const selectedIntake = intakes.find((i: any) => i.id === intakeId);

  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Student Enrollment</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pb-2">
          {[1, 2, 3, 4].map((s) => (
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
              {s < totalSteps && <div className={`w-8 h-0.5 ${s < step ? "bg-accent" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Institution & Course */}
        {step === 1 && (
          <div className="space-y-4">
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
                <div className="space-y-2">
                  <Label>Study Pattern</Label>
                  {(selectedUniversity as any)?.timetable_available === false ? (
                    <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground border">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {(selectedUniversity as any)?.timetable_message || "Timetable will be assigned by the university."}
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      {STUDY_PATTERNS.map((sp) => (
                        <label key={sp} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={studyPattern.includes(sp)}
                            onCheckedChange={(checked) => {
                              setStudyPattern(checked
                                ? [...studyPattern, sp]
                                : studyPattern.filter((p) => p !== sp)
                              );
                            }}
                          />
                          {sp}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Applicant Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger><SelectValue placeholder="Title" /></SelectTrigger>
                  <SelectContent>
                    {TITLE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Nationality</Label>
                <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. British" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mobile No</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44..." />
              </div>
              <div className="space-y-2">
                <Label>UK Entry Date</Label>
                <Input type="date" value={ukEntryDate} onChange={(e) => setUkEntryDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full UK Address</Label>
              <Textarea value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="Full address..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Sharecode (Settle/Presettle)</Label>
                <Input value={shareCode} onChange={(e) => setShareCode(e.target.value)} placeholder="Share code" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>National Insurance Number (NINo)</Label>
                <Input value={niNumber} onChange={(e) => setNiNumber(e.target.value)} placeholder="e.g. QQ 12 34 56 C" />
              </div>
              <div className="space-y-2">
                <Label>Previous Funding (years)</Label>
                <Input type="number" min="0" value={previousFundingYears} onChange={(e) => setPreviousFundingYears(e.target.value)} placeholder="0" />
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
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Next of Kin */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Next of Kin Details</h3>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={nokName} onChange={(e) => setNokName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telephone Number</Label>
                <Input value={nokPhone} onChange={(e) => setNokPhone(e.target.value)} placeholder="+44..." />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select value={nokRelationship} onValueChange={setNokRelationship}>
                  <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                Review <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Review & Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Institution & Course</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
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
              {studyPattern.length > 0 && (
                <>
                  <span className="text-muted-foreground">Study Pattern</span>
                  <span className="font-medium">{studyPattern.join(", ")}</span>
                </>
              )}
            </div>

            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Applicant Details</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{title ? `${title} ` : ""}{firstName} {lastName}</span>
              {nationality && (
                <>
                  <span className="text-muted-foreground">Nationality</span>
                  <span className="font-medium">{nationality}</span>
                </>
              )}
              {gender && (
                <>
                  <span className="text-muted-foreground">Gender</span>
                  <span className="font-medium">{gender}</span>
                </>
              )}
              {dob && (
                <>
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">{dob}</span>
                </>
              )}
              {email && (
                <>
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{email}</span>
                </>
              )}
              {phone && (
                <>
                  <span className="text-muted-foreground">Mobile</span>
                  <span className="font-medium">{phone}</span>
                </>
              )}
              {fullAddress && (
                <>
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium">{fullAddress}</span>
                </>
              )}
              {ukEntryDate && (
                <>
                  <span className="text-muted-foreground">UK Entry Date</span>
                  <span className="font-medium">{ukEntryDate}</span>
                </>
              )}
              {immigrationStatus && (
                <>
                  <span className="text-muted-foreground">Immigration</span>
                  <span className="font-medium">{immigrationStatus}</span>
                </>
              )}
              {shareCode && (
                <>
                  <span className="text-muted-foreground">Share Code</span>
                  <span className="font-medium">{shareCode}</span>
                </>
              )}
              {niNumber && (
                <>
                  <span className="text-muted-foreground">NI Number</span>
                  <span className="font-medium">{niNumber}</span>
                </>
              )}
              {previousFundingYears && (
                <>
                  <span className="text-muted-foreground">Previous Funding</span>
                  <span className="font-medium">{previousFundingYears} year(s)</span>
                </>
              )}
            </div>

            {(nokName || nokPhone || nokRelationship) && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Next of Kin</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {nokName && (
                    <>
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{nokName}</span>
                    </>
                  )}
                  {nokPhone && (
                    <>
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">{nokPhone}</span>
                    </>
                  )}
                  {nokRelationship && (
                    <>
                      <span className="text-muted-foreground">Relationship</span>
                      <span className="font-medium">{nokRelationship}</span>
                    </>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {submitMutation.isPending ? "Submitting…" : "Submit Enrollment"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
