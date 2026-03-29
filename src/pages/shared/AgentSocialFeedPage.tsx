import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy, ExternalLink, CreditCard, Share2 } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

export default function AgentSocialFeedPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Fetch agent's card settings + slug for share link
  const { data: cardSettings } = useQuery({
    queryKey: ["my-card-settings", user?.id],
    queryFn: async () => {
      const { data: card } = await supabase
        .from("agent_card_settings")
        .select("is_public")
        .eq("user_id", user!.id)
        .maybeSingle();
      const { data: profile } = await supabase
        .from("profiles")
        .select("slug")
        .eq("id", user!.id)
        .single();
      return { is_public: card?.is_public || false, slug: profile?.slug || null };
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

  const getOgShareUrl = (postId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/og-share?slug=${cardSettings?.slug}&post=${postId}`;
  };

  const copyForPlatform = async (post: any, platform: string) => {
    if (!hasCard) {
      toast.error("Create your digital card first to share posts");
      return;
    }
    if (!post.seen_at) markSeen.mutate(post.id);

    const ogUrl = getOgShareUrl(post.id);
    const shareText = `${post.caption}\n\n🔗 ${cardUrl}`;
    const encodedOgUrl = encodeURIComponent(ogUrl);

    switch (platform) {
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedOgUrl}&quote=${encodeURIComponent(post.caption)}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedOgUrl}`, "_blank");
        break;
      case "instagram":
      case "tiktok":
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success(`Caption + link copied! Paste it in ${platform === "instagram" ? "Instagram" : "TikTok"}.`);
        } catch {
          toast.error("Failed to copy to clipboard");
        }
        break;
      default:
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success("Caption + your card link copied!");
        } catch {
          toast.error("Failed to copy to clipboard");
        }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">Social Posts</h1>

        {!hasCard && (
          <Card className="border-dashed">
            <CardContent className="p-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Set up your digital card first</p>
                <p className="text-xs text-muted-foreground">You need a public digital card to share posts with your personal link.</p>
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
                      <div className="flex gap-1.5 items-center">
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="outline" className="h-8 w-8" disabled={!hasCard} onClick={() => copyForPlatform(post, "facebook")}>
                                <SiFacebook className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on Facebook</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="outline" className="h-8 w-8" disabled={!hasCard} onClick={() => copyForPlatform(post, "instagram")}>
                                <SiInstagram className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy for Instagram</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="outline" className="h-8 w-8" disabled={!hasCard} onClick={() => copyForPlatform(post, "tiktok")}>
                                <SiTiktok className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy for TikTok</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="outline" className="h-8 w-8" disabled={!hasCard} onClick={() => copyForPlatform(post, "linkedin")}>
                                <FaLinkedinIn className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Share on LinkedIn</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {hasCard && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <a href={cardUrl!} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
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
