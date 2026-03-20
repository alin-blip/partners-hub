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
import EnrollStudent from "./pages/agent/EnrollStudent";
import AdminAgentsPage from "./pages/admin/AdminAgentsPage";
import AgentsPage from "./pages/owner/AgentsPage";
import SettingsPage from "./pages/owner/SettingsPage";
import StudentsPage from "./pages/shared/StudentsPage";
import EnrollmentsPage from "./pages/shared/EnrollmentsPage";
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
            <Route path="/owner/enrollments" element={<EnrollmentsPage />} />
            <Route path="/owner/agents" element={<AgentsPage />} />
            <Route path="/owner/settings" element={<SettingsPage />} />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/enrollments" element={<EnrollmentsPage />} />
            <Route path="/admin/agents" element={<AdminAgentsPage />} />
            
            {/* Agent routes */}
            <Route path="/agent/dashboard" element={<AgentDashboard />} />
            <Route path="/agent/students" element={<StudentsPage />} />
            <Route path="/agent/enrollments" element={<EnrollmentsPage />} />
            <Route path="/agent/enroll" element={<EnrollStudent />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
