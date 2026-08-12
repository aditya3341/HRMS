import { useState, useCallback, useEffect } from "react";
import { chatbotService, type ChatResponse } from "@/services/chatbotService";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  type: "text" | "table" | "form";
  data?: any;
  timestamp: string;
}

export function useChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  /**
   * Send a message to the bot
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      type: "text",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatbotService.sendMessage(text);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: "bot",
        type: response.type,
        data: response.data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I can't process your request right now. Please try again later.",
        sender: "bot",
        type: "text",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch proactive signals on load
   */
  useEffect(() => {
    if (user && messages.length === 0) {
      chatbotService.getProactiveSignals().then((res) => {
        if (res.signals && res.signals.length > 0) {
          const signals = res.signals.map((s, i) => ({
            id: `signal-${i}`,
            text: s,
            sender: "bot" as const,
            type: "text" as const,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(signals);
        } else {
             // Default greeting
             setMessages([{
                id: "welcome",
                text: `Hi ${user.email.split('@')[0]}! I'm your HR Assistant. How can I help you today?`,
                sender: "bot",
                type: "text",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
             }]);
        }
      }).catch(() => {
          // Fallback if proactive fails
          setMessages([{
             id: "welcome",
             text: "Hello! I'm your HR Assistant. How can I help you today?",
             sender: "bot",
             type: "text",
             timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
      });
    }
  }, [user]);

  return {
    messages,
    isLoading,
    isWindowOpen,
    setIsWindowOpen,
    sendMessage,
    setMessages
  };
}
