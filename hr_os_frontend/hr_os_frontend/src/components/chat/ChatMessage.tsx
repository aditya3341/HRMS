import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, User, CheckCircle2, AlertCircle, Info, Calendar, Clock, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ChatNode } from "@/lib/chatbotService";

interface ChatMessageProps {
  node: ChatNode;
}

export function ChatMessage({ node }: ChatMessageProps) {
  const isBot = node.sender === "bot";

  const renderContent = () => {
    switch (node.type) {
      case "table":
        return (
          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-white/5 uppercase tracking-widest font-black text-slate-500">
                <tr>
                  {Object.keys(node.metadata.rows[0] || {}).map((k) => (
                    <th key={k} className="px-3 py-2 border-b border-white/5">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {node.metadata.rows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    {Object.values(row).map((v: any, j: number) => (
                      <td key={j} className="px-3 py-2 text-slate-300">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "alert":
        const styles = {
          error: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          info: "bg-primary/10 border-primary/20 text-primary",
        };
        const style = styles[node.metadata?.severity as keyof typeof styles] || styles.info;
        
        return (
          <div className={cn("mt-2 p-3 rounded-xl border flex items-start gap-3", style)}>
            {node.metadata?.severity === "error" ? <AlertCircle className="w-4 h-4 mt-0.5" /> : <Info className="w-4 h-4 mt-0.5" />}
            <div className="space-y-1">
              <p className="text-xs font-bold leading-relaxed">{node.content}</p>
              {node.metadata?.link && (
                <a href={node.metadata.link} className="text-[10px] underline font-black uppercase tracking-widest hover:opacity-80 transition-opacity">
                  Take Action
                </a>
              )}
            </div>
          </div>
        );

      case "card":
        return (
          <div className="mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
             <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line prosetext">
               {node.content}
             </div>
          </div>
        );

      default:
        return <p className="text-sm leading-relaxed whitespace-pre-line">{node.content}</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex gap-3 mb-6",
        isBot ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
        isBot ? "bg-primary/20 border-primary/30 text-primary" : "bg-white/5 border-white/10 text-slate-400"
      )}>
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      <div className={cn(
        "max-w-[85%] space-y-1",
        isBot ? "items-start" : "items-end flex flex-col"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-3xl",
          isBot 
            ? "bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-none" 
            : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20"
        )}>
          {renderContent()}
        </div>
        <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">{node.timestamp}</span>
      </div>
    </motion.div>
  );
}
