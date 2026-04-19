import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyDashboard() {
  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <Card>
        <CardHeader><CardTitle>Company Dashboard</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — company features are not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
