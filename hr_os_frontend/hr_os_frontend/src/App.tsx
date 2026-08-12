import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, DEV_AUTH_BYPASS } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import AppLayout from "@/components/AppLayout";

import Login from "@/pages/Login";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import HRIntelligenceDashboard from "@/pages/dashboard/HRIntelligenceDashboard";
import EmployeeInsightPanel from "@/pages/dashboard/EmployeeInsightPanel";
import Jobs from "@/pages/Jobs";
import Applications from "@/pages/Applications";
import Offers from "@/pages/Offers";
import OffersApproval from "@/pages/OffersApproval";
import Onboarding from "@/pages/Onboarding";
import OnboardingDetail from "@/pages/OnboardingDetail";
import ITAssets from "@/pages/ITAssets";
import ZipaDesk from "@/pages/ZipaDesk";
import AttendanceDashboard from "@/pages/attendance/AttendanceDashboard";
import AttendanceHistory from "@/pages/attendance/AttendanceHistory";
import AttendanceTeam from "@/pages/attendance/AttendanceTeam";
import PayrollDashboard from "@/pages/payroll/PayrollDashboard";
import PayslipView from "@/pages/payroll/PayslipView";
import NotFound from "@/pages/NotFound";
import { Employees } from "@/pages/Employees";
import EmployeeProfilePage from "@/pages/EmployeeProfile";
import ApprovalInbox from "@/pages/ApprovalInbox";
import ApprovalAnalytics from "@/pages/ApprovalAnalytics";
import OrganisationPage from "@/pages/Organisation";
import ActionCenter from "@/pages/ActionCenter";
import CommandCenter from "@/pages/CommandCenter";
import { PageHeader } from "@/components/PageHeader";
import { CalendarDays } from "lucide-react";

// NEW Leave Pages
import LeaveDashboard_Premium from "@/pages/leaves/LeaveDashboard";
import ApplyLeave from "@/pages/leaves/ApplyLeave";
import LeaveCalendar from "@/pages/leaves/LeaveCalendar";
import ManageLeaves from "@/pages/leaves/ManageLeaves";
import LeaveAnalyticsPage from "@/pages/analytics/LeaveAnalyticsPage";
import HolidayCalendar from "@/components/leave/HolidayCalendar";
import BiometricDevicesPage from "@/pages/admin/BiometricDevicesPage";
import ConfigPanel from "@/pages/admin/ConfigPanel";
import PerformanceCycles from "@/pages/performance/PerformanceCycles";
import KPAManagement from "@/pages/performance/KPAManagement";
import MyGoals from "@/pages/performance/MyGoals";
import PerformanceReview from "@/pages/performance/PerformanceReview";
import ManagerReviewDashboard from "@/pages/performance/ManagerReviewDashboard";
import AppraisalCenter from "@/pages/performance/AppraisalCenter";
import PerformanceAnalytics from "@/pages/performance/PerformanceAnalytics";
import TeamBridgePage from "@/pages/TeamBridge";

// Utility Tools
import UtilityDashboard from "@/pages/utility/UtilityDashboard";
import ResumeAnalyzer from "@/pages/utility/ResumeAnalyzer";
import ProctorTool from "@/pages/utility/ProctorTool";
import AISettingsPage from "@/pages/admin/AISettingsPage";
import SystemSettings from "@/pages/admin/SystemSettings";
import LiveAttendanceDashboard from "@/pages/admin/LiveAttendanceDashboard";

