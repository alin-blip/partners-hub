import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Loader2, FileText, Check } from "lucide-react";

type DocType = "courses" | "timetable" | "campuses" | "intakes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  universities: { id: string; name: string }[];
  defaultDocType?: DocType;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  courses: "Courses",
  timetable: "Timetable Options",
  campuses: "Campuses",
  intakes: "Intakes",
};

const COLUMNS: Record<DocType, string[]> = {
  courses: ["name", "level", "study_mode"],
  timetable: ["label"],
  campuses: ["name", "city"],
  intakes: ["label", "start_date", "application_deadline"],
};

export function DocumentProcessorDialog({ open, onOpenChange, universities, defaultDocType }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<DocType>(defaultDocType || "courses");
  const [universityId, setUniversityId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(1);
    setFile(null);
    setItems([]);
    setSelected(new Set());
    setProcessing(false);
    setSaving(false);
  };

  const handleProcess = async () => {
    if (!file || !universityId) return;
    setProcessing(true);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("process-settings-document", {
        body: { file_base64: base64, file_type: file.type, document_type: docType },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Processing failed");

      const extracted = data.items || [];
      setItems(extracted);
      setSelected(new Set(extracted.map((_: any, i: number) => i)));
      setStep(2);

      if (extracted.length === 0) {
        toast({ title: "No data found", description: "AI could not extract items from this document.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to process document", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((_, i) => i)));
  };

  const updateItem = (idx: number, field: string, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    const toInsert = items.filter((_, i) => selected.has(i));
    if (toInsert.length === 0) return;
    setSaving(true);

    try {
      let tableName: string;
      let queryKey: string;

      if (docType === "courses") {
        tableName = "courses";
        queryKey = "all-courses";
        const rows = toInsert.map((item) => ({
          university_id: universityId,
          name: item.name,
          level: item.level || "undergraduate",
          study_mode: item.study_mode || "blended",
        }));
        const { error } = await supabase.from("courses").insert(rows);
        if (error) throw error;
      } else if (docType === "timetable") {
        tableName = "timetable_options";
        queryKey = "timetable-options";
        const rows = toInsert.map((item) => ({
          university_id: universityId,
          label: item.label,
        }));
        const { error } = await supabase.from("timetable_options").insert(rows);
        if (error) throw error;
      } else if (docType === "campuses") {
        tableName = "campuses";
        queryKey = "all-campuses";
        const rows = toInsert.map((item) => ({
          university_id: universityId,
          name: item.name,
          city: item.city || null,
        }));
        const { error } = await supabase.from("campuses").insert(rows);
        if (error) throw error;
      } else {
        tableName = "intakes";
        queryKey = "all-intakes";
        const rows = toInsert.map((item) => ({
          university_id: universityId,
          label: item.label,
          start_date: item.start_date,
          application_deadline: item.application_deadline || null,
        }));
        const { error } = await supabase.from("intakes").insert(rows);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${toInsert.length} items added successfully` });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cols = COLUMNS[docType];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Import from Document"}
            {step === 2 && "Review Extracted Data"}
            {step === 3 && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>University</Label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload File (PDF, XLSX, DOCX, Image)</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <Button onClick={handleProcess} disabled={!file || !universityId || processing} className="w-full">
              {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing with AI...</> : <><Upload className="h-4 w-4" /> Process Document</>}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {items.length} items. Edit if needed, then select and confirm.
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === items.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  {cols.map((c) => (
                    <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Checkbox checked={selected.has(idx)} onCheckedChange={() => toggleSelect(idx)} />
                    </TableCell>
                    {cols.map((col) => (
                      <TableCell key={col}>
                        <Input
                          value={item[col] || ""}
                          onChange={(e) => updateItem(idx, col, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSave} disabled={selected.size === 0 || saving}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Add {selected.size} Selected</>}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-lg font-medium">Import Complete!</p>
            <p className="text-sm text-muted-foreground">Data has been added to your platform settings.</p>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
