import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Send, Upload, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";

export default function SocialPostsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<"all" | "team" | "select">("all");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  // Fetch agents for selector
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-for-posts", role],
    queryFn: async () => {
      let query = supabase.from("profiles").select("id, full_name, email, admin_id");
      if (role === "admin") {
        query = query.eq("admin_id", user!.id);
      }
      const { data, error } = await query.order("full_name");
      if (error) throw error;
      // Filter to only agents (exclude self)
      return (data || []).filter((p: any) => p.id !== user?.id);
    },
    enabled: isOwnerOrAdmin && !!user,
  });

  // Fetch existing posts
  const { data: posts = [] } = useQuery({
    queryKey: ["social-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePublish = async () => {
    if (!imageFile || !caption.trim()) {
      toast.error("Please add an image and caption");
      return;
    }
    setPublishing(true);
    try {
      // Upload image
      const ext = imageFile.name.split(".").pop();
      const filePath = `social-posts/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("generated-images")
        .upload(filePath, imageFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("generated-images")
        .getPublicUrl(filePath);

      // Create post
      const { data: post, error: postErr } = await supabase
        .from("social_posts")
        .insert({
          created_by: user!.id,
          image_url: urlData.publicUrl,
          caption: caption.trim(),
          target_role: targetMode,
        })
        .select()
        .single();
      if (postErr) throw postErr;

      // Determine recipients
      let recipientIds: string[] = [];
      if (targetMode === "all") {
        recipientIds = agents.map((a: any) => a.id);
      } else if (targetMode === "team") {
        recipientIds = agents.filter((a: any) => a.admin_id === user!.id).map((a: any) => a.id);
      } else {
        recipientIds = selectedAgents;
      }

      // Also include admins if owner sends to "all"
      if (role === "owner" && targetMode === "all") {
        // agents list already has everyone
      }

      if (recipientIds.length > 0) {
        const recipientRows = recipientIds.map((agentId) => ({
          post_id: post.id,
          agent_id: agentId,
        }));
        const { error: recErr } = await supabase
          .from("social_post_recipients")
          .insert(recipientRows);
        if (recErr) throw recErr;
      }

      toast.success(`Post published to ${recipientIds.length} recipient(s)`);
      setCaption("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedAgents([]);
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("social_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["social-posts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isOwnerOrAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-muted-foreground">
          You don't have access to create social posts.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Social Posts</h1>

        {/* Create Post Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image</Label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-64 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption for your post…"
                rows={3}
              />
            </div>

            {/* Target selector */}
            <div className="space-y-2">
              <Label>Send to</Label>
              <Select value={targetMode} onValueChange={(v: any) => setTargetMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  {role === "admin" && <SelectItem value="team">My team</SelectItem>}
                  <SelectItem value="select">Select individually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual selection */}
            {targetMode === "select" && (
              <ScrollArea className="max-h-48 border rounded-lg p-3">
                <div className="space-y-2">
                  {agents.map((agent: any) => (
                    <label key={agent.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAgents(checked
                            ? [...selectedAgents, agent.id]
                            : selectedAgents.filter((id) => id !== agent.id)
                          );
                        }}
                      />
                      <span className="text-sm">{agent.full_name}</span>
                      <span className="text-xs text-muted-foreground">{agent.email}</span>
                    </label>
                  ))}
                  {agents.length === 0 && (
                    <p className="text-sm text-muted-foreground">No agents found</p>
                  )}
                </div>
              </ScrollArea>
            )}

            <Button
              onClick={handlePublish}
              disabled={publishing || !imageFile || !caption.trim()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {publishing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              {publishing ? "Publishing…" : "Publish Post"}
            </Button>
          </CardContent>
        </Card>

        {/* Published Posts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Published Posts</h2>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No posts yet</p>
          ) : (
            posts.map((post: any) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), "dd MMM yyyy HH:mm")}
                        </span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                          {post.target_role === "all" ? "All agents" : post.target_role}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
