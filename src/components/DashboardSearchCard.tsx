import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, GraduationCap, Building2 } from "lucide-react";

export function DashboardSearchCard() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { role } = useAuth();
  const currentRole = role || "agent";

  const { data: courses = [] } = useQuery({
    queryKey: ["courses-all"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: universities = [] } = useQuery({
    queryKey: ["universities-all"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("*").order("name");
      return data || [];
    },
  });

  const uniMap = new Map(universities.map((u: any) => [u.id, u.name]));

  const filtered = search.trim().length < 2
    ? []
    : courses
        .filter((c: any) => {
          const term = search.toLowerCase();
          const uniName = (uniMap.get(c.university_id) || "").toLowerCase();
          return (
            c.name.toLowerCase().includes(term) ||
            uniName.includes(term) ||
            c.level?.toLowerCase().includes(term) ||
            c.study_mode?.toLowerCase().includes(term) ||
            c.duration?.toLowerCase().includes(term)
          );
        })
        .slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Quick Course Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, universities, study modes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length > 0 && (
          <div className="space-y-1.5">
            {filtered.map((course: any) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{course.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {uniMap.get(course.university_id) || "Unknown"}
                    </span>
                    <Badge variant="outline" className="text-[9px] capitalize ml-1">
                      {course.level}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {course.study_mode}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0 h-7 text-xs"
                  onClick={() =>
                    navigate(
                      `/${currentRole}/enroll?university=${course.university_id}&course=${course.id}`
                    )
                  }
                >
                  Apply <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
            <Button
              variant="link"
              size="sm"
              className="text-xs px-0"
              onClick={() => navigate(`/${currentRole}/universities?search=${encodeURIComponent(search)}`)}
            >
              View all results →
            </Button>
          </div>
        )}

        {search.trim().length >= 2 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">No courses found</p>
        )}
      </CardContent>
    </Card>
  );
}
