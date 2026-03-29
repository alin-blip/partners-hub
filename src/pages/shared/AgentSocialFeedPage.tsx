import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, ExternalLink, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export default function AgentSocialFeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch agent's card settings for share link
  const { data: cardSettings } = useQuery({
    queryKey: ["my-card-settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_card_settings")
        .select("slug, is_public")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch posts assigned to this agent
  const { data: posts = [] } = useQuery({
    queryKey: ["agent-social-feed", user?.id],
    queryFn: async () => {
      const { data: recipients, error: recErr } = await supabase
        .from("social_post_recipients")
        .select("post_id, seen_at")
        .eq("agent_id", user!.id);
      if (recErr) throw recErr;
      if (!recipients || recipients.length === 0) return [];

      const postIds = recipients.map((r: any) => r.post_id);
      const seenMap = Object.fromEntries(recipients.map((r: any) => [r.post_id, r.seen_at]));

      const { data: postData, error: postErr } = await supabase
        .from("social_posts")
        .select("*")
        .in("id", postIds)
        .order("created_at", { ascending: false });
      if (postErr) throw postErr;

      return (postData || []).map((p: any) => ({ ...p, seen_at: seenMap[p.id] }));
    },
    enabled: !!user,
  });

  // Mark as seen
  const markSeen = useMutation({
    mutationFn: async (postId: string) => {
      await supabase
        .from("social_post_recipients")
        .update({ seen_at: new Date().toISOString() })
        .eq("post_id", postId)
        .eq("agent_id", user!.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-social-feed"] }),
  });

  const hasCard = cardSettings?.is_public && cardSettings?.slug;
  const cardUrl = hasCard ? `${window.location.origin}/card/${cardSettings.slug}` : null;

  const handleShare = async (post: any) => {
    if (!hasCard) {
      toast.error("Create your digital card first to share posts");
      return;
    }

    // Mark as seen if not already
    if (!post.seen_at) {
      markSeen.mutate(post.id);
    }

    const shareText = `${post.caption}\n\n🔗 ${cardUrl}`;
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Caption + your card link copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Social Posts</h1>

        {!hasCard && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Set up your digital card first</p>
                <p className="text-xs text-orange-600">You need a public digital card to share posts with your personal link.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/agent/digital-card">Create Card</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No posts yet</p>
            <p className="text-sm">Posts shared by your team will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <Card key={post.id} className={!post.seen_at ? "ring-2 ring-accent" : ""}>
                <CardContent className="p-0">
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full max-h-80 object-cover rounded-t-lg"
                  />
                  <div className="p-4 space-y-3">
                    <p className="text-sm whitespace-pre-wrap">{post.caption}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), "dd MMM yyyy")}
                        {!post.seen_at && (
                          <span className="ml-2 text-accent font-medium">● New</span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShare(post)}
                          disabled={!hasCard}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Share
                        </Button>
                        {hasCard && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                          >
                            <a href={cardUrl!} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> My Card
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
