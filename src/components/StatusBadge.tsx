import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  applied: { label: "Applied", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  documents_submitted: { label: "Documents Submitted", className: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  processing: { label: "Processing", className: "bg-orange-500/10 text-orange-700 border-orange-200" },
  accepted: { label: "Accepted", className: "bg-lime-500/10 text-lime-700 border-lime-200" },
  enrolled: { label: "Enrolled", className: "bg-green-500/10 text-green-700 border-green-200" },
  active: { label: "Active", className: "bg-emerald-600/10 text-emerald-800 border-emerald-300" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-700 border-red-200" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}
