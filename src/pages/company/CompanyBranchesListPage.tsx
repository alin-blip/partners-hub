import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyBranchesListPage() {
  return (
    <DashboardLayout allowedRoles={["company_admin", "owner"]}>
      <Card>
        <CardHeader><CardTitle>Branches</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          Branch list view coming soon. For now, manage branches from the company dashboard.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
