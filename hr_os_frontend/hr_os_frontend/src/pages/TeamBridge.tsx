import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { teamBridgeApi, TeamBridgeAttachment, TeamBridgeApproval, TeamBridgeMessage } from "@/lib/teamBridgeApi";
import api from "@/lib/api";
import "./TeamBridge.css";

// ── Types ──
interface Department {
  id: string;
  name: string;
  color: string;
  bg: string;
  abbr: string;
}

interface UserData {
  id: string;
  name: string;
  dept: string;
  initials: string;
  role: string;
}

type Message = TeamBridgeMessage;
type ApprovalData = TeamBridgeApproval;

interface ChannelState {
  type: "dept" | "dm";
  id: string;
}

interface NewApprovalForm {
  title: string;
  description: string;
  attachment?: TeamBridgeAttachment | null;
  autoReminder: boolean;
  reminderInterval: number;
}

// ── Helpers ──
function genId(): string { return Math.random().toString(36).slice(2, 10); }

function now(): string {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getDMKey(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

// ── Secure Attachment Hook & Components ──
function useSecureAttachment(fileId: string | undefined) {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setUrl("");
      return;
    }
    let active = true;
    setLoading(true);

    api.get(`/teambridge/attachments/${fileId}`, { responseType: "blob" })
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob as Blob);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load secure attachment", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId]);

  return { url, loading };
}

function SecureImage({ fileId, alt, className, style }: { fileId: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const { url, loading } = useSecureAttachment(fileId);
  if (loading) {
    return (
      <div className="tb-attachment-loading" style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--tb-surface2)", borderRadius: 8, padding: 12 }}>
        <span style={{ fontSize: 11, color: "var(--tb-text3)" }}>⌛ Loading image...</span>
      </div>
    );
  }
  if (!url) return null;
  return <img src={url} alt={alt || "Attached Image"} className={className} style={style} onClick={() => window.open(url, "_blank")} />;
}

function AttachmentCard({ attachment }: { attachment: TeamBridgeAttachment }) {
  const { url, loading } = useSecureAttachment(attachment.id);
  const isImage = attachment.content_type.startsWith("image/");

  if (isImage) {
    return (
      <div className="tb-attachment-img-preview" style={{ marginTop: 4 }}>
        <SecureImage fileId={attachment.id} style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, cursor: "pointer" }} />
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="tb-attachment-file-card" onClick={handleDownload} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--tb-border)", borderRadius: 10, background: "var(--tb-surface)", cursor: "pointer", transition: "background 0.15s" }}>
      <span style={{ fontSize: 20 }}>📁</span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--tb-text)" }}>{attachment.filename}</span>
        <span style={{ fontSize: 10, color: "var(--tb-text3)" }}>{formatSize(attachment.size)}</span>
      </div>
      <button style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--tb-accent)" }} disabled={loading}>
        {loading ? "..." : "⬇"}
      </button>
    </div>
  );
}

