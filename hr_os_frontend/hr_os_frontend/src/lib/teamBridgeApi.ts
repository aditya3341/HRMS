import api from "@/lib/api";

export type TeamBridgeStatus = "pending" | "approved" | "rejected";

export interface TeamBridgeDepartment {
  id: string;
  name: string;
  color: string;
  bg: string;
  abbr: string;
}

export interface TeamBridgeUser {
  id: string;
  name: string;
  dept: string;
  initials: string;
  role: string;
}

export interface TeamBridgeAttachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url: string;
}

export interface TeamBridgeApproval {
  id: string;
  title: string;
  description: string;
  attachment?: TeamBridgeAttachment | null;
  autoReminder: boolean;
  reminderInterval: number;
  status: TeamBridgeStatus;
  requestedBy: string;
  approvedBy: string | null;
  reminders: number;
  lastReminder: number | null;
}

export type TeamBridgeMessage =
  | { id: string; type: "text"; from: string; to: string; time: string; text: string; attachment?: TeamBridgeAttachment | null }
  | { id: string; type: "approval"; from: string; to: string; time: string; approval: TeamBridgeApproval }
  | { id: string; type: "system"; from: string; to: string; time: string; text: string }
  | { id: string; type: "reminder"; from: string; to: string; time: string; approvalId: string; text: string };

export interface TeamBridgeBootstrap {
  departments: TeamBridgeDepartment[];
  users: TeamBridgeUser[];
  current_user: string | null;
  messages: Record<string, TeamBridgeMessage[]>;
}

export const teamBridgeApi = {
  bootstrap: () => api.get<TeamBridgeBootstrap>("/teambridge/bootstrap"),
  sendMessage: (payload: { from: string; to: string; text: string; channel_type: "dept" | "dm"; attachment?: TeamBridgeAttachment | null }) =>
    api.post<TeamBridgeMessage>("/teambridge/messages", payload),
  createApproval: (payload: {
    title: string;
    description: string;
    attachment?: TeamBridgeAttachment | null;
    autoReminder: boolean;
    reminderInterval: number;
    target: string;
    targetType: "dept" | "dm";
    requestedBy: string;
  }) => api.post<{ messages: TeamBridgeMessage[] }>("/teambridge/approvals", payload),
  actOnApproval: (approvalId: string, payload: { actorId: string; action: TeamBridgeStatus }) =>
    api.patch<{ approval: TeamBridgeApproval; message: TeamBridgeMessage }>(`/teambridge/approvals/${approvalId}`, payload),
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<TeamBridgeAttachment>("/teambridge/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  triggerReminder: (approvalId: string) =>
    api.post<{ approval: TeamBridgeApproval; message: TeamBridgeMessage }>("/teambridge/reminders", { approvalId })
};
