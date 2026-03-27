import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { Plus, CalendarIcon, GripVertical, Clock } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = { id: string; full_name: string };

const COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-muted" },
  { key: "in_progress", label: "In Progress", color: "bg-accent/10" },
  { key: "done", label: "Done", color: "bg-primary/10" },
] as const;

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "outline" },
  high: { label: "High", variant: "destructive" },
};

export default function TasksPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const canManage = role === "owner" || role === "admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [deadline, setDeadline] = useState<Date | undefined>();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDeadline(undefined);
  };

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  // Fetch agents/profiles for assignment dropdown
  const { data: profiles = [] } = useQuery({
    queryKey: ["task-assignable-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: canManage,
  });

  // Create task
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title,
        description: description || null,
        priority,
        assigned_to: assignedTo || null,
        created_by: user!.id,
        deadline: deadline ? deadline.toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  // Update task status (drag & drop)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error("Failed to update task"),
  });

  // Update full task
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("tasks").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditTask(null);
      toast.success("Task updated");
    },
    onError: () => toast.error("Failed to update task"),
  });

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditTask(null);
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => (map[p.id] = p.full_name));
    return map;
  }, [profiles]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => {
      if (grouped[t.status]) grouped[t.status].push(t);
      else grouped.todo.push(t);
    });
    return grouped;
  }, [tasks]);

  // Drag handlers
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      const task = tasks.find((t) => t.id === draggedId);
      if (task && task.status !== status) {
        updateStatusMutation.mutate({ id: draggedId, status });
      }
    }
    setDraggedId(null);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setAssignedTo(task.assigned_to || "");
    setDeadline(task.deadline ? new Date(task.deadline) : undefined);
  };

  const handleSaveEdit = () => {
    if (!editTask) return;
    if (canManage) {
      updateTaskMutation.mutate({
        id: editTask.id,
        title,
        description: description || null,
        priority,
        assigned_to: assignedTo || null,
        deadline: deadline ? deadline.toISOString() : null,
      });
    } else {
      // Agent can only update status
      updateTaskMutation.mutate({ id: editTask.id, status: editTask.status });
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-sm text-muted-foreground">Manage and track team tasks</p>
          </div>
          {canManage && (
            <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          )}
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="space-y-3">
                <div className="h-8 bg-muted rounded animate-pulse" />
                <div className="h-24 bg-muted rounded animate-pulse" />
                <div className="h-24 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[60vh]">
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={cn("rounded-lg p-3 space-y-3", col.color)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {tasksByStatus[col.key]?.length || 0}
                  </Badge>
                </div>

                {tasksByStatus[col.key]?.map((task) => {
                  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) && task.status !== "done";
                  return (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, task.id)}
                      onClick={() => openEdit(task)}
                      className={cn(
                        "p-3 cursor-pointer hover:shadow-md transition-shadow border",
                        draggedId === task.id && "opacity-50",
                        isOverdue && "border-destructive/50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/40 shrink-0 cursor-grab" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-tight truncate">{task.title}</p>
                            <Badge variant={priorityConfig[task.priority]?.variant || "outline"} className="text-[10px] shrink-0">
                              {priorityConfig[task.priority]?.label || task.priority}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            {task.assigned_to && profileMap[task.assigned_to] ? (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                    {getInitials(profileMap[task.assigned_to])}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                                  {profileMap[task.assigned_to]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                            )}

                            {task.deadline && (
                              <div className={cn("flex items-center gap-1 text-[11px]", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.deadline), "dd MMM")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {(tasksByStatus[col.key]?.length || 0) === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground/60">
                    No tasks
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigned To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {editTask && (
            <div className="space-y-4">
              {canManage ? (
                <>
                  <div>
                    <Label>Title *</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={editTask.status} onValueChange={(v) => setEditTask({ ...editTask, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Assigned To</Label>
                      <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Deadline</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deadline ? format(deadline, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={deadline} onSelect={setDeadline} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium">{editTask.title}</p>
                    {editTask.description && <p className="text-sm text-muted-foreground mt-1">{editTask.description}</p>}
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editTask.status} onValueChange={(v) => setEditTask({ ...editTask, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between">
            {canManage && editTask && (
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(editTask.id)} className="mr-auto">
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!editTask) return;
                  if (canManage) {
                    updateTaskMutation.mutate({
                      id: editTask.id,
                      title,
                      description: description || null,
                      priority,
                      status: editTask.status,
                      assigned_to: assignedTo || null,
                      deadline: deadline ? deadline.toISOString() : null,
                    });
                  } else {
                    updateStatusMutation.mutate({ id: editTask.id, status: editTask.status });
                    setEditTask(null);
                  }
                }}
                disabled={updateTaskMutation.isPending}
              >
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
