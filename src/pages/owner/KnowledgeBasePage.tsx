
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, GraduationCap, Palette, Settings2, Globe, FileText } from "lucide-react";

const CATEGORIES = [
  { value: "courses", label: "Courses", icon: GraduationCap },
  { value: "brand", label: "Brand", icon: Palette },
  { value: "processes", label: "Processes", icon: Settings2 },
  { value: "immigration", label: "Immigration", icon: Globe },
  { value: "general", label: "General", icon: FileText },
] as const;

type KBEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  created_by: string | null;
};

export default function KnowledgeBasePage() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ai-knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KBEntry[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_knowledge_base").insert({
        title: title.trim(),
        content: content.trim(),
        category,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      toast.success("Knowledge entry added");
      setTitle("");
      setContent("");
      setCategory("general");
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-knowledge-base"] });
      toast.success("Entry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canManage = role === "owner" || role === "admin";

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Knowledge Base</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage content that feeds into the AI assistant's knowledge
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Knowledge
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Knowledge Entry</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!title.trim() || !content.trim()) return;
                  addMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. University of London — Course List" required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste course details, brand guidelines, process steps, etc."
                    rows={10}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Saving…" : "Save Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
          {CATEGORIES.map((c) => {
            const count = entries.filter((e) => e.category === c.value).length;
            return (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {["all", ...CATEGORIES.map((c) => c.value)].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {entries
                  .filter((e) => tab === "all" || e.category === tab)
                  .map((entry) => {
                    const cat = CATEGORIES.find((c) => c.value === entry.category);
                    const Icon = cat?.icon || FileText;
                    return (
                      <Card key={entry.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <CardTitle className="text-sm">{entry.title}</CardTitle>
                            </div>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteMutation.mutate(entry.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          <CardDescription className="text-xs capitalize">{entry.category}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-6">
                            {entry.content}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                {entries.filter((e) => tab === "all" || e.category === tab).length === 0 && (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No knowledge entries in this category yet.</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
