/**
 * ============================================================
 * HR OS — API Contract Types
 * Single source of truth for ALL request/response shapes.
 * Mirrors the backend Pydantic schemas exactly.
 * ============================================================
 */

// ----------------------------
// Standard API Envelope
// Every backend response follows this shape.
// ----------------------------
export interface APIResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// ----------------------------
// Auth
// ----------------------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  user_id: string;
  employee_id: string | null;
  email: string;
  role: string;
  entity_id: string;
  avatar_url?: string | null;
  banner_url?: string | null;
}

export interface MeResponse {
  user: CurrentUser;
  permissions: string[];
}

// ----------------------------
// Jobs
// ----------------------------
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type JobStatus = "OPEN" | "CLOSED" | "PAUSED";

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  employment_type: EmploymentType;
  status: JobStatus;
  entity_id: string;
}

export interface JobCreate {
  title: string;
  description: string;
  location: string;
  employment_type: EmploymentType;
}

export interface JobUpdate {
  title?: string;
  description?: string;
  location?: string;
  employment_type?: EmploymentType;
  status?: JobStatus;
}

// ----------------------------
// Applications
// ----------------------------
export type ApplicationStatus =
  | "APPLIED"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "SELECTED"
  | "REJECTED"
  | "OFFER_CREATED"
  | "OFFER_SENT"
  | "ONBOARDING_STARTED";

export interface Application {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  job_id: string;
  status: ApplicationStatus;
  entity_id: string;
  resume_text?: string | null;
  parsed_data?: string | null;
  created_at?: string;
  offer?: {
    id: string;
    status: "pending_approval" | "approved" | "rejected" | "sent" | string;
    designation?: string;
    offered_salary?: string;
  } | null;
}

export interface ApplicationCreate {
  candidate_name: string;
  email: string;
  phone: string;
  job_id: string;
}

export interface ApplicationMoveRequest {
  to_status: ApplicationStatus;
  notes?: string;
}

// ----------------------------
// Interviews
// ----------------------------
export interface InterviewLog {
  id: string;
  application_id: string;
  from_status: ApplicationStatus;
  to_status: ApplicationStatus;
  action_by: string;
  notes?: string | null;
}

// ----------------------------
// Offers
// ----------------------------
export type OfferStatus = "CREATED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface Offer {
  id: string;
  application_id: string;
  offered_salary: string;
  designation: string;
  joining_date: string;
  status: OfferStatus;
  created_by: string;
  approved_by?: string | null;
  created_at: string;
}

export interface OfferCreate {
  application_id: string;
  offered_salary: string;
  designation: string;
  joining_date: string;
}

// ----------------------------
// Onboarding
// ----------------------------
export interface OnboardingStartResponse {
  message: string;
  employee_id: string;
  employee_code: string;
}

// ----------------------------
// Employees
// ----------------------------
export type EmployeeStatus = "ONBOARDING" | "ACTIVE" | "INACTIVE" | "TERMINATED";

export interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  entity_id: string;
  status: EmployeeStatus;
  job_title?: string | null; // Added for UI
  department?: { id: string; name: string }; // Added for UI
  pan?: string | null;
  aadhaar?: string | null;
  uan?: string | null;
  bank_account?: string | null;
  documents_uploaded: boolean;
  policies_accepted: boolean;
  biometric_id?: string | null;
}

// ----------------------------
// Attendance
// ----------------------------
export interface AttendanceSummary {
  present: number;
  late: number;
  half_day: number;
  absent: number;
  total_hours: number;
}

export interface AttendanceRecord {
  id?: string;
  employee_id?: string;
  full_name?: string;
  date: string;
  attendance_date?: string; // Compatibility
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "LATE";
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  is_late?: boolean;
  // Smart attendance fields
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string | null;
  selfie_url?: string | null;
  verification_status?: "VERIFIED" | "FAILED" | "MANUAL" | null;
  device_id?: string | null;
}

export interface CheckInPayload {
  latitude?: number;
  longitude?: number;
  selfie?: string; // base64 encoded image
  device_id?: string;
}

export type RegularizationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface RegularizationRequest {
  attendance_id: string;
  reason: string;
  comment?: string;
}

