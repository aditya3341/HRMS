import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, Sparkles, Wand2, Mic, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { ChatMessage } from "./ChatMessage";
import { ActionForm } from "./ActionForm";
import { chatbotService, type ChatNode } from "@/lib/chatbotService";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<ChatNode[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (messages.length === 0 && user) {
      setMessages([
        {
          type: "text",
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: `Hi ${user.email.split('@')[0]}! I'm your HR Assistant. How can I help you today?`
        }
      ]);

      // Load proactive signals
      chatbotService.getProactiveSignals(user).then(setMessages);
    }
  }, [user]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const message = text || inputValue;
    if (!message.trim() || !user) return;

    const userNode: ChatNode = {
      type: "text",
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: message
    };

    setMessages(prev => [...prev, userNode]);
    setInputValue("");
    setIsTyping(true);

    // Bot processing
    const botResponse = await chatbotService.processChat(message, user);
    setTimeout(() => {
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 600);
  };

  const quickActions = {
    EMPLOYEE: ["Apply leave", "My leave balance", "Attendance summary", "Laptop assigned to me"],
    MANAGER: ["Who is on leave today?", "Team attendance", "Pending approvals", "Apply leave"],
    HR_ADMIN: ["Fraud alerts", "Top performers", "Payroll summary", "Employees absent today"],
    SUPER_ADMIN: ["System health", "Audit logs", "Fraud signals", "Config check"]
  };

  const actions = quickActions[user?.role as keyof typeof quickActions] || quickActions.EMPLOYEE;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-8 w-[400px] h-[600px] bg-[#0A0B10] border border-white/10 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-gradient-to-r from-primary/10 to-purple-600/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/20">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0A0B10]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest font-display">HR Assistant</h4>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter">AI Online</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((m, i) => (
                <React.Fragment key={i}>
                  <ChatMessage node={m} />
                  {m.type === "form" && (
                    <ActionForm
                      formType={m.metadata.formType}
                      fields={m.metadata.fields}
                      onComplete={() => setMessages(prev => [...prev, {
                        type: "text",
                        sender: "bot",
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        content: "Got it! Your request has been processed successfully."
                      }])}
                    />
                  )}
                </React.Fragment>
              ))}
              {isTyping && (
                <div className="flex gap-3 mb-6 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0" />
                  <div className="px-4 py-3 bg-white/[0.04] rounded-3xl rounded-tl-none flex gap-1">
                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions (Carousel) */}
          <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01]">
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {actions.map(action => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className="shrink-0 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-bold text-slate-300 hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all uppercase tracking-widest"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Input */}
          <div className="p-5 bg-[#0D0E14] border-t border-white/10">
            <div className="relative group">
              <Input
                placeholder="Ask anything..."
                className="bg-black/40 border-white/10 h-12 pr-24 rounded-2xl focus:border-primary transition-all text-sm pl-4 text-white"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button className="p-2 text-slate-500 hover:text-white transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <Button
                  onClick={() => handleSend()}
                  size="sm"
                  className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
