import { useState, useRef, useEffect } from "react";
import { Ticket, useAddComment, useUpdateTicket, useAssignTicket } from "@/lib/ticketApi";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/adminApi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, Clock, CheckCircle2, History, UserPlus, 
  ShieldCheck, AlertTriangle, PlayCircle, CheckCheck,
  Calendar, Info, Timer
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

interface TicketThreadProps {
  ticket: Ticket;
}

export default function TicketThread({ ticket }: TicketThreadProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [activeView, setActiveView] = useState<"chat" | "timeline">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const addComment = useAddComment(ticket.id);
  const updateTicket = useUpdateTicket(ticket.id);
  const assignTicket = useAssignTicket(ticket.id);
  
  const { data: employees } = useQuery({
     queryKey: ['admin-users-search', ''],
     queryFn: () => adminApi.searchUsers(''),
     enabled: true
  });

  const isAdmin = ["super_admin", "hr_admin", "manager"].includes(user?.role?.toLowerCase() ?? "");

  const handleSend = async () => {
    if (!comment.trim()) return;
    await addComment.mutateAsync(comment);
    setComment("");
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket.comments, activeView]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <Clock className="w-5 h-5 text-red-500" />;
      case "IN_PROGRESS": return <PlayCircle className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "RESOLVED": return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case "CLOSED": return <CheckCheck className="w-5 h-5 text-slate-500" />;
      default: return null;
    }
  };

  const getSLAInfo = () => {
    if (!ticket.sla_deadline) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diff = differenceInMinutes(deadline, now);
    
    let color = "text-emerald-400";
    let bg = "bg-emerald-500/10 border-emerald-500/20";
    if (diff < 0) { color = "text-red-400"; bg = "bg-red-500/20 border-red-500/30"; }
    else if (diff < 60) { color = "text-orange-400"; bg = "bg-orange-500/20 border-orange-500/30"; }
    
    return {
       diff,
       label: diff < 0 ? "SLA BREACHED" : `SLA Deadline: ${format(deadline, "MMM d, h:mm a")}`,
       deadline: format(deadline, "PPp"),
       color,
       bg
    };
  };

  const sla = getSLAInfo();

  return (
    <div className="flex flex-col h-full bg-[#020617]">
      {/* Premium Header */}
      <div className="p-8 border-b border-white/5 space-y-6 relative overflow-hidden backdrop-blur-3xl bg-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -translate-y-32 translate-x-32" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-3">
             <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1 rounded-xl text-[10px] font-black tracking-[0.2em]">
                  {ticket.category}
                </Badge>
                <div className="flex items-center gap-2 group">
                   <div className={`p-1 rounded-lg group-hover:scale-110 transition-transform`}>
                     {getStatusIcon(ticket.status)}
                   </div>
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{ticket.status.replace('_', ' ')}</span>
                </div>
             </div>
             <h2 className="text-3xl font-black text-white leading-[1.1] tracking-tight max-w-lg italic">
               {ticket.title}
             </h2>
          </div>

          <div className="text-right flex flex-col items-end gap-3">
             <Badge className={`rounded-xl px-4 py-2 font-black text-xs tracking-tighter ${ticket.priority === 'HIGH' ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' : 'bg-slate-800 text-slate-400'}`}>
               {ticket.priority} PRIORITY
             </Badge>
             {sla && (
               <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${sla.bg} ${sla.color} text-[10px] font-black tracking-tight`}>
                  <Timer className="w-3.5 h-3.5" />
                  {sla.label}
               </div>
             )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
           <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10 ring-2 ring-blue-500/20">
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-black text-white">
                  {ticket.created_by_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Requested By</span>
                 <span className="text-sm font-bold text-white tracking-tight">{ticket.created_by_name}</span>
                 <span className="text-[10px] text-slate-500 font-medium">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
              </div>
           </div>

           <div className="flex items-center gap-4">
              <div className="h-10 w-px bg-white/5" />
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 text-right">Owner</span>
                 {ticket.assigned_to_name ? (
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold text-white tracking-tight">{ticket.assigned_to_name}</span>
                       <Avatar className="w-6 h-6 border border-blue-500/30">
                          <AvatarFallback className="bg-slate-800 text-[8px] font-black text-blue-400 uppercase">
                            {ticket.assigned_to_name.charAt(0)}
                          </AvatarFallback>
                       </Avatar>
                    </div>
                 ) : (
                    <span className="text-xs font-bold text-slate-600 italic">Unassigned</span>
                 )}
              </div>
              
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="w-8 h-8 rounded-xl border-white/10 hover:bg-white/10">
                       <UserPlus className="w-4 h-4 text-blue-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-900/95 border-white/10 backdrop-blur-xl rounded-2xl p-2 text-white shadow-2xl">
                     <DropdownMenuLabel className="text-[10px] uppercase font-black text-slate-500 tracking-widest px-2 py-2">Quick Assign</DropdownMenuLabel>
                     <DropdownMenuItem 
                        onClick={() => assignTicket.mutate(user?.employee_id || '')}
                        className="rounded-xl focus:bg-blue-600 group"
                      >
                       <UserPlus className="w-3.5 h-3.5 mr-2 text-blue-400 group-focus:text-white" />
                       <span className="text-xs font-bold">Assign to Me</span>
                     </DropdownMenuItem>
                     <DropdownMenuSeparator className="bg-white/5" />
                     {employees?.slice(0, 5).map((e: any) => (
                       <DropdownMenuItem 
                         key={e.id} 
                         onClick={() => assignTicket.mutate(e.id)}
                         className="rounded-xl focus:bg-white/10"
                       >
                         <span className="text-xs">{e.email}</span>
                       </DropdownMenuItem>
                     ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-[#020617]/50">
        <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="flex-1 flex flex-col min-h-0">
          <div className="bg-white/[0.02] border-b border-white/5 px-8">
            <TabsList className="bg-transparent gap-8 h-14 p-0">
              <TabsTrigger 
                value="chat" 
                className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent text-slate-500 data-[state=active]:text-white transition-all gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Conversation</span>
                {(ticket.comments?.length ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-black ring-1 ring-blue-500/20">
                     {ticket.comments?.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="timeline"
                className="bg-transparent p-0 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent text-slate-500 data-[state=active]:text-white transition-all gap-2"
              >
                <History className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Activity Audit</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 min-h-0 relative">
             <ScrollArea className="h-full px-8 py-6">
                <div className="space-y-8 pb-10">
                   {/* Description Card */}
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                     className="bg-blue-600/5 ring-1 ring-blue-500/10 rounded-3xl p-6 relative overflow-hidden"
                   >
                      <div className="absolute top-4 right-4 text-blue-500/20 font-black italic text-4xl select-none">ISSUE</div>
                      <div className="flex items-start gap-4">
                         <Info className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                         <p className="text-slate-200 text-sm leading-relaxed font-medium">
                           {ticket.description}
                         </p>
                      </div>
                   </motion.div>

                   <div className="space-y-6">
                      {ticket.comments?.map((c, i) => (
                        <motion.div 
                          key={c.id} 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex gap-4 group"
                        >
                          <Avatar className="w-9 h-9 border border-white/5 ring-4 ring-slate-900">
                             <AvatarFallback className="bg-slate-800 text-[10px] font-black text-slate-400 uppercase">
                                {c.author_name?.charAt(0)}
                             </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white tracking-tight">{c.author_name}</span>
                                <span className="text-[10px] font-medium text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-widest font-mono">
                                   {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                </span>
                             </div>
                             <div className="bg-white/5 ring-1 ring-white/5 rounded-3xl rounded-tl-none p-4 text-slate-300 text-sm leading-relaxed shadow-xl">
                                {c.message}
                             </div>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={scrollRef} />
                   </div>
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 min-h-0">
             <ScrollArea className="h-full px-12 py-10">
                <div className="space-y-12">
                   {ticket.activities?.length === 0 ? (
                      <div className="py-20 text-center opacity-30">
                         <History className="w-12 h-12 mx-auto mb-4" />
                         <p className="text-sm font-black tracking-widest uppercase">No activities recorded</p>
                      </div>
                   ) : (
                      ticket.activities?.map((a, i) => (
                         <div key={a.id} className="relative pl-12">
                            {/* Pipeline Line */}
                            {i < (ticket.activities?.length ?? 0) - 1 && (
                               <div className="absolute left-[19px] top-6 bottom-[-48px] w-0.5 bg-gradient-to-b from-blue-500/50 via-indigo-500/30 to-transparent" />
                            )}
                            
                            {/* Marker Icon */}
                            <div className="absolute left-0 top-0 w-10 h-10 rounded-2xl bg-slate-900 ring-1 ring-white/10 flex items-center justify-center shadow-lg border-t border-white/5 z-10">
                               {a.activity_type === 'CREATED' && <Calendar className="w-4 h-4 text-emerald-400" />}
                               {a.activity_type === 'ASSIGNED' && <UserPlus className="w-4 h-4 text-blue-400" />}
                               {a.activity_type === 'STATUS_CHANGED' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                               {a.activity_type === 'COMMENTED' && <Send className="w-4 h-4 text-amber-400" />}
                               {a.activity_type === 'ESCALATED' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                            </div>

                            <div className="space-y-1.5 pt-1">
                               <div className="flex items-center gap-3">
                                  <h4 className="text-sm font-black text-white uppercase tracking-widest">
                                     {a.activity_type.replace('_', ' ')}
                                  </h4>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                     {format(new Date(a.created_at), "MMM d, HH:mm")}
                                  </span>
                               </div>
                               <p className="text-slate-400 text-sm font-medium">{a.description}</p>
                               <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Actor:</span>
                                  <span className="text-[10px] font-bold text-slate-300">{a.actor_name}</span>
                               </div>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modern Status Control Bar */}
      {isAdmin && (
        <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Quick Actions</span>
              <div className="flex gap-2">
                 {ticket.status !== "IN_PROGRESS" && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                   <Button 
                     size="sm" 
                     className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 font-black text-[10px] tracking-widest uppercase h-8 px-4"
                     onClick={() => updateTicket.mutate({ status: "IN_PROGRESS" })}
                     disabled={updateTicket.isPending}
                   >
                     Process
                   </Button>
                 )}
                 {ticket.status === "IN_PROGRESS" && (
                   <Button 
                     size="sm" 
                     className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 font-black text-[10px] tracking-widest uppercase h-8 px-4"
                     onClick={() => updateTicket.mutate({ status: "RESOLVED" })}
                     disabled={updateTicket.isPending}
                   >
                     Complete
                   </Button>
                 )}
                 {(ticket.status === "RESOLVED" || ticket.status === "OPEN") && (
                   <Button 
                     size="sm" 
                     variant="outline"
                     className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] tracking-widest uppercase h-8 px-4"
                     onClick={() => updateTicket.mutate({ status: "CLOSED" })}
                     disabled={updateTicket.isPending}
                   >
                     Close File
                   </Button>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-2 text-slate-500">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em] leading-none">Security Protocol Active</span>
           </div>
        </div>
      )}

      {/* Input Section - Chat Only */}
      <AnimatePresence>
        {activeView === "chat" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="p-6 bg-[#020617] border-t border-white/5"
          >
            <div className="relative group max-w-4xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur group-focus-within:blur-xl transition-all opacity-0 group-focus-within:opacity-100" />
              <Textarea
                placeholder="Collaborate on this request..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="relative min-h-[100px] bg-slate-900/50 border-white/5 focus:border-blue-500/50 rounded-3xl pr-16 p-6 resize-none text-white placeholder:text-slate-600 transition-all text-sm font-medium ring-1 ring-white/5 shadow-2xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button 
                size="icon" 
                className="absolute right-4 bottom-4 rounded-2xl bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-600/40 transition-all active:scale-95 h-10 w-10 flex items-center justify-center"
                onClick={handleSend}
                disabled={!comment.trim() || addComment.isPending}
              >
                <div className="relative">
                   <Send className="w-4 h-4 text-white" />
                   {addComment.isPending && (
                     <div className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   )}
                </div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
