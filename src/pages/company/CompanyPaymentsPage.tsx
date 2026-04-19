import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyPaymentsPage() {
  return (
    <DashboardLayout allowedRoles={["company_admin", "owner"]}>
      <Card>
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">
          Payment history and invoices for your company are coming soon.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
