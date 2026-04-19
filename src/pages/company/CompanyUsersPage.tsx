import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyUsersPage() {
  return (
    <DashboardLayout allowedRoles={["company_admin", "owner"]}>
      <Card>
        <CardHeader><CardTitle>Company Users</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          User management for your company is coming soon.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
