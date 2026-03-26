import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UserCog,
  Settings,
  LogOut,
  GraduationCap,
  PoundSterling,
  UserCircle,
  FolderOpen,
  Brain,
  MessageSquare,
  Image as ImageIcon,
  Mail,
  MessageSquareHeart,
} from "lucide-react";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: React.ElementType; badge?: number };

function SidebarNavGroup({ label, items, collapsed }: { label: string; items: NavItem[]; collapsed: boolean }) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest px-4 pt-4 pb-1">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url.endsWith("dashboard")}
                  className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span className="flex-1">{item.title}</span>}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  const mainItems: NavItem[] = [
    { title: "Dashboard", url: `${prefix}/dashboard`, icon: LayoutDashboard },
    { title: "Students", url: `${prefix}/students`, icon: Users },
    { title: "Enrollments", url: `${prefix}/enrollments`, icon: ClipboardList },
    { title: "Messages", url: `${prefix}/messages`, icon: Mail },
  ];


  const actionItems: NavItem[] = [
    { title: "Create Image", url: `${prefix}/create-image`, icon: ImageIcon },
    { title: "Resources", url: `${prefix}/resources`, icon: FolderOpen },
  ];

  const managementItems: NavItem[] = role === "owner" ? [
    { title: "Agents", url: "/owner/agents", icon: UserCog },
    { title: "Commissions", url: "/owner/commissions", icon: PoundSterling },
    { title: "Knowledge Base", url: "/owner/knowledge-base", icon: Brain },
    { title: "AI Monitoring", url: "/owner/ai-monitoring", icon: MessageSquare },
    { title: "Feedback", url: "/owner/feedback", icon: MessageSquareHeart },
    { title: "Settings", url: "/owner/settings", icon: Settings },
  ] : [];

  const teamItems: NavItem[] = role === "admin" ? [
    { title: "My Agents", url: "/admin/agents", icon: UserCog },
  ] : [];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        {/* Brand header */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-4 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sidebar-primary" />
              {!collapsed && <span className="font-bold text-sm tracking-tight text-sidebar-foreground">EduForYou UK</span>}
            </div>
          </SidebarGroupLabel>
        </SidebarGroup>

        <SidebarNavGroup label="Main" items={mainItems} collapsed={collapsed} />
        <SidebarNavGroup label="Actions" items={actionItems} collapsed={collapsed} />
        <SidebarNavGroup label="Management" items={managementItems} collapsed={collapsed} />
        <SidebarNavGroup label="Team" items={teamItems} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="bg-sidebar text-sidebar-foreground border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to={`${prefix}/profile`}
                className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
              >
                <UserCircle className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Profile</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && profile && (
          <div className="mb-1 mt-1 px-1">
            <p className="text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
        <FeedbackDialog />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
