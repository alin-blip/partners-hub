import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmbedManagerPage() {
  return (
    <DashboardLayout allowedRoles={["owner"]}>
      <Card>
        <CardHeader><CardTitle>Embed Manager</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">Coming soon — embed/widget manager is not yet enabled.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
