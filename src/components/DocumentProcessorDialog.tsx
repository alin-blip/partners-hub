import { useState, useCallback, useRef } from "react";
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
import { Upload, Loader2, FileText, Check, X } from "lucide-react";

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

const ACCEPTED = ".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.webp";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DocumentProcessorDialog({ open, onOpenChange, universities, defaultDocType }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<DocType>(defaultDocType || "courses");
  const [universityId, setUniversityId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState({ done: 0, total: 0 });
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setFiles([]);
    setItems([]);
    setSelected(new Set());
    setProcessing(false);
    setSaving(false);
    setDragOver(false);
    setProcessProgress({ done: 0, total: 0 });
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = arr.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleProcess = async () => {
    if (files.length === 0 || !universityId) return;
    setProcessing(true);
    setProcessProgress({ done: 0, total: files.length });

    const allItems: any[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await readFileAsBase64(file);

        const { data, error } = await supabase.functions.invoke("process-settings-document", {
          body: { file_base64: base64, file_type: file.type, document_type: docType },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || `Processing failed for ${file.name}`);

        const extracted = data.items || [];
        // Tag items with source file for reference
        extracted.forEach((item: any) => { item._source = file.name; });
        allItems.push(...extracted);

        setProcessProgress({ done: i + 1, total: files.length });
      }

      setItems(allItems);
      setSelected(new Set(allItems.map((_: any, i: number) => i)));
      setStep(2);

      if (allItems.length === 0) {
        toast({ title: "No data found", description: "AI could not extract items from the uploaded documents.", variant: "destructive" });
      } else {
        toast({ title: `${allItems.length} items extracted from ${files.length} file(s)` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to process documents", variant: "destructive" });
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
      // Strip internal _source field
      const clean = toInsert.map(({ _source, ...rest }) => rest);

      if (docType === "courses") {
        const rows = clean.map((item) => ({
          university_id: universityId,
          name: item.name,
          level: item.level || "undergraduate",
          study_mode: item.study_mode || "blended",
        }));
        const { error } = await supabase.from("courses").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["all-courses"] });
      } else if (docType === "timetable") {
        const rows = clean.map((item) => ({
          university_id: universityId,
          label: item.label,
        }));
        const { error } = await supabase.from("timetable_options").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["timetable-options"] });
      } else if (docType === "campuses") {
        const rows = clean.map((item) => ({
          university_id: universityId,
          name: item.name,
          city: item.city || null,
        }));
        const { error } = await supabase.from("campuses").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["all-campuses"] });
      } else {
        const rows = clean.map((item) => ({
          university_id: universityId,
          label: item.label,
          start_date: item.start_date,
          application_deadline: item.application_deadline || null,
        }));
        const { error } = await supabase.from("intakes").insert(rows);
        if (error) throw error;
        qc.invalidateQueries({ queryKey: ["all-intakes"] });
      }

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
              <Label>Upload Files (PDF, XLSX, DOCX, Image)</Label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
                  ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED}
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                />
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drag & drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Support for multiple files · PDF, XLSX, DOCX, JPG, PNG
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-1 mt-2">
                  {files.map((f, idx) => (
                    <div key={f.name + f.size} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(idx); }} className="shrink-0 hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleProcess} disabled={files.length === 0 || !universityId || processing} className="w-full">
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing {processProgress.done}/{processProgress.total} files...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Process {files.length > 0 ? `${files.length} Document${files.length > 1 ? "s" : ""}` : "Documents"}
                </>
              )}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {items.length} items from {files.length} file(s). Edit if needed, then select and confirm.
            </p>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selected.size === items.length && items.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  {cols.map((c) => (
                    <TableHead key={c} className="capitalize">{c.replace(/_/g, " ")}</TableHead>
                  ))}
                  <TableHead>Source</TableHead>
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
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{item._source}</span>
                    </TableCell>
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
