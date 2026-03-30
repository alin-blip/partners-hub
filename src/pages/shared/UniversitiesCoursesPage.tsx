import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CourseDetailsInfoCard } from "@/components/CourseDetailsInfoCard";
import {
  Search,
  Building2,
  MapPin,
  BookOpen,
  CalendarDays,
  Clock,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function UniversitiesCoursesPage() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: universities = [] } = useQuery({
    queryKey: ["universities-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("universities")
        .select("*")
        .order("name");
      return data || [];
    },
  });

  const { data: campuses = [] } = useQuery({
    queryKey: ["campuses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("campuses").select("*").order("name");
      return data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("name");
      return data || [];
    },
  });

  const { data: intakes = [] } = useQuery({
    queryKey: ["intakes-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("intakes")
        .select("*")
        .order("start_date", { ascending: false });
      return data || [];
    },
  });

  const { data: timetableOptions = [] } = useQuery({
    queryKey: ["timetable-options-all"],
    queryFn: async () => {
      const { data } = await supabase.from("timetable_options").select("*").order("label");
      return data || [];
    },
  });

  const { data: courseTimetableGroups = [] } = useQuery({
    queryKey: ["course-timetable-groups-all"],
    queryFn: async () => {
      const { data } = await supabase.from("course_timetable_groups").select("*");
      return data || [];
    },
  });

  const filtered = universities.filter((u) => {
    if (!showInactive && !u.is_active) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCampuses = (uniId: string) => campuses.filter((c) => c.university_id === uniId);
  const getCourses = (uniId: string) => courses.filter((c) => c.university_id === uniId);
  const getIntakes = (uniId: string) => intakes.filter((i) => i.university_id === uniId);
  const getTimetables = (uniId: string) => timetableOptions.filter((t) => t.university_id === uniId);
  const getCourseTimetables = (courseId: string) => {
    const groupIds = courseTimetableGroups
      .filter((g) => g.course_id === courseId)
      .map((g) => g.timetable_option_id);
    return timetableOptions.filter((t) => groupIds.includes(t.id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Universities & Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse all universities, campuses, courses, intakes and timetable options.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search universities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="text-sm cursor-pointer">
              Show inactive
            </Label>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {universities.length} universities
        </p>

        {/* Accordion list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No universities found.
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map((uni) => {
              const uniCampuses = getCampuses(uni.id);
              const uniCourses = getCourses(uni.id);
              const uniIntakes = getIntakes(uni.id);
              const uniTimetables = getTimetables(uni.id);

              return (
                <AccordionItem
                  key={uni.id}
                  value={uni.id}
                  className="border rounded-lg bg-card px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 text-left flex-1">
                      <Building2 className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-base">{uni.name}</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant={uni.is_active ? "default" : "secondary"} className="text-[10px]">
                            {uni.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {uniCampuses.length} campus{uniCampuses.length !== 1 ? "es" : ""}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {uniCourses.length} course{uniCourses.length !== 1 ? "s" : ""}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {uniIntakes.length} intake{uniIntakes.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-4 space-y-6">
                    {/* Timetable message */}
                    {uni.timetable_available && uni.timetable_message && (
                      <div className="rounded-md bg-accent/10 border border-accent/20 p-3 text-sm text-accent-foreground">
                        <Clock className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                        {uni.timetable_message}
                      </div>
                    )}

                    {/* Campuses */}
                    {uniCampuses.length > 0 && (
                      <Section icon={MapPin} title="Campuses">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>City</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uniCampuses.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell className="text-muted-foreground">{c.city || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Section>
                    )}

                    {/* Courses */}
                    {uniCourses.length > 0 && (
                      <Section icon={BookOpen} title="Courses">
                        <div className="space-y-2">
                          {uniCourses.map((course) => (
                            <CourseRow
                              key={course.id}
                              course={course}
                              timetables={getCourseTimetables(course.id)}
                            />
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Intakes */}
                    {uniIntakes.length > 0 && (
                      <Section icon={CalendarDays} title="Intakes">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Label</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>Application Deadline</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uniIntakes.map((intake) => (
                              <TableRow key={intake.id}>
                                <TableCell className="font-medium">{intake.label}</TableCell>
                                <TableCell>{formatDate(intake.start_date)}</TableCell>
                                <TableCell>
                                  {intake.application_deadline
                                    ? formatDate(intake.application_deadline)
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Section>
                    )}

                    {/* Timetable Options */}
                    {uniTimetables.length > 0 && (
                      <Section icon={Clock} title="Timetable Options">
                        <div className="flex flex-wrap gap-2">
                          {uniTimetables.map((t) => (
                            <Badge key={t.id} variant="secondary">
                              {t.label}
                            </Badge>
                          ))}
                        </div>
                      </Section>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </DashboardLayout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function CourseRow({
  course,
  timetables,
}: {
  course: { id: string; name: string; level: string; study_mode: string };
  timetables: { id: string; label: string }[];
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full rounded-md border px-3 py-2.5 text-left hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{course.name}</span>
          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
            {course.level}
          </Badge>
          <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
            {course.study_mode}
          </Badge>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-3 space-y-3">
        <CourseDetailsInfoCard courseId={course.id} compact />
        {timetables.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Timetable Options</p>
            <div className="flex flex-wrap gap-1.5">
              {timetables.map((t) => (
                <Badge key={t.id} variant="secondary" className="text-[10px]">
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {timetables.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No course details or timetables available.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatDate(d: string) {
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return d;
  }
}
