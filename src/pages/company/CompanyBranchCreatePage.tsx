import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyBranchCreatePage() {
  return (
    <DashboardLayout allowedRoles={["company_admin", "owner"]}>
      <Card>
        <CardHeader><CardTitle>Create Branch</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — branch management is not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
