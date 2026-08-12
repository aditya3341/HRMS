import React from "react";
import { Ticket } from "@/lib/ticketApi";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, User, Tag, AlertCircle, Timer } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TicketCardProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
}

const TicketCard = React.forwardRef<HTMLDivElement, TicketCardProps>(({ ticket, onClick }, ref) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH": return "text-red-400 bg-red-400/10 border-red-400/20 shadow-red-500/10";
      case "MEDIUM": return "text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-amber-500/10";
      case "LOW": return "text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-blue-500/10";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-red-500/20 text-red-100 border-red-500/30";
      case "IN_PROGRESS": return "bg-blue-500/20 text-blue-100 border-blue-500/30";
      case "RESOLVED": return "bg-emerald-500/20 text-emerald-100 border-emerald-500/30";
      case "CLOSED": return "bg-slate-700/50 text-slate-300 border-white/10";
      default: return "";
    }
  };

  const getSLALabel = () => {
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return null;
    if (!ticket.sla_deadline) return null;
    
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diff = differenceInMinutes(deadline, now);
    
    if (diff < 0) return { label: "BREACHED", color: "bg-red-600 text-white" };
    if (diff < 60) return { label: `${diff}m left`, color: "bg-orange-500 text-white" };
    if (diff < 360) return { label: `${Math.round(diff/60)}h left`, color: "bg-yellow-500 text-black" };
    return { label: "ON TRACK", color: "bg-emerald-600 text-white" };
  };

  const sla = getSLALabel();

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(ticket)}
      className="cursor-pointer"
      ref={ref}
    >
      <Card className={`p-6 bg-slate-900/40 border-white/5 backdrop-blur-xl hover:bg-slate-800/60 transition-all duration-500 rounded-3xl group relative overflow-hidden ring-1 ring-white/5 shadow-2xl`}>
        {/* Glow Effects */}
        <div className={`absolute -right-16 -top-16 w-32 h-32 blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity ${getPriorityColor(ticket.priority).split(' ')[0].replace('text-', 'bg-')}`} />
        
        {/* Priority Sidebar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(ticket.priority).split(' ')[0].replace('text-', 'bg-')} opacity-60`} />
        
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <h3 className="font-black text-xl text-white group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tight">
                {ticket.title}
              </h3>
              <p className="text-xs font-medium text-slate-400 line-clamp-2 leading-relaxed">
                {ticket.description}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
               <Badge className={`${getStatusColor(ticket.status)} rounded-xl font-black px-3 py-1 text-[10px] tracking-widest shadow-lg`}>
                 {ticket.status.replace('_', ' ')}
               </Badge>
               {sla && (
                 <Badge className={`${sla.color} rounded-xl font-black px-2 py-1 text-[9px] tracking-tighter flex gap-1 items-center animate-pulse`}>
                   <Timer className="w-3 h-3" /> {sla.label}
                 </Badge>
               )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-4 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-white/5 ring-1 ring-white/5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="font-bold text-slate-300 tracking-tighter uppercase">{ticket.category}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className={`p-1.5 rounded-lg ring-1 ring-white/5 ${getPriorityColor(ticket.priority).split(' ')[1]}`}>
                <AlertCircle className={`w-3.5 h-3.5 ${getPriorityColor(ticket.priority).split(' ')[0]}`} />
              </div>
              <span className={`font-black tracking-tighter uppercase ${getPriorityColor(ticket.priority).split(' ')[0]}`}>
                {ticket.priority}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
               <Clock className="w-3.5 h-3.5" />
               <span className="font-medium tracking-tighter">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            </div>

            <div className="ml-auto">
              {ticket.assigned_to_name ? (
                <div className="flex items-center gap-2 group/assignee">
                   <div className="relative">
                      <Avatar className="w-8 h-8 ring-2 ring-blue-500/20 group-hover/assignee:ring-blue-500/50 transition-all">
                        <AvatarFallback className="bg-blue-600 text-[10px] font-black text-white">
                          {ticket.assigned_to_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#020617] rounded-full" />
                   </div>
                   <div className="hidden lg:flex flex-col">
                      <span className="text-[10px] uppercase font-black text-blue-400 tracking-tighter leading-none">Assignee</span>
                      <span className="text-xs text-white font-bold tracking-tight">{ticket.assigned_to_name.split(' ')[0]}</span>
                   </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600 group/unassigned">
                   <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center group-hover/unassigned:border-slate-500 transition-colors">
                      <User className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] uppercase font-bold tracking-tighter group-hover/unassigned:text-slate-400 transition-colors">Queue</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});
TicketCard.displayName = "TicketCard";

export default TicketCard;
