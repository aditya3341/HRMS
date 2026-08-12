import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Chatbot from "./chatbot/Chatbot";
import NotificationBell from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  User, 
  Settings, 
  ShieldCheck, 
  MessageSquare, 
  Users2, 
  UserRound, 
  Moon, 
  Sun, 
  Search, 
  Info,
  Fingerprint,
  ClipboardCheck,
  Sparkles,
  Bot
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { hasRole, cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") || "chats";
  const isTeamPage = location.pathname === "/team";

  const [themeMode, setThemeMode] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavToTeam = (tab: "chats" | "channels" | "contacts") => {
    navigate(`/team?tab=${tab}`);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/team?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      navigate("/team");
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", themeMode);
  }, [themeMode]);

  const displayName = user?.email 
    ? (user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1))
    : "User";

  const triggerChatOpen = () => {
    window.dispatchEvent(new CustomEvent('toggle-chatbot'));
  };

  const handleSystemInfo = () => {
    toast("System Status: Operational", {
      description: (
        <div className="mt-2 space-y-1 text-xs">
          <p><strong>Version:</strong> v1.2.0 (Zipa OS)</p>
          <p><strong>Environment:</strong> Local Development</p>
          <p><strong>Active Session:</strong> {displayName} ({user?.role})</p>
          <p><strong>Core Engine:</strong> React 18 + Vite + Tailwind</p>
        </div>
      ),
      duration: 5000,
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/30 pb-14">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Section */}
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-end px-8 gap-4">
           <NotificationBell />
           <div className="flex items-center gap-3 pr-2 border-r border-border h-8">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-foreground leading-tight">{displayName}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{user?.role}</span>
              </div>
           </div>

           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-white/5 ring-1 ring-white/10 transition-all overflow-hidden group">
                 <Avatar className="h-10 w-10 rounded-full border border-white/10 group-hover:scale-105 transition-transform">
                   <AvatarImage src={user?.avatar_url || "/zipaworld_logo_light.png"} />
                   <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                     {user?.email?.[0].toUpperCase()}
                   </AvatarFallback>
                 </Avatar>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent className="w-56 bg-card border-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200" align="end" sideOffset={8}>
               <DropdownMenuLabel className="px-2 py-3">
                 <div className="flex flex-col space-y-1">
                   <p className="text-xs font-semibold leading-none text-foreground">{displayName}</p>
                   <p className="text-[10px] leading-none text-muted-foreground mt-1 truncate">{user?.email}</p>
                 </div>
               </DropdownMenuLabel>
               <DropdownMenuSeparator className="bg-border opacity-50" />
               <DropdownMenuItem 
                 onClick={() => navigate(`/employees/${user?.employee_id || user?.user_id}`)}
                 className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
               >
                 <User className="w-4 h-4 text-muted-foreground" />
                 View Profile
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={() => navigate("/admin/system-settings")}
                 className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
               >
                 <Settings className="w-4 h-4 text-muted-foreground" />
                 Account Settings
               </DropdownMenuItem>
                {hasRole(user?.role, ['SUPER_ADMIN']) && (
                  <DropdownMenuItem 
                    onClick={() => navigate("/command-center")}
                    className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                  >
                     <ShieldCheck className="w-4 h-4 text-primary" />
                     Admin Panel
                  </DropdownMenuItem>
                )}
                {hasRole(user?.role, ['SUPER_ADMIN', 'HR_ADMIN']) && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => navigate("/admin/biometric-devices")}
                      className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                    >
                      <Fingerprint className="w-4 h-4 text-muted-foreground" />
                      Biometric Config
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/admin/system-settings")}
                      className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                      System Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/admin/config")}
                      className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      System Config
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/command-center")}
                      className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Command Center
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => navigate("/admin/settings/ai")}
                      className="rounded-lg text-xs py-2 focus:bg-white/5 cursor-pointer flex gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      AI Control Hub
                    </DropdownMenuItem>
                  </>
                )}
               <DropdownMenuSeparator className="bg-border opacity-50" />
               <DropdownMenuItem 
                 onClick={logout}
                 className="rounded-lg text-xs py-2 focus:bg-destructive/10 text-destructive focus:text-destructive cursor-pointer flex gap-2"
               >
                 <LogOut className="w-4 h-4" />
                 Log out
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
        </header>

        {/* Fixed Background Watermark (Rendered behind all pages) */}
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0 opacity-[0.035]">
          {/* Light Mode Watermark */}
          <img 
            src="/zipaworld_logo_light.png?v=4" 
            alt="zipaworld Watermark Light" 
            className="w-[500px] h-auto object-contain translate-x-0 md:translate-x-[128px] mix-blend-multiply dark:hidden" 
          />
          {/* Dark Mode Watermark */}
          <img 
            src="/zipaworld_logo_dark.png?v=4" 
            alt="zipaworld Watermark Dark" 
            className="w-[500px] h-auto object-contain translate-x-0 md:translate-x-[128px] mix-blend-screen hidden dark:block" 
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-8 relative overflow-x-hidden min-h-[calc(100vh-4rem)] z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
          <Chatbot />
        </main>
      </div>

      {/* ── PERSISTENT TEAMBRIDGE & STATUS BOTTOM DOCK ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-slate-950/90 dark:bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-2xl flex items-center justify-between px-6 md:px-8 z-50 select-none shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
        
        {/* Left Side TeamBridge Nav Buttons */}
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Chats Button -> redirects to TeamBridge */}
          <button
            onClick={() => handleNavToTeam("chats")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 group relative",
              isTeamPage && currentTab === "chats"
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            title="Open TeamBridge Chats"
          >
            <MessageSquare className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span>Chats</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Channels Button -> redirects to TeamBridge */}
          <button
            onClick={() => handleNavToTeam("channels")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 group relative",
              isTeamPage && currentTab === "channels"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            title="Open TeamBridge Channels"
          >
            <Users2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Channels</span>
          </button>

          {/* Contacts Button -> redirects to TeamBridge */}
          <button
            onClick={() => handleNavToTeam("contacts")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 group relative",
              isTeamPage && currentTab === "contacts"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            title="Open TeamBridge Contacts"
          >
            <UserRound className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Center Interactive Smart Search Box */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 md:w-80 lg:w-96 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            ref={searchInputRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search TeamBridge (Ctrl+Space)..."
            className="w-full pl-9 pr-14 h-9 bg-black/40 border border-white/10 text-xs rounded-xl focus:outline-none focus:border-primary/60 text-white placeholder-slate-400 transition-all font-medium focus:ring-1 focus:ring-primary/40 shadow-inner"
          />
          {searchValue ? (
            <button
              type="button"
              onClick={() => setSearchValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded pointer-events-none">
              Ctrl+Space
            </kbd>
          )}
        </form>

        {/* Right Side Tools & AI Assistant Launcher */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* AI Assistant Drawer Trigger Button */}
          <button
            onClick={triggerChatOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-purple-500/20 hover:from-primary/30 hover:via-indigo-500/30 hover:to-purple-500/30 border border-primary/30 rounded-xl text-xs font-bold text-primary dark:text-indigo-300 transition-all shadow-md hover:scale-105 active:scale-95 group"
            title="Launch AI Assistant Drawer"
          >
            <Bot className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="hidden lg:inline">AI Assistant</span>
          </button>

          {/* System Info */}
          <button
            onClick={handleSystemInfo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="System Info"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Toggle Light / Dark Mode"
          >
            {themeMode === "dark" ? (
              <Moon className="w-4 h-4 text-primary" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>

      </div>

    </div>
  );
}