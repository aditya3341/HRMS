import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { ChatButton } from "./ChatButton";
import { ChatPanel } from "./ChatPanel";

export function ChatAssistant() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);

  // Fetch Config
  const { data: config } = useQuery({
    queryKey: ["chatbot-config"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/configs/CHATBOT_UI_CONFIG");
        return res.data?.config_value ?? res.config_value ?? { enabled: true };
      } catch {
        return { enabled: true }; // Default to true if not set
      }
    }
  });

  if (config?.enabled === false) return null;
  
  return (
    <>
      <ChatButton 
        isOpen={isOpen} 
        onClick={() => {
            setIsOpen(!isOpen);
            setHasUnread(false);
        }} 
        hasUnread={hasUnread} 
      />
      <ChatPanel 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