export default function App() {
  return (
    <QueryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Routes>
              {/* ================= PUBLIC ================= */}
              <Route path="/login" element={DEV_AUTH_BYPASS ? <Navigate to="/dashboard" replace /> : <Login />} />

              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* ================= PROTECTED ================= */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<EmployeeDashboard />} />
                  <Route path="/dashboard/me" element={<EmployeeInsightPanel />} />
                  <Route path="/dashboard/manager" element={<ManagerDashboard />} />
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/dashboard/hr-intelligence" element={<HRIntelligenceDashboard />} />
                    <Route path="/dashboard/live-attendance" element={<LiveAttendanceDashboard />} />
                  </Route>
                  
                  {/* Hiring / HR Module */}
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/employees" element={<Employees />} />
                  </Route>
                  {/* Employee profile accessible by all — needed for self-view */}
                  <Route path="/employees/:id" element={<EmployeeProfilePage />} />
                  
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/offers" element={<Offers />} />
                  <Route path="/offers/approval" element={<OffersApproval />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/onboarding/:employeeId" element={<OnboardingDetail />} />
                  
                  {/* Attendance Module */}
                  <Route path="/attendance" element={<Navigate to="/attendance/dashboard" replace />} />
                  <Route path="/attendance/dashboard" element={<AttendanceDashboard />} />
                  <Route path="/attendance/history" element={<AttendanceHistory />} />
                  <Route path="/attendance/team" element={<AttendanceTeam />} />
                  
                  {/* Leave Module Refactored */}
                  <Route path="/leave" element={<Navigate to="/leaves/dashboard" replace />} />
                  <Route path="/leaves/dashboard" element={<LeaveDashboard_Premium />} />
                  <Route path="/leaves/apply" element={<ApplyLeave />} />
                  <Route path="/leaves/calendar" element={<LeaveCalendar />} />
                  <Route path="/leaves/manage" element={<ManageLeaves />} />
                  <Route path="/leaves/analytics" element={<LeaveAnalyticsPage />} />
                  <Route path="/holidays" element={
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <PageHeader 
                        icon={CalendarDays}
                        title="Holiday Calendar"
                        subtitle="View upcoming organization holidays and non-working days."
                      />
                      <HolidayCalendar />
                    </div>
                  } />
                  <Route path="/approvals/leave" element={<Navigate to="/leaves/manage" replace />} />
                  
                  {/* Payroll Module */}
                  <Route path="/payroll" element={<Navigate to="/payroll/dashboard" replace />} />
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/payroll/dashboard" element={<PayrollDashboard />} />
                  </Route>
                  <Route path="/payroll/payslip/:runId/:employeeId" element={<PayslipView />} />
                  <Route path="/it-assets" element={<ITAssets />} />
                  <Route path="/zipadesk" element={<ZipaDesk />} />
                  <Route path="/it-tickets" element={<ZipaDesk />} />
                  <Route path="/team" element={<TeamBridgePage />} />
                  <Route path="/approvals" element={<ApprovalInbox />} />
                  <Route path="/approvals/analytics" element={<Navigate to="/analytics" replace />} />
                  <Route path="/analytics" element={<ApprovalAnalytics />} />
                  <Route path="/organisation" element={<OrganisationPage />} />
                  <Route path="/action-center" element={<ActionCenter />} />
                  
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
                    <Route path="/command-center" element={<CommandCenter />} />
                  </Route>
                  
                  {/* Utility Tools Module */}
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "HR"]} />}>
                    <Route path="/utility-tools" element={<UtilityDashboard />} />
                    <Route path="/utility-tools/resume" element={<ResumeAnalyzer />} />
                    <Route path="/utility-tools/proctor" element={<ProctorTool />} />
                  </Route>
                  
                  {/* Super Admin Module */}
                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN"]} />}>
                    <Route path="/admin/biometric-devices" element={<BiometricDevicesPage />} />
                    <Route path="/admin/config" element={<ConfigPanel />} />
                    <Route path="/admin/settings/ai" element={<AISettingsPage />} />
                    <Route path="/admin/system-settings" element={<SystemSettings />} />
                  </Route>

                  {/* Performance Module */}
                  <Route path="/performance/my-goals" element={<MyGoals />} />
                  <Route path="/performance/reviews/:reviewId" element={<PerformanceReview />} />
                  
                  <Route element={<RoleRoute allowedRoles={["MANAGER", "SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/performance/team/reviews" element={<ManagerReviewDashboard />} />
                  </Route>

                  <Route element={<RoleRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/performance/cycles" element={<PerformanceCycles />} />
                    <Route path="/performance/kpas" element={<KPAManagement />} />
                    <Route path="/performance/appraisal" element={<AppraisalCenter />} />
                  </Route>

                  <Route element={<RoleRoute allowedRoles={["MANAGER", "SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]} />}>
                    <Route path="/performance/analytics" element={<PerformanceAnalytics />} />
                  </Route>
                </Route>
              </Route>

              {/* ================= FALLBACK ================= */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryProvider>
  );
}
