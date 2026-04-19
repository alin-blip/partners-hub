import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompaniesPage() {
  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <Card>
        <CardHeader><CardTitle>Companies</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — company management is not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