export interface RegularizationRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  reason: string;
  comment?: string | null;
  status: RegularizationStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface AttendanceLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface AttendanceSecurityConfig {
  geo_fencing_enabled: boolean;
  selfie_required: boolean;
  allowed_radius_meters: number;
  allowed_locations: AttendanceLocation[];
  enforced_roles: string[];
  enforced_employee_ids: string[];
  allow_manual_override: boolean;
}

export interface AttendanceRegularizationConfig {
  reasons: string[];
  require_comment_if_other: boolean;
}

export interface AttendanceModeConfig {
  mode: "MANUAL" | "BIOMETRIC" | "HYBRID";
  allow_manual: boolean;
  auto_calculate_hours: boolean;
  first_in_last_out: boolean;
}

export interface AttendanceSummaryDaily {
  first_check_in: string | null;
  last_check_out: string | null;
  total_hours: number | null;
  source: string;
}

export interface BehaviorSummary {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  avg_check_in_hour: number | null;
  late_count: number;
  absent_count: number;
  consistency_score: number;
  trend: "IMPROVING" | "STABLE" | "DECLINING";
}

export interface EmployeeTrustScore {
  id: string;
  employee_id: string;
  score: number;
  category: "HIGH" | "MEDIUM" | "LOW";
  on_time_ratio: number;
  regularization_count: number;
  fraud_flag_count: number;
  last_updated: string;
}

export interface FraudFlag {
  id: string;
  employee_id: string;
  date: string;
  fraud_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  details: any;
  is_resolved: boolean;
  created_at: string;
}

// ----------------------------
// Dashboard Intelligence
// ----------------------------

export interface HRIntelligenceData {
  avg_trust_score: number;
  risk_employee_count: number;
  fraud_alert_count: number;
  outliers: {
    name: string;
    score: number;
    category: "HIGH" | "MEDIUM" | "LOW";
    fraud_flags: number;
  }[];
}

export interface ManagerIntelligenceData {
  avg_team_trust: number;
  high_performers_count: number;
  late_today: number;
}

export interface EmployeeInsightData {
  trust_score: number;
  trust_category: "HIGH" | "MEDIUM" | "LOW";
  behavior: BehaviorSummary | null;
  insights: string[];
  avatar_url?: string | null;
  banner_url?: string | null;
}

// ----------------------------
// Payroll (Step 4-8 Hardening)
// ----------------------------
export type PayrollRunStatus = "DRAFT" | "LOCKED" | "PAID";

export interface PayrollRun {
  id: string;
  entity_id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_at: string;
  processed_at?: string;
  entries?: PayrollEntry[];
}

export interface PayrollEntry {
  id: string;
  payroll_run_id?: string;
  employee_id: string;
  employee_name?: string;
  
  // Salary Components
  basic: number;
  hra: number;
  allowances: number;
  gross_salary: number;
  
  // Deductions
  lop_days: number;
  lop_deduction: number;
  attendance_deduction: number;
  fixed_deductions: number;
  total_deductions: number;
  
  // Traceability (Hardened)
  absences_count: number;
  approved_leave_count: number;
  rejected_leave_count: number;
  half_day_count: number;
  overlap_count: number;
  late_count: number;
  
  // Net
  net_salary: number;
  
  // Overrides
  override_amount: number;
  override_reason?: string;
  overridden_by?: string;
  overridden_at?: string;
}

export interface PayrollSimulationResponse {
  payroll_run: Partial<PayrollRun>;
  entries: PayrollEntry[];
  summary: {
    total_employees: number;
    total_gross: number;
    total_net: number;
  };
}

export interface PayrollRunRequest {
  month: number;
  year: number;
}

// ----------------------------
// IT Assets
// ----------------------------
export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED";

export interface ITAsset {
  id: string;
  asset_tag: string;
  asset_type: string;
  status: AssetStatus;
  assigned_to?: string | null;
  brand?: string | null;
  desktop_name?: string | null;
  model?: string | null;
  processor?: string | null;
  ram?: string | null;
  storage?: string | null;
  operating_system?: string | null;
  location?: string | null;
  issue?: string | null;
  gpu?: string | null;
  assigned_employee_id?: string | null;
  assigned_to_name?: string | null;
}

// ----------------------------
// IT Tickets
// ----------------------------
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface ITTicket {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at?: string | null;
}

export interface ITTicketCreate {
  title: string;
  description: string;
}

