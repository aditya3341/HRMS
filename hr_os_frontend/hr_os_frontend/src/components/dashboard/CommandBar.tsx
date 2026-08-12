import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Command, 
  Zap, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  Terminal,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const CommandBar: React.FC = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.toLowerCase();
    
    if (q.includes("leave")) navigate("/leaves/apply");
    else if (q.includes("payroll")) navigate("/payroll");
    else if (q.includes("attendance")) navigate("/attendance");
    else if (q.includes("help") || q.includes("chat")) navigate("/zipadesk");
    else if (q.includes("profile")) navigate(`/employees/${user?.employee_id || user?.user_id}`);
    
    setQuery("");
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-10 relative z-40 group">
      <motion.form 
        onSubmit={handleCommand}
        animate={{ 
          scale: isFocused ? 1.02 : 1,
          y: isFocused ? -2 : 0 
        }}
        className={`relative flex items-center bg-white/[0.04] border border-white/10 rounded-[2rem] p-1.5 transition-all duration-300 ${
          isFocused ? 'ring-2 ring-primary/20 border-primary/30 shadow-[0_0_40px_-5px_rgba(var(--primary-rgb),0.1)]' : 'hover:bg-white/[0.06] hover:border-white/20'
        }`}
      >
        <div className="w-10 h-10 flex items-center justify-center text-slate-500 group-focus-within:text-primary transition-colors">
          <Search className="w-5 h-5" />
        </div>
        
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Type a command or search (e.g. '/leave', 'view payslip')..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-600 pl-2 h-11"
        />

        <div className="flex items-center gap-2 pr-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
          <button 
             type="submit"
             className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-all hover:scale-110 active:scale-95"
          >
             <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.form>

      {/* QUICK COMMAND SUGGESTIONS (VISIBLE ON FOCUS) */}
      <AnimatePresence>
        {isFocused && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-3 p-3 bg-slate-900/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-wrap gap-2"
          >
            {[
              { label: "Apply for Leave", cmd: "/leave", icon: Zap },
              { label: "View Team Attendance", cmd: "/team", icon: Terminal },
              { label: "Ask AI Assistant", cmd: "/chat", icon: MessageSquare },
              { label: "Payroll History", cmd: "/payroll", icon: Sparkles },
            ].map((s, i) => (
              <button 
                key={i}
                type="button"
                onClick={() => { setQuery(s.cmd); }}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-primary/20 hover:border-primary/30 transition-all group/item"
              >
                <s.icon className="w-3.5 h-3.5 text-slate-500 group-hover/item:text-primary transition-colors" />
                <span className="text-xs font-bold text-slate-300 group-hover/item:text-white transition-colors tracking-tight">{s.label}</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest ml-1">{s.cmd}</span>
                <ChevronRight className="w-3 h-3 text-slate-800 group-hover/item:text-primary transition-colors ml-auto translate-x-1" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
