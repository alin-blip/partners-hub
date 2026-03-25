import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AgentDashboard from "./pages/agent/AgentDashboard";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AgentsPage from "./pages/owner/AgentsPage";
import SettingsPage from "./pages/owner/SettingsPage";
import KnowledgeBasePage from "./pages/owner/KnowledgeBasePage";
import AIMonitoringPage from "./pages/owner/AIMonitoringPage";
import CommissionsPage from "./pages/owner/CommissionsPage";
import StudentsPage from "./pages/shared/StudentsPage";
import EnrollmentsPage from "./pages/shared/EnrollmentsPage";
import StudentDetailPage from "./pages/shared/StudentDetailPage";
import ProfilePage from "./pages/shared/ProfilePage";
import ResourcesPage from "./pages/shared/ResourcesPage";
import CreateImagePage from "./pages/shared/CreateImagePage";
import DocumentsPage from "./pages/owner/DocumentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            
            {/* Owner routes */}
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
            <Route path="/owner/students" element={<StudentsPage />} />
            <Route path="/owner/students/:id" element={<StudentDetailPage />} />
            <Route path="/owner/enrollments" element={<EnrollmentsPage />} />
            <Route path="/owner/agents" element={<AgentsPage />} />
            <Route path="/owner/settings" element={<SettingsPage />} />
            <Route path="/owner/commissions" element={<CommissionsPage />} />
            <Route path="/owner/knowledge-base" element={<KnowledgeBasePage />} />
            <Route path="/owner/ai-monitoring" element={<AIMonitoringPage />} />
            
            <Route path="/owner/profile" element={<ProfilePage />} />
            <Route path="/owner/resources" element={<ResourcesPage />} />
            <Route path="/owner/create-image" element={<CreateImagePage />} />
            <Route path="/owner/documents" element={<DocumentsPage />} />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/students/:id" element={<StudentDetailPage />} />
            <Route path="/admin/enrollments" element={<EnrollmentsPage />} />
            <Route path="/admin/agents" element={<AdminAgentsPage />} />
            <Route path="/admin/enroll" element={<EnrollStudent />} />
            <Route path="/admin/profile" element={<ProfilePage />} />
            <Route path="/admin/resources" element={<ResourcesPage />} />
            <Route path="/admin/create-image" element={<CreateImagePage />} />
            <Route path="/admin/documents" element={<DocumentsPage />} />
            
            {/* Agent routes */}
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
            <Route path="/agent/students" element={<StudentsPage />} />
            <Route path="/agent/students/:id" element={<StudentDetailPage />} />
            <Route path="/agent/enrollments" element={<EnrollmentsPage />} />
            <Route path="/agent/enroll" element={<EnrollStudent />} />
            <Route path="/agent/profile" element={<ProfilePage />} />
            <Route path="/agent/resources" element={<ResourcesPage />} />
            <Route path="/agent/create-image" element={<CreateImagePage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