// ----------------------------
// Notifications
// ----------------------------
export interface Notification {
  id: string;
  user_email: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ----------------------------
// Approvals
// ----------------------------
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "IGNORED";
export type ApprovalModule = "OFFER" | "ONBOARDING" | "EMPLOYEE" | "LEAVE" | "EXPENSE" | string;
export type ApprovalPriority = "HIGH" | "MEDIUM" | "LOW";

export interface ApprovalReference {
  title: string;
  subtitle?: string;
  meta?: Record<string, string>;
}

export interface SlaInfo {
  status: 'SAFE' | 'DUE_SOON' | 'OVERDUE' | 'ESCALATED' | 'NONE';
  hours_left: number | null;
}

export interface ApprovalRequestResponse {
  id: string;
  entity_id: string;
  module: ApprovalModule;
  reference_id_str: string;
  reference?: ApprovalReference | null;
  priority?: ApprovalPriority;
  requested_by: string;
  status: ApprovalStatus;
  current_step: number;
  total_steps?: number;
  created_at: string;
  updated_at: string;
  /** Server-computed SLA snapshot. status='NONE' means no SLA configured. */
  sla?: SlaInfo | null;
}

export interface ApprovalTimelineStepResponse {
  step_order: number;
  approver_id?: string | null;
  approver_name?: string | null;
  status: ApprovalStatus;
  action_at?: string | null;
  remarks?: string | null;
}

export interface ApprovalActionRequest {
  action: "APPROVED" | "REJECTED";
  remarks?: string;
}

// ----------------------------
// Manager Dashboard
// ----------------------------
export interface ManagerKpis {
  team_size: number;
  active_employees: number;
  open_positions: number;
  offers_pending: number;
}

export interface HiringFunnel {
  applied: number;
  interview: number;
  offer_created: number;
  offer_sent: number;
  accepted: number;
  joined: number;
}

export interface TeamGroupItem {
  name: string;
  count: number;
}

export interface TeamComposition {
  by_department: TeamGroupItem[];
  by_designation: TeamGroupItem[];
}

export type ActivityType = "offer_sent" | "offer_accepted" | "employee_joined";

export interface ActivityEvent {
  type: ActivityType;
  label: string;
  actor: string;
  timestamp: string | null;
}

export interface OverdueEmployee {
  employee_id: string;
  name: string;
  days_overdue: number;
}

export interface DashboardAlerts {
  pending_approvals: number;
  overdue_onboarding: OverdueEmployee[];
  overdue_onboarding_count: number;
}

export interface ManagerDashboardData {
  kpis: ManagerKpis;
  funnel: HiringFunnel;
  team_composition: TeamComposition;
  recent_activity: ActivityEvent[];
  alerts: DashboardAlerts;
}


// ----------------------------
// Leave Management (Step 1-3)
// ----------------------------
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type DayType = "FULL_DAY" | "FIRST_HALF" | "SECOND_HALF";
export type AccrualType = "NONE" | "MONTHLY" | "YEARLY";

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_paid: boolean;
  max_per_year: number;
  sandwich_rule_enabled: boolean;
  accrual_type: AccrualType;
  accrual_rate: number;
  accrual_day: number;
  carry_forward_enabled: boolean;
  carry_forward_limit: number;
  expiry_days?: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  day_type: DayType;
  days: number;
  reason: string;
  status: LeaveStatus;
  applied_at: string;
  approved_by?: string;
  approved_at?: string;
  reviewed_at?: string; // For timeline
  manager_note?: string; // For timeline
  rejection_reason?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joins
  employee?: {
    id: string;
    full_name: string;
    email: string;
  };
  leave_type?: LeaveType;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
  last_accrual_date?: string;
  expiry_date?: string;
  leave_type?: LeaveType;
}

export interface Holiday {
  id: string;
  entity_id: string;
  name: string;
  date: string;
  is_optional: boolean;
}

export interface LeaveRequestCreate {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  day_type: DayType;
  reason: string;
}

export interface LeaveStats {
  total_available: number;
  total_used: number;
  total_remaining: number;
  pending_requests: number;
}

export interface LeaveCalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: "LEAVE" | "HOLIDAY";
  status?: LeaveStatus;
  color?: string;
  employee_name?: string;
}
