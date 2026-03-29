import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

type NotificationItem = {
  id: string;
  type: "message" | "task" | "enrollment";
  title: string;
  description: string;
  time: string;
  link: string;
};

export function NotificationBell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-bell", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const items: NotificationItem[] = [];

      // 1. Unread messages
      const { data: convos } = await supabase
        .from("direct_conversations")
        .select("id, participant_1, participant_2")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

      if (convos && convos.length > 0) {
        const convoIds = convos.map((c: any) => c.id);
        const { data: unreadMsgs } = await supabase
          .from("direct_messages")
          .select("id, content, sender_id, created_at, conversation_id")
          .in("conversation_id", convoIds)
          .neq("sender_id", user.id)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(5);

        if (unreadMsgs) {
          // Get sender names
          const senderIds = [...new Set(unreadMsgs.map((m: any) => m.sender_id))];
          const { data: senderProfiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", senderIds);
          const nameMap = Object.fromEntries((senderProfiles || []).map((p: any) => [p.id, p.full_name]));

          unreadMsgs.forEach((msg: any) => {
            items.push({
              id: `msg-${msg.id}`,
              type: "message",
              title: `New message from ${nameMap[msg.sender_id] || "Unknown"}`,
              description: msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content,
              time: msg.created_at,
              link: `${prefix}/messages`,
            });
          });
        }
      }

      // 2. Recent tasks assigned to user (not done)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, priority, created_at")
        .eq("assigned_to", user.id)
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(5);

      if (tasks) {
        tasks.forEach((task: any) => {
          items.push({
            id: `task-${task.id}`,
            type: "task",
            title: `Task: ${task.title}`,
            description: `Priority: ${task.priority}`,
            time: task.created_at,
            link: `${prefix}/tasks`,
          });
        });
      }

      // 3. Recent enrollment status changes (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, status, updated_at, student_id, students(first_name, last_name)")
        .gte("updated_at", sevenDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(5);

      if (enrollments) {
        enrollments.forEach((e: any) => {
          const studentName = e.students ? `${e.students.first_name} ${e.students.last_name}` : "Unknown";
          items.push({
            id: `enroll-${e.id}`,
            type: "enrollment",
            title: `Enrollment updated`,
            description: `${studentName} → ${e.status.replace(/_/g, " ")}`,
            time: e.updated_at,
            link: `${prefix}/students/${e.student_id}`,
          });
        });
      }

      // Sort by time descending
      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return items.slice(0, 15);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const totalCount = notifications.length;

  const typeIcon: Record<string, string> = {
    message: "💬",
    task: "📋",
    enrollment: "🎓",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[16px] h-[16px] px-1">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <p className="text-xs text-muted-foreground">{totalCount} recent items</p>
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => { setOpen(false); navigate(n.link); }}
                >
                  <div className="flex gap-2">
                    <span className="text-sm mt-0.5">{typeIcon[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
