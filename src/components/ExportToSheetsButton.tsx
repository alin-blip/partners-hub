import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type SheetResult = {
  admin: string;
  url: string;
  agents_count: number;
  students_count: number;
};

export function ExportToSheetsButton() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SheetResult[] | null>(null);
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "export-to-sheets",
        { body: {} }
      );
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Export failed");
      setResults(data.sheets || []);
      setOpen(true);
      toast.success(`Exported ${data.sheets?.length || 0} admin sheet(s)`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {loading ? "Exporting…" : "Export to Google Sheets"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Complete</DialogTitle>
            <DialogDescription>
              One Google Sheet per admin, each containing one tab per agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(results || []).map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{r.admin}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.agents_count} agent(s) · {r.students_count} student(s)
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
            {(results || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No admins to export.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
