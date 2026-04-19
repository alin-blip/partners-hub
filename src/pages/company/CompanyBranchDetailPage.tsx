import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyBranchDetailPage() {
  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <Card>
        <CardHeader><CardTitle>Branch Details</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — branch management is not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
