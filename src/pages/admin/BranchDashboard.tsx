import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BranchDashboard() {
  return (
    <DashboardLayout allowedRoles={["admin"]}>
      <Card>
        <CardHeader><CardTitle>Branch Dashboard</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — B2B branch features are not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
