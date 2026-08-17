import { attendanceApi } from "./attendanceApi";
import * as leaveApi from "./leaveApi";
import { payrollApi } from "./payrollApi";
import { employeeApi } from "./employeeApi";
import type { User } from "./types";

export type ChatNodeType = "text" | "table" | "form" | "card" | "alert";

export interface ChatNode {
  type: ChatNodeType;
  content: string | any;
  metadata?: any;
  timestamp: string;
  sender: "bot" | "user";
}

export const chatbotService = {
  /**
   * Simple Intent Detection
   * Maps user strings to functional intents
   */
  detectIntent: (input: string): string => {
    const text = input.toLowerCase();
    if (text.includes("leave balance") || text.includes("my leaves")) return "GET_LEAVE_BALANCE";
    if (text.includes("apply leave") || text.includes("take leave")) return "APPLY_LEAVE_FORM";
    if (text.includes("attendance") || text.includes("late")) return "GET_ATTENDANCE_SUMMARY";
    if (text.includes("who is on leave") || text.includes("team leave")) return "GET_TEAM_LEAVE";
    if (text.includes("pending approvals") || text.includes("approve")) return "GET_PENDING_APPROVALS";
    if (text.includes("trust score") || text.includes("risk")) return "GET_LOW_TRUST_EMPLOYEES";
    if (text.includes("it ticket") || text.includes("raise ticket")) return "RAISE_IT_TICKET_FORM";
    if (text.includes("fraud") || text.includes("alerts")) return "GET_FRAUD_ALERTS";
    if (text.includes("payroll") || text.includes("salary")) return "GET_PAYROLL_SUMMARY";
    if (text.includes("laptop") || text.includes("asset")) return "GET_MY_ASSETS";
    
    return "UNKNOWN";
  },

  /**
   * Core Orchestration Logic
   * Fetches data and formats the response based on intent and user role
   */
  processChat: async (input: string, user: User): Promise<ChatNode> => {
    const intent = chatbotService.detectIntent(input);
    const role = user.role;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      switch (intent) {
        case "GET_LEAVE_BALANCE": {
          const balances = await leaveApi.getMyBalances();
          const list = balances.map(b => `${b.leave_type?.name || 'Leave'}: ${b.remaining} remaining`).join("\n");
          return {
            type: "card",
            sender: "bot",
            timestamp: now,
            content: `### Your Leave Balance (Current Year)\n\n${list}`,
            metadata: { balances }
          };
        }

        case "APPLY_LEAVE_FORM": {
          return {
            type: "form",
            sender: "bot",
            timestamp: now,
            content: "Please fill in the details below to apply for leave.",
            metadata: {
              formType: "LEAVE_APPLICATION",
              fields: [
                { name: "leave_type_id", label: "Leave Type", type: "select", options: [] }, // Options fetched in UI
                { name: "start_date", label: "From Date", type: "date" },
                { name: "end_date", label: "To Date", type: "date" },
                { name: "reason", label: "Reason", type: "textarea" },
              ]
            }
          };
        }

        case "GET_ATTENDANCE_SUMMARY": {
          const summary = await attendanceApi.getMonthlySummary();
          return {
            type: "card",
            sender: "bot",
            timestamp: now,
            content: `### Attendance Summary (${new Date().toLocaleString('default', { month: 'long' })})\n\n- **Present**: ${summary.present_count} days\n- **Late**: ${summary.late_count}\n- **Half Days**: ${summary.half_day_count}\n- **Consistency**: ${summary.behavior_score || 0}%`,
            metadata: { summary }
          };
        }

        case "GET_TEAM_LEAVE": {
          if (!["MANAGER", "SUPER_ADMIN", "ADMIN", "HR"].includes(role)) {
            return chatbotService.unauthorizedNode(now);
          }
          const nowObj = new Date();
          const events = await leaveApi.getLeaveCalendar(nowObj.getMonth() + 1, nowObj.getFullYear(), true);
          const onLeaveToday = events.filter(e => {
             const today = new Date().toISOString().split('T')[0];
             return e.event_type === "LEAVE" && today >= e.start_date && today <= e.end_date;
          });
          
          if (onLeaveToday.length === 0) return {
            type: "text",
            sender: "bot",
            timestamp: now,
            content: "All team members are present today. No one is on leave."
          };

          const list = onLeaveToday.map(e => `- ${e.employee_name}`).join("\n");
          return {
            type: "card",
            sender: "bot",
            timestamp: now,
            content: `### 🌴 Team Members on Leave Today\n\n${list}`,
          };
        }

        case "GET_FRAUD_ALERTS": {
          if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(role)) {
            return chatbotService.unauthorizedNode(now);
          }
          const flags = await attendanceApi.getPendingFraud();
          return {
            type: "table",
            sender: "bot",
            timestamp: now,
            content: `Detected ${flags.length} integrity signals requiring review.`,
            metadata: { 
               rows: flags.map(f => ({ 
                 employee: f.employee_name, 
                 type: f.type, 
                 severity: f.severity 
               }))
            }
          };
        }

        case "RAISE_IT_TICKET_FORM": {
           return {
             type: "form",
             sender: "bot",
             timestamp: now,
             content: "Enter your IT issue details here.",
             metadata: {
               formType: "IT_TICKET",
               fields: [
                 { name: "category", label: "Category", type: "select", options: ["Hardware", "Software", "Network", "Access"] },
                 { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
                 { name: "description", label: "Description", type: "textarea" },
               ]
             }
           };
        }

        case "UNKNOWN":
        default:
          return {
            type: "text",
            sender: "bot",
            timestamp: now,
            content: "I'm not sure how to help with that. Try asking about your **leave balance**, **attendance**, or **pending approvals**."
          };
      }
    } catch (error: any) {
      return {
        type: "text",
        sender: "bot",
        timestamp: now,
        content: `Sorry, I encountered an error while fetching that information: ${error.message}`
      };
    }
  },

  unauthorizedNode: (timestamp: string): ChatNode => ({
    type: "alert",
    sender: "bot",
    timestamp,
    content: "⚠️ You are not authorized to access this information.",
    metadata: { severity: "error" }
  }),

  /**
   * Proactive Logic
   * Checks for signals to push to the user
   */
  getProactiveSignals: async (user: User): Promise<ChatNode[]> => {
    const signals: ChatNode[] = [];
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Check for Pending Approvals (Managers/Admins)
    if (["MANAGER", "SUPER_ADMIN", "ADMIN", "HR"].includes(user.role)) {
       try {
         const pendingLeaves = await leaveApi.getLeaves();
         const pendingCount = pendingLeaves.filter(l => l.status === "PENDING").length;
         if (pendingCount > 0) {
           signals.push({
             type: "alert",
             sender: "bot",
             timestamp: now,
             content: `🔔 You have ${pendingCount} pending leave requests requiring your review.`,
             metadata: { link: "/approvals", severity: "info" }
           });
         }
       } catch {}
    }

    // 2. Check for Attendance Issues
    try {
      const summary = await attendanceApi.getMonthlySummary();
      if (summary.late_count > 2) {
        signals.push({
          type: "alert",
          sender: "bot",
          timestamp: now,
          content: `⚠️ You've been late ${summary.late_count} times this month. Consider regularizing or adjusting your core hours.`,
          metadata: { link: "/attendance/history", severity: "warning" }
        });
      }
    } catch {}

    return signals;
  }
};
