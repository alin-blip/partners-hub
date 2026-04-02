import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { AddressLookupInput } from "@/components/AddressLookupInput";
import { usePresenceMap } from "@/contexts/PresenceContext";

export default function AgentsPage() {
  const { toast } = useToast();
  const presenceMap = usePresenceMap();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<string>("agent");
  const [newPassword, setNewPassword] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [newPostcode, setNewPostcode] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data || [];
    },
  });

  const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
  const admins = profiles.filter((p: any) => roleMap.get(p.id) === "admin");

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-owner", {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
          admin_id: newRole === "agent" && newAdminId ? newAdminId : undefined,
          postcode: newPostcode || undefined,
          address: newAddress || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast({ title: "User created successfully" });
      setOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("agent");
      setNewAdminId("");
      setNewPostcode("");
      setNewAddress("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-profiles"] }),
  });

  const changeRole = useMutation({
    mutationFn: async ({ user_id, new_role }: { user_id: string; new_role: string }) => {
      const { data, error } = await supabase.functions.invoke("create-owner", {
        body: { action: "change_role", user_id, new_role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-1" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRole === "agent" && admins.length > 0 && (
                  <div className="space-y-2">
                    <Label>Assign to Admin</Label>
                    <Select value={newAdminId} onValueChange={setNewAdminId}>
                      <SelectTrigger><SelectValue placeholder="Select admin (optional)" /></SelectTrigger>
                      <SelectContent>
                        {admins.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <AddressLookupInput
                  postcode={newPostcode}
                  address={newAddress}
                  onPostcodeChange={setNewPostcode}
                  onAddressChange={setNewAddress}
                />
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => createUser.mutate()}
                  disabled={!newEmail || !newName || !newPassword || createUser.isPending}
                >
                  {createUser.isPending ? "Creating…" : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Online</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    {(roleMap.get(p.id) as string) === "owner" ? (
                      <Badge variant="secondary" className="capitalize text-xs">owner</Badge>
                    ) : (
                      <Select
                        value={(roleMap.get(p.id) as string) || ""}
                        onValueChange={(val) => changeRole.mutate({ user_id: p.id, new_role: val })}
                        disabled={changeRole.isPending}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${presenceMap[p.id]?.is_online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-xs text-muted-foreground">
                        {presenceMap[p.id]?.is_online
                          ? "Online"
                          : presenceMap[p.id]?.last_seen_at
                            ? formatDistanceToNow(new Date(presenceMap[p.id].last_seen_at), { addSuffix: true })
                            : "Never"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "destructive"} className="text-xs">
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(p.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