// ── Component ──
export default function TeamBridgePage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [dms, setDms] = useState<Record<string, Message[]>>({});
  const [activeChannel, setActiveChannel] = useState<ChannelState>({ type: "dept", id: "" });
  const [activeTab, setActiveTab] = useState<string>("messages");
  const [inputText, setInputText] = useState<string>("");
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [newApproval, setNewApproval] = useState<NewApprovalForm>({
    title: "", description: "", attachment: null, autoReminder: false, reminderInterval: 1
  });
  
  // Attachments
  const [chatAttachment, setChatAttachment] = useState<TeamBridgeAttachment | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [modalUploadingFile, setModalUploadingFile] = useState<boolean>(false);
  
  const feedRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgCountRef = useRef<number>(0);

  useEffect(() => {
    if (!tabParam) return;
    if (tabParam === "contacts" || tabParam === "members") {
      setActiveTab("members");
    } else if (tabParam === "chats") {
      setActiveTab("messages");
      if (users.length > 0 && currentUser) {
        const otherUser = users.find((u) => u.id !== currentUser.id);
        if (otherUser) {
          setActiveChannel({ type: "dm", id: otherUser.id });
        }
      }
    } else if (tabParam === "channels") {
      setActiveTab("messages");
      if (departments.length > 0) {
        setActiveChannel({ type: "dept", id: departments[0].id });
      }
    }
  }, [tabParam, users, departments, currentUser]);

  useEffect(() => {
    let isMounted = true;
    teamBridgeApi.bootstrap()
      .then((payload) => {
        if (!isMounted) return;
        const deptMessages: Record<string, Message[]> = {};
        const dmMessages: Record<string, Message[]> = {};
        
        for (const [key, value] of Object.entries(payload.messages)) {
          if (key.startsWith("dm_")) {
            const receiverId = key.replace("dm_", "");
            const msgs = value as Message[];
            msgs.forEach(msg => {
              const unifiedKey = getDMKey(msg.from, receiverId);
              if (!dmMessages[unifiedKey]) dmMessages[unifiedKey] = [];
              dmMessages[unifiedKey].push(msg);
            });
          } else {
            deptMessages[key] = value as Message[];
          }
        }
        
        // Sort DMs
        for (const key of Object.keys(dmMessages)) {
          dmMessages[key].sort((a, b) => {
            const timeA = (a as any).created_at || "";
            const timeB = (b as any).created_at || "";
            return timeA.localeCompare(timeB);
          });
        }

        setDepartments(payload.departments);
        setUsers(payload.users);
        const selectedUser = payload.users.find((user) => user.id === payload.current_user) || payload.users[0] || null;
        const selectedDept = payload.departments.find((dept) => dept.id === selectedUser?.dept) || payload.departments[0];
        setCurrentUser(selectedUser);
        setActiveChannel({ type: "dept", id: selectedDept?.id || "" });
        setMessages(deptMessages);
        setDms(dmMessages);
      })
      .catch((err) => {
        console.error("Bootstrap failed", err);
        if (!isMounted) return;
        setDepartments([]);
        setUsers([]);
        setCurrentUser(null);
        setMessages({});
        setDms({});
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync polling & auto-reminders
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const fetchLatest = () => {
      teamBridgeApi.bootstrap()
        .then((payload) => {
          if (!isMounted) return;
          const deptMessages: Record<string, Message[]> = {};
          const dmMessages: Record<string, Message[]> = {};
          
          for (const [key, value] of Object.entries(payload.messages)) {
            if (key.startsWith("dm_")) {
              const receiverId = key.replace("dm_", "");
              const msgs = value as Message[];
              msgs.forEach(msg => {
                const unifiedKey = getDMKey(msg.from, receiverId);
                if (!dmMessages[unifiedKey]) dmMessages[unifiedKey] = [];
                dmMessages[unifiedKey].push(msg);
              });
            } else {
              deptMessages[key] = value as Message[];
            }
          }
          
          // Sort DMs
          for (const key of Object.keys(dmMessages)) {
            dmMessages[key].sort((a, b) => {
              const timeA = (a as any).created_at || "";
              const timeB = (b as any).created_at || "";
              return timeA.localeCompare(timeB);
            });
          }
          
          setMessages(deptMessages);
          setDms(dmMessages);
        })
        .catch((err) => console.error("Poll sync error", err));
    };

    const pollInterval = setInterval(fetchLatest, 7000);

    const reminderInterval = setInterval(() => {
      const nowMs = Date.now();
      const allMessagesLists = [...Object.values(messages), ...Object.values(dms)];
      
      allMessagesLists.forEach(msgList => {
        msgList.forEach(msg => {
          if (msg.type !== "approval") return;
          const ap = msg.approval;
          if (ap.status !== "pending") return;
          if (ap.requestedBy !== currentUser.id) return; // only request initiator checks/triggers to avoid duplication
          if (!ap.autoReminder) return;

          const intervalMs = (ap.reminderInterval || 15) * 60 * 1000;
          const refTime = ap.lastReminder ? ap.lastReminder : new Date((msg as any).created_at || Date.now()).getTime();

          if (nowMs - refTime >= intervalMs) {
            teamBridgeApi.triggerReminder(ap.id)
              .then(() => {
                fetchLatest();
              })
              .catch(err => console.error("Reminder trigger failed", err));
          }
        });
      });
    }, 15000); // Check every 15 seconds

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      clearInterval(reminderInterval);
    };
  }, [currentUser, messages, dms]);

  // Scroll to bottom on new messages only
  const channelKey = activeChannel.type === "dept" ? activeChannel.id : getDMKey(currentUser?.id || "", activeChannel.id);
  const channelMessages = activeChannel.type === "dept"
    ? (messages[activeChannel.id] || [])
    : (dms[channelKey] || []);

  useEffect(() => {
    if (channelMessages.length > lastMsgCountRef.current) {
      if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
    lastMsgCountRef.current = channelMessages.length;
  }, [channelMessages]);

  function pendingApprovals(deptId: string): number {
    return (messages[deptId] || []).filter(
      m => m.type === "approval" && (m as any).approval.status === "pending"
    ).length;
  }
  
  function getDMPendingCount(unifiedKey: string): number {
    return (dms[unifiedKey] || []).filter(
      m => m.type === "approval" && (m as any).approval.status === "pending"
    ).length;
  }

  const totalPending = departments.reduce((s, d) => s + pendingApprovals(d.id), 0) + 
    Object.keys(dms).reduce((s, k) => s + getDMPendingCount(k), 0);

  function deptMeta(deptId: string): Department {
    return departments.find(d => d.id === deptId) || departments[0] || {
      id: "unknown", name: "Unknown", color: "#64748B", bg: "#f1f5f9", abbr: "NA"
    };
  }

  function userMeta(userId: string): UserData {
    return users.find(u => u.id === userId) || {
      id: userId, name: "Unknown user", dept: departments[0]?.id || "unknown", initials: "?", role: "Unknown"
    };
  }

  function channelPending(): number {
    if (activeChannel.type === "dept") return pendingApprovals(activeChannel.id);
    return getDMPendingCount(channelKey);
  }

  // ─── ACTIONS ───
  async function sendMessage(): Promise<void> {
    if (!inputText.trim() && !chatAttachment) return;
    if (!currentUser || !activeChannel.id) return;
    const text = inputText.trim();
    setInputText("");

    const fileToSend = chatAttachment;
    setChatAttachment(null);

    const msg = await teamBridgeApi.sendMessage({
      from: currentUser.id,
      to: activeChannel.id,
      text,
      channel_type: activeChannel.type,
      attachment: fileToSend
    }) as TextMessage;

    if (activeChannel.type === "dept") {
      setMessages(m => ({ ...m, [activeChannel.id]: [...(m[activeChannel.id] || []), msg] }));
    } else {
      setDms(d => ({ ...d, [channelKey]: [...(d[channelKey] || []), msg] }));
    }
  }

  async function handleChatFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await teamBridgeApi.uploadFile(file);
      setChatAttachment(result);
    } catch (err) {
      console.error("Chat uploader failed", err);
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleModalFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalUploadingFile(true);
    try {
      const result = await teamBridgeApi.uploadFile(file);
      setNewApproval(prev => ({ ...prev, attachment: result }));
    } catch (err) {
      console.error("Modal uploader failed", err);
    } finally {
      setModalUploadingFile(false);
    }
  }

  async function handleApprovalAction(targetId: string, approvalId: string, action: "approved" | "rejected"): Promise<void> {
    if (!currentUser) return;
    const result = await teamBridgeApi.actOnApproval(approvalId, { actorId: currentUser.id, action });
    
    if (activeChannel.type === "dept") {
      setMessages(m => ({
        ...m,
        [targetId]: (m[targetId] || []).map(msg => {
          if (msg.type !== "approval" || msg.approval.id !== approvalId) return msg;
          return { ...msg, approval: result.approval };
        }),
      }));
      setMessages(m => ({ ...m, [targetId]: [...(m[targetId] || []), result.message] }));
    } else {
      const unifiedKey = getDMKey(currentUser.id, targetId);
      setDms(d => ({
        ...d,
        [unifiedKey]: (d[unifiedKey] || []).map(msg => {
          if (msg.type !== "approval" || msg.approval.id !== approvalId) return msg;
          return { ...msg, approval: result.approval };
        }),
      }));
      setDms(d => ({ ...d, [unifiedKey]: [...(d[unifiedKey] || []), result.message] }));
    }
  }

  async function submitApproval(): Promise<void> {
    if (!newApproval.title.trim()) return;
    if (!currentUser || !activeChannel.id) return;
    const result = await teamBridgeApi.createApproval({
      title: newApproval.title.trim(),
      description: newApproval.description.trim(),
      attachment: newApproval.attachment,
      autoReminder: newApproval.autoReminder,
      reminderInterval: newApproval.reminderInterval,
      target: activeChannel.id,
      targetType: activeChannel.type,
      requestedBy: currentUser.id,
    });

    if (activeChannel.type === "dept") {
      setMessages(m => ({ ...m, [activeChannel.id]: [...(m[activeChannel.id] || []), ...(result.messages as Message[])] }));
    } else {
      setDms(d => ({ ...d, [channelKey]: [...(d[channelKey] || []), ...(result.messages as Message[])] }));
    }
    
    setShowApprovalModal(false);
    setActiveTab("messages");
    setNewApproval({
      title: "",
      description: "",
      attachment: null,
      autoReminder: false,
      reminderInterval: 1
    });
  }

  function startDM(userId: string): void {
    if (!currentUser) return;
    if (userId === currentUser.id) return;
    setActiveChannel({ type: "dm", id: userId });
    setActiveTab("messages");
  }

  // ─── RENDER HELPERS ───
  function Avatar({ userId, size = 34 }: { userId: string; size?: number }) {
    const u = userMeta(userId);
    const d = deptMeta(u.dept);
    return (
      <div className="tb-msg-ava" style={{ width: size, height: size, background: d.bg, color: d.color, fontSize: size * 0.32 }}>
        {u.initials}
      </div>
    );
  }

  function renderMessage(msg: Message) {
    const isOwn = msg.from === currentUser!.id;
    const sender = userMeta(msg.from);
    const dept = deptMeta(sender.dept);

    if (msg.type === "system" || msg.type === "reminder") {
      const isReminder = msg.type === "reminder";
      if (isReminder) {
        return (
          <div key={msg.id} className="tb-msg-row" style={{ justifyContent: "flex-start" }}>
            <Avatar userId={msg.from} />
            <div className="tb-msg-col">
              <div className="tb-msg-meta-row">
                <span className="tb-msg-sender" style={{ color: dept.color }}>{sender.name}</span>
                <span className="tb-msg-dept-tag" style={{ background: dept.bg, color: dept.color }}>{dept.abbr}</span>
                <span className="tb-msg-time">{msg.time}</span>
              </div>
              <div className="tb-reminder-strip">
                <span className="tb-reminder-icon">🔔</span>
                <div className="tb-reminder-text"><strong>Auto-reminder</strong> — {msg.text}</div>
              </div>
            </div>
          </div>
        );
      }
      return <div key={msg.id} className="tb-sys-msg"><span>{msg.text}</span></div>;
    }

    if (msg.type === "approval") {
      const ap = msg.approval;
      const canAct = ap.status === "pending" && !isOwn;
      const targetId = activeChannel.id;
      return (
        <div key={msg.id} className={`tb-msg-row${isOwn ? " own" : ""}`}>
          {!isOwn && <Avatar userId={msg.from} />}
          <div className="tb-msg-col">
            <div className="tb-msg-meta-row">
              {!isOwn && <span className="tb-msg-sender" style={{ color: dept.color }}>{sender.name}</span>}
              {!isOwn && <span className="tb-msg-dept-tag" style={{ background: dept.bg, color: dept.color }}>{dept.abbr}</span>}
              {isOwn && <span className="tb-msg-sender" style={{ color: "var(--tb-text2)" }}>You</span>}
              <span className="tb-msg-time">{msg.time}</span>
            </div>
            <div className="tb-appr-card">
              <div className="tb-appr-hd">
                <span className="tb-appr-icon">📋</span>
                <span className="tb-appr-title" style={{ fontWeight: 600 }}>{ap.title}</span>
              </div>
              {ap.description && (
                <div className="tb-appr-desc" style={{ fontSize: 12.5, color: "var(--tb-text2)", marginBottom: 10, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                  {ap.description}
                </div>
              )}
              {ap.attachment && (
                <div className="tb-appr-attachment" style={{ marginBottom: 12 }}>
                  <AttachmentCard attachment={ap.attachment} />
                </div>
              )}
              <div className="tb-appr-meta-strip" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: 12 }}>
                {ap.autoReminder && (
                  <span style={{ fontSize: 10, color: "var(--tb-amber-dark)", background: "var(--tb-amber-bg)", padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                    🔔 Auto-reminder: every {ap.reminderInterval} min
                  </span>
                )}
                <span className={`tb-status-pill ${ap.status === "pending" ? "tb-pill-pending" : ap.status === "approved" ? "tb-pill-approved" : "tb-pill-rejected"}`} style={{ margin: 0 }}>
                  {ap.status === "pending" ? "⏳ Pending Review" : ap.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                </span>
              </div>
              {canAct ? (
                <div className="tb-appr-btns">
                  <button className="tb-btn-approve" onClick={() => handleApprovalAction(targetId, ap.id, "approved")}>✓ Approve</button>
                  <button className="tb-btn-reject" onClick={() => handleApprovalAction(targetId, ap.id, "rejected")}>✕ Reject</button>
                </div>
              ) : (
                <div className="tb-appr-btns">
                  {ap.status === "pending"
                    ? <button className="tb-btn-disabled">Awaiting review</button>
                    : ap.status === "approved"
                    ? <button className="tb-btn-disabled" style={{ background: "var(--tb-green-bg)", color: "#006e50" }}>✓ Approved</button>
                    : <button className="tb-btn-disabled" style={{ background: "var(--tb-red-bg)", color: "var(--tb-red-dark)" }}>✕ Rejected</button>
                  }
                </div>
              )}
            </div>
            {ap.reminders > 0 && ap.status === "pending" && (
              <span style={{ fontSize: 10, color: "var(--tb-amber-dark)", marginTop: 3 }}>🔔 {ap.reminders} reminder{ap.reminders > 1 ? "s" : ""} sent</span>
            )}
          </div>
          {isOwn && <Avatar userId={msg.from} />}
        </div>
      );
    }

    // Text message
    return (
      <div key={msg.id} className={`tb-msg-row${isOwn ? " own" : ""}`}>
        {!isOwn && <Avatar userId={msg.from} />}
        <div className="tb-msg-col">
          <div className="tb-msg-meta-row">
            {!isOwn && <span className="tb-msg-sender" style={{ color: dept.color }}>{sender.name}</span>}
            {!isOwn && <span className="tb-msg-dept-tag" style={{ background: dept.bg, color: dept.color }}>{dept.abbr}</span>}
            {isOwn && <span className="tb-msg-sender" style={{ color: "var(--tb-text2)" }}>You</span>}
            <span className="tb-msg-time">{msg.time}</span>
          </div>
          <div className="tb-bubble">
            {msg.text && <div className="tb-bubble-text" style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>}
            {msg.attachment && (
              <div className="tb-bubble-attachment" style={{ marginTop: msg.text ? 8 : 0 }}>
                <AttachmentCard attachment={msg.attachment} />
              </div>
            )}
          </div>
        </div>
        {isOwn && <Avatar userId={msg.from} />}
      </div>
    );
  }

  function ApprovalsPanel() {
    const allApprovals: (ApprovalData & { targetId: string; targetType: "dept" | "dm"; targetMeta: any; senderMeta: UserData })[] = [];

    // Pull from departments
    for (const dept of departments) {
      for (const msg of (messages[dept.id] || [])) {
        if (msg.type === "approval") {
          allApprovals.push({
            ...msg.approval,
            targetId: dept.id,
            targetType: "dept",
            targetMeta: dept,
            senderMeta: userMeta(msg.approval.requestedBy),
          });
        }
      }
    }

    // Pull from DMs
    for (const [dmKey, chanMsgs] of Object.entries(dms)) {
      for (const msg of chanMsgs) {
        if (msg.type === "approval") {
          const parts = dmKey.replace("dm_", "").split("_");
          const otherUserId = parts.find(p => p !== currentUser?.id) || parts[0];
          const otherUser = userMeta(otherUserId);
          
          allApprovals.push({
            ...msg.approval,
            targetId: otherUserId,
            targetType: "dm",
            targetMeta: otherUser,
            senderMeta: userMeta(msg.approval.requestedBy),
          });
        }
      }
    }

    const pending = allApprovals.filter(a => a.status === "pending");
    const done = allApprovals.filter(a => a.status !== "pending");

    if (allApprovals.length === 0) return (
      <div className="tb-empty-state">
        <span className="tb-empty-icon">📭</span>
        <span className="tb-empty-text">No approval requests</span>
      </div>
    );

    return (
      <div className="tb-approvals-panel">
        {pending.length > 0 && <div className="tb-section-hd" style={{ padding: "0 0 8px", color: "var(--tb-amber-dark)" }}>⏳ Pending ({pending.length})</div>}
        {pending.map(ap => {
          const isDept = ap.targetType === "dept";
          const label = isDept ? ap.targetMeta.abbr : ap.senderMeta.initials;
          const bg = isDept ? ap.targetMeta.bg : "#f1f5f9";
          const color = isDept ? ap.targetMeta.color : "#64748B";
          
          return (
            <div key={ap.id} className="tb-appr-list-item">
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: bg, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                {label}
              </div>
              <div className="tb-appr-item-body">
                <div className="tb-appr-item-header">
                  <div>
                    <div className="tb-appr-item-title" style={{ fontWeight: 600 }}>{ap.title}</div>
                    <div className="tb-appr-item-meta">From {ap.senderMeta.name} · {isDept ? `Team ${ap.targetMeta.name}` : "Direct Message"}</div>
                  </div>
                  <span className="tb-status-pill tb-pill-pending">Pending</span>
                </div>
                {ap.description && (
                  <div className="tb-appr-item-desc" style={{ fontSize: 12.5, color: "var(--tb-text2)", marginBottom: 8, whiteSpace: "pre-wrap" }}>
                    {ap.description}
                  </div>
                )}
                {ap.attachment && (
                  <div style={{ maxWidth: 300, marginBottom: 8 }}>
                    <AttachmentCard attachment={ap.attachment} />
                  </div>
                )}
                <div className="tb-appr-item-tags" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {ap.autoReminder && (
                    <span className="tb-appr-tag" style={{ color: "var(--tb-amber-dark)", background: "var(--tb-amber-bg)", borderColor: "#f5d98a" }}>
                      🔔 Auto-reminder: every {ap.reminderInterval} min
                    </span>
                  )}
                  {ap.reminders > 0 && (
                    <span className="tb-appr-tag">🔔 {ap.reminders} reminder(s) sent</span>
                  )}
                </div>
                {ap.requestedBy !== currentUser!.id && (
                  <div className="tb-appr-item-btns">
                    <button className="tb-btn-approve" onClick={() => { handleApprovalAction(ap.targetId, ap.id, "approved"); setActiveTab("messages"); setActiveChannel({ type: ap.targetType, id: ap.targetId }); }}>✓ Approve</button>
                    <button className="tb-btn-reject" onClick={() => { handleApprovalAction(ap.targetId, ap.id, "rejected"); setActiveTab("messages"); setActiveChannel({ type: ap.targetType, id: ap.targetId }); }}>✕ Reject</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {done.length > 0 && <div className="tb-section-hd" style={{ padding: "12px 0 8px", color: "var(--tb-text3)" }}>✓ Resolved ({done.length})</div>}
        {done.map(ap => {
          const isDept = ap.targetType === "dept";
          const label = isDept ? ap.targetMeta.abbr : ap.senderMeta.initials;
          const bg = isDept ? ap.targetMeta.bg : "#f1f5f9";
          const color = isDept ? ap.targetMeta.color : "#64748B";
          
          return (
            <div key={ap.id} className="tb-appr-list-item" style={{ opacity: .65 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: bg, color: color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                {label}
              </div>
              <div className="tb-appr-item-body">
                <div className="tb-appr-item-header">
                  <div>
                    <div className="tb-appr-item-title">{ap.title}</div>
                    <div className="tb-appr-item-meta">From {ap.senderMeta.name} · {isDept ? `Team ${ap.targetMeta.name}` : "Direct Message"}</div>
                  </div>
                  <span className={`tb-status-pill ${ap.status === "approved" ? "tb-pill-approved" : "tb-pill-rejected"}`}>
                    {ap.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function MembersPanel() {
    return (
      <div className="tb-members-panel">
        {departments.map(d => (
          <div key={d.id} className="tb-dept-members-group">
            <div className="tb-dept-members-hd" style={{ color: d.color }}>{d.name}</div>
            {users.filter(u => u.dept === d.id).map(u => (
              <div key={u.id} className="tb-member-row" onClick={() => startDM(u.id)}>
                <div className="tb-member-ava" style={{ background: d.bg, color: d.color }}>{u.initials}</div>
                <div>
                  <div className="tb-member-name">{u.name} {u.id === currentUser!.id ? <span style={{ fontSize: 10, color: "var(--tb-text3)" }}>(you)</span> : ""}</div>
                  <div className="tb-member-role">{u.role}</div>
                </div>
                {u.id !== currentUser!.id && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tb-accent)", opacity: .7 }}>DM →</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="teambridge-root">
        <div className="tb-shell">
          <div className="tb-main">
            <div className="tb-empty-state">
              <span className="tb-empty-icon">💬</span>
              <span className="tb-empty-text">No employee records are available for TeamBridge yet.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeDeptMeta = activeChannel.type === "dept" ? deptMeta(activeChannel.id) : null;
  const activeDMUser = activeChannel.type === "dm" ? userMeta(activeChannel.id) : null;
  const activeDMDept = activeDMUser ? deptMeta(activeDMUser.dept) : null;

  return (
    <div className="teambridge-root">
      <div className="tb-shell">
        {/* ── SIDEBAR ── */}
        <div className="tb-sidebar">
          <div className="tb-sidebar-brand">
            <div className="tb-brand-name">TeamBridge</div>
            <div className="tb-brand-sub">Interdepartmental Hub</div>
          </div>

          <div className="tb-sidebar-scroll">
            <div className="tb-section-hd">Departments</div>
            {departments.map(d => {
              const pending = pendingApprovals(d.id);
              return (
                <div key={d.id} className={`tb-nav-item${activeChannel.type === "dept" && activeChannel.id === d.id ? " active" : ""}`}
                  onClick={() => { setActiveChannel({ type: "dept", id: d.id }); setActiveTab("messages"); }}>
                  <div className="tb-nav-dot" style={{ background: d.color }} />
                  <span className="tb-nav-label">{d.name}</span>
                  {pending > 0 && <span className={`tb-nav-badge ${pending >= 3 ? "tb-badge-red" : "tb-badge-amber"}`}>{pending}</span>}
                </div>
              );
            })}

            <div className="tb-section-hd">Direct Messages</div>
            {users.filter(u => u.id !== currentUser.id).map(u => {
              const d = deptMeta(u.dept);
              const dmUnifiedKey = getDMKey(currentUser.id, u.id);
              const pending = getDMPendingCount(dmUnifiedKey);
              return (
                <div key={u.id} className={`tb-nav-item${activeChannel.type === "dm" && activeChannel.id === u.id ? " active" : ""}`}
                  onClick={() => startDM(u.id)}>
                  <div className="tb-dm-avatar-sm" style={{ background: d.bg, color: d.color }}>{u.initials}</div>
                  <span className="tb-nav-label">{u.name}</span>
                  {pending > 0 && <span className="tb-nav-badge tb-badge-amber">{pending}</span>}
                </div>
              );
            })}
          </div>

          <div className="tb-sidebar-footer">
            <div className="tb-me-avatar" style={{ background: deptMeta(currentUser.dept).bg, color: deptMeta(currentUser.dept).color }}>
              {currentUser.initials}
            </div>
            <div className="tb-me-info">
              <div className="tb-me-name">{currentUser.name}</div>
              <div className="tb-me-dept">{deptMeta(currentUser.dept).name}</div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="tb-main">
          {/* Topbar */}
          <div className="tb-topbar">
            <div className="tb-topbar-left">
              {activeDeptMeta && (
                <>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: activeDeptMeta.color }} />
                  <span className="tb-channel-name">{activeDeptMeta.name}</span>
                  <span className="tb-channel-meta">{users.filter(u => u.dept === activeDeptMeta.id).length} members</span>
                </>
              )}
              {activeDMUser && activeDMDept && (
                <>
                  <div style={{ width: 28, height: 28, background: activeDMDept.bg, color: activeDMDept.color, fontSize: 10, fontWeight: 600, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{activeDMUser.initials}</div>
                  <span className="tb-channel-name">{activeDMUser.name}</span>
                  <span className="tb-channel-meta">{activeDMDept.name}</span>
                </>
              )}
            </div>
            <div className="tb-topbar-actions">
              <button className="tb-icon-btn" title="Request approval" onClick={() => setShowApprovalModal(true)}>🧾</button>
              {totalPending > 0 && (
                <button className={`tb-icon-btn ${totalPending > 0 ? "alert" : ""}`} title="Pending approvals" onClick={() => { setActiveTab("approvals"); }}>
                  🔔{totalPending > 0 && <sup style={{ fontSize: 8, fontWeight: 700 }}>{totalPending}</sup>}
                </button>
              )}
              {activeChannel.type === "dept" && (
                <button className="tb-icon-btn" title="Members" onClick={() => setActiveTab("members")}>👥</button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="tb-tabs">
            {[
              { id: "messages", label: "Messages" },
              { id: "approvals", label: "Approvals", dot: channelPending() > 0 },
              ...(activeChannel.type === "dept" ? [{ id: "members", label: "Members" }] : [])
            ].map(t => (
              <button key={t.id} className={`tb-tab-btn${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                {t.label}{t.dot && <span className="tb-tab-dot" />}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === "messages" && (
            <>
              <div className="tb-chat-feed" ref={feedRef}>
                {channelMessages.length === 0 && (
                  <div className="tb-empty-state">
                    <span className="tb-empty-icon">💬</span>
                    <span className="tb-empty-text">No messages yet. Start the conversation!</span>
                  </div>
                )}
                {channelMessages.map(renderMessage)}
              </div>
              
              {chatAttachment && (
                <div className="tb-chat-attachment-preview-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--tb-surface)", borderTop: "1px solid var(--tb-border)", padding: "6px 20px", fontSize: 12.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--tb-accent)" }}>
                    <span>📎</span>
                    <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>{chatAttachment.filename}</span>
                  </div>
                  <button style={{ border: "none", background: "none", cursor: "pointer", color: "var(--tb-red)", fontWeight: "bold" }} onClick={() => setChatAttachment(null)}>✕</button>
                </div>
              )}
              
              <div className="tb-input-bar">
                <input
                  type="file"
                  ref={chatFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleChatFileChange}
                />
                <button className="tb-icon-btn" title="Attach file or photo" onClick={() => chatFileInputRef.current?.click()} disabled={uploadingFile}>
                  {uploadingFile ? "⏳" : "📎"}
                </button>
                <button className="tb-icon-btn" title="Request approval" onClick={() => setShowApprovalModal(true)}>🧾</button>
                <input
                  className="tb-chat-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={activeDMUser ? `Message ${activeDMUser.name}…` : `Message ${activeDeptMeta?.name || ""}…`}
                />
                <button className="tb-send-btn" onClick={sendMessage} disabled={!inputText.trim() && !chatAttachment}>➤</button>
              </div>
            </>
          )}
          {activeTab === "approvals" && <ApprovalsPanel />}
          {activeTab === "members" && activeChannel.type === "dept" && <MembersPanel />}
        </div>

        {/* ── NEW APPROVAL MODAL ── */}
        {showApprovalModal && (
          <div className="tb-modal-overlay" onClick={e => e.target === e.currentTarget && setShowApprovalModal(false)}>
            <div className="tb-modal">
              <div className="tb-modal-title">📋 Request Approval</div>
              
              <div className="tb-modal-target-indicator" style={{ background: "var(--tb-accent-bg)", color: "var(--tb-accent-dark)", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 14, fontWeight: 500 }}>
                Target: {activeChannel.type === "dept" ? `Team ${activeDeptMeta?.name}` : `Direct Message to ${activeDMUser?.name}`}
              </div>

              <div className="tb-form-row">
                <label className="tb-form-label">Subject / Title</label>
                <input className="tb-form-input" placeholder="e.g. Leave request, Budget proposal..." value={newApproval.title} onChange={e => setNewApproval(p => ({ ...p, title: e.target.value }))} />
              </div>
              
              <div className="tb-form-row">
                <label className="tb-form-label">Description / Instructions</label>
                <textarea 
                  className="tb-form-input" 
                  rows={3} 
                  placeholder="Explain what needs to be reviewed and approved..." 
                  value={newApproval.description} 
                  onChange={e => setNewApproval(p => ({ ...p, description: e.target.value }))} 
                  style={{ resize: "none" }}
                />
              </div>

              <div className="tb-form-row">
                <label className="tb-form-label">Document / Photo Attachment</label>
                <input
                  type="file"
                  ref={modalFileInputRef}
                  style={{ display: "none" }}
                  onChange={handleModalFileChange}
                />
                {newApproval.attachment ? (
                  <div className="tb-modal-attachment-preview" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--tb-surface2)", padding: "6px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "var(--tb-text)" }}>
                      📎 {newApproval.attachment.filename}
                    </span>
                    <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tb-red)", fontWeight: "bold", marginLeft: 8 }} onClick={() => setNewApproval(p => ({ ...p, attachment: null }))}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button type="button" className="tb-btn-secondary" style={{ padding: "8px", fontSize: 12 }} onClick={() => modalFileInputRef.current?.click()} disabled={modalUploadingFile}>
                    {modalUploadingFile ? "⏳ Uploading..." : "📁 Choose File / Photo"}
                  </button>
                )}
              </div>

              <div className="tb-form-row-checkbox" style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
                <input 
                  type="checkbox" 
                  id="tb-auto-reminder-chk"
                  checked={newApproval.autoReminder} 
                  onChange={e => setNewApproval(p => ({ ...p, autoReminder: e.target.checked }))} 
                  style={{ cursor: "pointer" }}
                />
                <label htmlFor="tb-auto-reminder-chk" style={{ fontSize: 12.5, fontWeight: 500, cursor: "pointer", color: "var(--tb-text)" }}>
                  Enable Auto-Reminder
                </label>
              </div>

              {newApproval.autoReminder && (
                <div className="tb-form-row">
                  <label className="tb-form-label">Reminder Frequency</label>
                  <select className="tb-form-select" value={newApproval.reminderInterval} onChange={e => setNewApproval(p => ({ ...p, reminderInterval: parseInt(e.target.value) }))}>
                    <option value={1}>Every 1 minute (for testing)</option>
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                    <option value={720}>Every 12 hours</option>
                    <option value={1440}>Every 24 hours</option>
                  </select>
                </div>
              )}

              <div className="tb-modal-btns">
                <button className="tb-btn-secondary" onClick={() => setShowApprovalModal(false)}>Cancel</button>
                <button className="tb-btn-primary" onClick={submitApproval} disabled={!newApproval.title.trim()}>Send for Approval</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
