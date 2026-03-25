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
  UserPlus,
  FolderOpen,
  Brain,
  MessageSquare,
  ImageIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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

export function AppSidebar() {
  const { role, profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const prefix = role === "owner" ? "/owner" : role === "admin" ? "/admin" : "/agent";

  const navItems = [
    { title: "Dashboard", url: `${prefix}/dashboard`, icon: LayoutDashboard },
    { title: "Students", url: `${prefix}/students`, icon: Users },
    { title: "Enrollments", url: `${prefix}/enrollments`, icon: ClipboardList },
  ];

  if (role === "owner") {
    navItems.push(
      { title: "Agents", url: "/owner/agents", icon: UserCog },
      { title: "Commissions", url: "/owner/commissions", icon: PoundSterling },
      { title: "Knowledge Base", url: "/owner/knowledge-base", icon: Brain },
      { title: "AI Monitoring", url: "/owner/ai-monitoring", icon: MessageSquare },
      { title: "Settings", url: "/owner/settings", icon: Settings }
    );
  }

  if (role === "admin") {
    navItems.push(
      { title: "My Agents", url: "/admin/agents", icon: UserCog },
      { title: "Knowledge Base", url: "/admin/knowledge-base", icon: Brain },
      { title: "AI Monitoring", url: "/admin/ai-monitoring", icon: MessageSquare }
    );
  }

  navItems.push(
    { title: "Enroll Student", url: `${prefix}/enroll`, icon: UserPlus },
    { title: "Resources", url: `${prefix}/resources`, icon: FolderOpen },
    { title: "Profile", url: `${prefix}/profile`, icon: UserCircle }
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 px-4 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sidebar-primary" />
              {!collapsed && <span className="font-bold text-sm tracking-tight text-sidebar-foreground">EduForYou UK</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url.endsWith("dashboard")}
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar text-sidebar-foreground border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{profile.email}</p>
          </div>
        )}
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
