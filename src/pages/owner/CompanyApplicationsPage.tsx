import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyApplicationsPage() {
  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <Card>
        <CardHeader><CardTitle>Company Applications</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — company applications are not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
