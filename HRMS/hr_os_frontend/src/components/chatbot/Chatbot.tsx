import React, { useState } from "react";
import { MessageSquare, Bot, X, Sparkles, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatWindow } from "./ChatWindow";
import { cn } from "@/lib/utils";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-chatbot', handleToggle);
  }, []);

  return (
    <>
      <div className="fixed bottom-20 right-8 z-[60]">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-[0_10px_40px_rgba(99,102,241,0.3)] relative overflow-hidden group border",
            isOpen 
              ? "bg-rose-500 border-rose-400 text-white shadow-rose-500/20" 
              : "bg-primary border-primary/20 text-white shadow-primary/20"
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
                 <Sparkles className="w-3 h-3 absolute -top-1.5 -right-1.5 text-white animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Subtle Glow */}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-full" />
        </motion.button>

        {/* Floating Label */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: 0.5 }}
              className="absolute right-20 top-1/2 -translate-y-1/2 whitespace-nowrap px-4 py-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-xl pointer-events-none"
            >
               HR Assistant
               <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-r border-t border-slate-200 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
