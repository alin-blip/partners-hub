import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CourseDetailsInfoCard } from "@/components/CourseDetailsInfoCard";
import {
  Search,
  Building2,
  Clock,
  CalendarDays,
  PoundSterling,
  GraduationCap,
  Filter,
  ArrowRight,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function UniversitiesCoursesPage() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedUniId, setSelectedUniId] = useState<string | null>(null);
  const [detailsCourseId, setDetailsCourseId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { role } = useAuth();

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

  const activeUniversities = universities.filter((u: any) => u.is_active);
  const displayUniversities = showInactive ? universities : activeUniversities;

  // Auto-select first uni
  const effectiveUniId =
    selectedUniId && displayUniversities.some((u: any) => u.id === selectedUniId)
      ? selectedUniId
      : displayUniversities[0]?.id || null;

  const filteredCourses = courses.filter((c: any) => {
    if (effectiveUniId && c.university_id !== effectiveUniId) return false;
    if (!showInactive && c.is_active === false) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getIntakeLabels = (uniId: string) =>
    intakes
      .filter((i: any) => i.university_id === uniId)
      .map((i: any) => i.label);

  const currentRole = role || "agent";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Universities & Courses
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse available courses and start an application.
          </p>
        </div>

        {/* University tabs */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {displayUniversities.map((uni: any) => {
              const courseCount = courses.filter(
                (c: any) => c.university_id === uni.id && (showInactive || c.is_active !== false)
              ).length;
              return (
                <button
                  key={uni.id}
                  onClick={() => setSelectedUniId(uni.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors ${
                    effectiveUniId === uni.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  {uni.name}
                  {!uni.is_active && (
                    <Badge variant="secondary" className="text-[9px] px-1">Inactive</Badge>
                  )}
                  <Badge
                    variant={effectiveUniId === uni.id ? "secondary" : "outline"}
                    className="text-[10px] ml-1"
                  >
                    {courseCount}
                  </Badge>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {(role === "owner" || role === "admin") && (
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
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">
          {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} available
        </p>

        {/* Course grid */}
        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No courses found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course: any) => {
              const uniIntakes = getIntakeLabels(course.university_id);
              return (
                <Card
                  key={course.id}
                  className="bg-slate-800 border-slate-700 text-white overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-5 flex flex-col gap-3 h-full">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-base leading-tight">
                          {course.name}
                        </h3>
                        {course.is_active === false && (
                          <Badge variant="secondary" className="text-[9px] shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize border-slate-500 text-slate-300"
                        >
                          {course.level}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize border-slate-500 text-slate-300"
                        >
                          {course.study_mode}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-sm text-slate-300">
                        {course.duration && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{course.duration}</span>
                          </div>
                        )}
                        {uniIntakes.length > 0 && (
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate">
                              {uniIntakes.slice(0, 3).join(", ")}
                              {uniIntakes.length > 3 && ` +${uniIntakes.length - 3}`}
                            </span>
                          </div>
                        )}
                        {course.fees && (
                          <div className="flex items-center gap-2">
                            <PoundSterling className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{course.fees}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-slate-500 text-slate-300 hover:bg-slate-700 hover:text-white"
                        onClick={() => setDetailsCourseId(course.id)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() =>
                          navigate(
                            `/${currentRole}/enroll-student?university=${course.university_id}&course=${course.id}`
                          )
                        }
                      >
                        Apply <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Course details dialog */}
        <Dialog
          open={!!detailsCourseId}
          onOpenChange={(open) => !open && setDetailsCourseId(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {courses.find((c: any) => c.id === detailsCourseId)?.name || "Course Details"}
              </DialogTitle>
            </DialogHeader>
            {detailsCourseId && (
              <CourseDetailsInfoCard courseId={detailsCourseId} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
