import React, { useRef, useEffect, useState, useMemo } from "react";
import { 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  Mic, 
  Loader2, 
  MessageSquare, 
  Users2, 
  Search, 
  ArrowLeft, 
  UserCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { QuickActions } from "./QuickActions";
import { ActionForm } from "./ActionForm";
import { useChatbot } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TeamContact {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string | null;
  avatar_url: string | null;
}

interface TeamMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  timestamp: string;
}

export function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const { user } = useAuth();
  
  // Tab State: "ai" or "teambridge"
  const [activeTab, setActiveTab] = useState<"ai" | "teambridge">("ai");

  // AI Chatbot Hook
  const { messages: aiMessages, sendMessage: sendAiMessage, isLoading: aiLoading } = useChatbot();
  const [aiInputValue, setAiInputValue] = useState("");

  // TeamBridge DM State
  const [contacts, setContacts] = useState<TeamContact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<TeamContact | null>(null);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);
  const [teamInputValue, setTeamInputValue] = useState("");
  const [isTeamLoading, setIsTeamLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages, aiLoading, teamMessages, selectedContact, activeTab]);

  // Fetch Team Contacts
  useEffect(() => {
    if (isOpen && activeTab === "teambridge") {
      api.get<any>("/chat/employees")
        .then(res => {
          if (res?.success) setContacts(res.data);
        })
        .catch(console.error);
    }
  }, [isOpen, activeTab]);

  // Poll messages every 3 seconds while active chat is open
  useEffect(() => {
    if (!isOpen || activeTab !== "teambridge" || !selectedContact) return;

    const fetchMessages = () => {
      api.get<any>(`/chat/messages/${selectedContact.id}`)
        .then(res => {
          if (res?.success) {
            setTeamMessages(res.data);
          }
        })
        .catch(console.error);
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, selectedContact]);

  // Handle AI send
  const handleSendAi = () => {
    if (!aiInputValue.trim()) return;
    sendAiMessage(aiInputValue);
    setAiInputValue("");
  };

  // Handle DM send
  const handleSendTeam = () => {
    if (!teamInputValue.trim() || !selectedContact) return;
    const text = teamInputValue.trim();
    setTeamInputValue("");

    api.post<any>("/chat/messages", {
      recipient_id: selectedContact.id,
      content: text
    }).then(res => {
      if (res?.success) {
        // Optimistic append
        setTeamMessages(prev => [...prev, res.data]);
      }
    }).catch(console.error);
  };

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    return contacts.filter(c => 
      c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
      (c.department && c.department.toLowerCase().includes(contactSearch.toLowerCase()))
    );
  }, [contacts, contactSearch]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed bottom-24 right-8 w-[420px] h-[640px] bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col z-[60] overflow-hidden backdrop-blur-xl"
        >
          {/* Header Area */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                {activeTab === "ai" ? <Bot className="w-5 h-5 text-primary" /> : <Users2 className="w-5 h-5 text-indigo-400" />}
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest">
                  {activeTab === "ai" ? "HR AI Assistant" : "TeamBridge Workspace"}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Logged In</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Unified Tab Switcher */}
          <div className="grid grid-cols-2 border-b border-white/10 bg-black/25 p-1.5 gap-1.5">
            <button
              onClick={() => {
                setActiveTab("ai");
                setSelectedContact(null);
              }}
              className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === "ai" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab("teambridge")}
              className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                activeTab === "teambridge" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              TeamBridge DMs
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: AI ASSISTANT CHAT                                                  */}
          {/* ========================================================================= */}
          {activeTab === "ai" && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={scrollRef}>
                {aiMessages.map((m) => (
                  <React.Fragment key={m.id}>
                    <MessageBubble {...m} />
                    {m.type === "form" && m.data && (
                      <ActionForm 
                        form_type={m.data.form_type} 
                        fields={m.data.fields}
                        onSuccess={() => sendAiMessage("Process my request now.")}
                      />
                    )}
                  </React.Fragment>
                ))}
                {aiLoading && (
                  <div className="flex gap-3 mb-6 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0" />
                    <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-white/10 bg-black/40 space-y-3">
                <QuickActions onAction={sendAiMessage} />
                <div className="relative">
                  <Input
                    placeholder="Ask HR AI Assistant..."
                    className="h-12 bg-white/5 border-white/5 rounded-2xl pr-24 pl-5 text-xs text-white"
                    value={aiInputValue}
                    onChange={(e) => setAiInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendAi()}
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={handleSendAi}
                      className="bg-primary text-white h-9 w-9 p-0 rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TEAMBRIDGE INTERDEPARTMENTAL DMS                                   */}
          {/* ========================================================================= */}
          {activeTab === "teambridge" && (
            <>
              {!selectedContact ? (
                // 2.1 CONTACT LIST VIEW
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <Input
                        placeholder="Search contact or department..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="pl-9 h-9 bg-black/40 border-white/5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredContacts.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 text-xs">
                        No active employees found.
                      </div>
                    ) : (
                      filteredContacts.map(contact => (
                        <div
                          key={contact.id}
                          onClick={() => {
                            setSelectedContact(contact);
                            setTeamMessages([]);
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer"
                        >
                          <Avatar className="w-9 h-9 border border-white/5">
                            <AvatarImage src={contact.avatar_url || "/zipaworld_logo_light.png"} />
                            <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">{contact.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white">{contact.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 truncate">
                              {contact.designation} • {contact.department || "Staff"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // 2.2 DM CONVERSATION SCREEN
                <div className="flex-1 flex flex-col overflow-hidden bg-black/20">
                  <div className="p-3 bg-white/[0.02] border-b border-white/10 flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedContact(null)}
                      className="h-8 w-8 text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-8 h-8 border border-white/5">
                      <AvatarImage src={selectedContact.avatar_url || "/zipaworld_logo_light.png"} />
                      <AvatarFallback className="text-xs font-bold">{selectedContact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">{selectedContact.name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{selectedContact.email}</p>
                    </div>
                  </div>

                  {/* Messages Bubble Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                    {teamMessages.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 text-xs italic">
                        No messages yet. Send a direct message to start conversing!
                      </div>
                    ) : (
                      teamMessages.map(msg => {
                        const isMe = msg.sender_id !== selectedContact.id;
                        return (
                          <div 
                            key={msg.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-md border ${
                              isMe 
                                ? "bg-primary border-primary/20 text-white rounded-tr-none" 
                                : "bg-white/[0.04] border-white/5 text-slate-200 rounded-tl-none"
                            }`}>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat Input composer */}
                  <div className="p-4 border-t border-white/10 bg-black/40">
                    <div className="relative">
                      <Input
                        placeholder={`Message ${selectedContact.name.split(" ")[0]}...`}
                        value={teamInputValue}
                        onChange={(e) => setTeamInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendTeam()}
                        className="h-10 bg-white/5 border-white/5 rounded-xl pr-14 pl-4 text-xs text-white"
                      />
                      <Button
                        onClick={handleSendTeam}
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-10 bg-primary hover:bg-primary/80 rounded-lg p-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
