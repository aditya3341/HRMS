import api from "@/lib/api";

export type ChatResponseType = "text" | "table" | "form";

export interface ChatResponse {
  answer: string;
  type: ChatResponseType;
  data: any;
}

export interface ProactiveResponse {
  signals: string[];
}

export const chatbotService = {
  /**
   * Sends a message to the AI Chatbot backend.
   */
  sendMessage: async (message: string): Promise<ChatResponse> => {
    return await api.post("/chat/query", { message });
  },

  /**
   * Fetches proactive alerts for the current user.
   */
  getProactiveSignals: async (): Promise<ProactiveResponse> => {
    return await api.get("/chat/proactive");
  }
};
