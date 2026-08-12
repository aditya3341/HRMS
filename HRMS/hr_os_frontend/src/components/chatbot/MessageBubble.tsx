import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, User, Table } from "lucide-react";

interface MessageBubbleProps {
  text: string;
  sender: "user" | "bot";
  type: "text" | "table" | "form";
  data?: any;
  timestamp: string;
}

export function MessageBubble({ text, sender, type, data, timestamp }: MessageBubbleProps) {
  const isBot = sender === "bot";

  const renderContent = () => {
    if (type === "table" && data && Array.isArray(data)) {
      return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-[10px] leading-tight">
            <thead className="bg-slate-50 uppercase tracking-widest font-black text-slate-400">
              <tr>
                {Object.keys(data[0] || {}).map((k) => (
                  <th key={k} className="px-3 py-2 border-b border-slate-100 font-black">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {Object.values(row).map((v: any, j: number) => (
                    <td key={j} className="px-3 py-2 text-slate-600 font-medium">{String(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap",
        isBot ? "text-slate-800" : "text-white"
      )}>
        {text}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex gap-3 mb-5",
        isBot ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
        isBot ? "bg-white border-slate-200 text-primary" : "bg-primary border-primary text-white"
      )}>
        {isBot ? <Bot className="w-4 h-4 shadow-sm" /> : <User className="w-4 h-4" />}
      </div>

      <div className={cn(
        "max-w-[80%] space-y-1.5",
        isBot ? "items-start" : "items-end flex flex-col"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl shadow-sm border",
          isBot 
            ? "bg-white border-slate-100 rounded-tl-none" 
            : "bg-primary border-primary rounded-tr-none text-white shadow-indigo-200"
        )}>
           {renderContent()}
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">{timestamp}</span>
      </div>
    </motion.div>
  );
}
