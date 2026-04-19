import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIEmailGeneratorPage() {
  return (
    <DashboardLayout allowedRoles={["owner", "admin"]}>
      <Card>
        <CardHeader><CardTitle>AI Email Generator</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — AI email sequences are not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
