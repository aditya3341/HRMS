import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Bot, Sparkles, X, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatButton({ isOpen, onClick, hasUnread }: ChatButtonProps) {
  return (
    <div className="fixed bottom-8 right-8 z-[60]">
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl relative overflow-hidden group",
          isOpen 
            ? "bg-rose-500 text-white shadow-rose-500/20" 
            : "bg-primary text-white shadow-primary/20"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
               <Bot className="w-6 h-6" />
               <Sparkles className="w-2 h-2 absolute -top-1 -right-1 text-white animate-pulse" />
               {hasUnread && !isOpen && (
                 <span className="absolute -top-2 -right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#0A0B10] animate-bounce" />
               )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-full" />
      </motion.button>

      {/* Label Tooltip */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-2xl pointer-events-none"
          >
             HR Assistant
             <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 border-r border-t border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
