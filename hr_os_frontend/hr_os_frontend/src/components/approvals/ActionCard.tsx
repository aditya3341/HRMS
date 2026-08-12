import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock, Briefcase, UserCheck, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useProcessAction } from '@/lib/actionCenterApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ActionCardProps {
  item: any;
}

const ActionCard: React.FC<ActionCardProps> = ({ item }) => {
  const { mutate: processAction, isPending } = useProcessAction();
  const [isHovered, setIsHovered] = useState(false);

  const priorityConfig = {
    high: { color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <AlertCircle className="w-3 h-3" /> },
    medium: { color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: <Info className="w-3 h-3" /> },
    low: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: <Check className="w-3 h-3" /> },
  };

  const priority = (item.priority?.toLowerCase() as "high" | "medium" | "low") || "low";
  const config = priorityConfig[priority];

  const typeIcon = item.module === "OFFER" ? <Briefcase className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />;

  return (
    <motion.div
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
      className="relative group h-full flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 shadow-2xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden"
    >
      {/* Decorative background gradient */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 transition-colors duration-500" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-colors duration-500" />

      {/* Header */}
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-indigo-400 shadow-inner">
            {typeIcon}
          </div>
          <Badge className={`${config.color} border font-bold text-[10px] tracking-widest uppercase py-0.5 px-2 rounded-lg flex gap-1 items-center`}>
            {config.icon}
            {priority}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 text-white/30 text-[11px] font-medium bg-white/5 px-2 py-1 rounded-full border border-white/5">
          <Clock size={12} />
          {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : 'just now'}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors duration-300 line-clamp-1">
          {item.reference?.title || "Approval Request"}
        </h3>
        <p className="text-white/50 text-sm leading-relaxed mb-6 line-clamp-2 min-h-[40px]">
          {item.reference?.subtitle || "Awaiting your strategic decision to proceed with this workflow."}
        </p>

        {/* Requester Info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 mb-6 group-hover:bg-white/10 transition-colors duration-300">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-xs font-bold text-indigo-300">
            {item.requested_by_name?.charAt(0).toUpperCase() || "R"}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Requested By</span>
            <span className="text-xs text-white/80 font-medium">{item.requested_by_name || "HR Recruiter"}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            processAction({ requestId: item.id, action: "APPROVED", actionType: item.module });
          }}
          disabled={isPending}
          className="h-12 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-400 transition-all duration-300 font-bold group/btn shadow-lg hover:shadow-emerald-500/20"
        >
          <Check className="w-4 h-4 mr-2 group-hover/btn:scale-125 transition-transform" />
          Approve
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            processAction({ requestId: item.id, action: "REJECTED", actionType: item.module });
          }}
          disabled={isPending}
          variant="outline"
          className="h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all duration-300 font-bold group/btn shadow-lg"
        >
          <X className="w-4 h-4 mr-2 group-hover/btn:scale-125 transition-transform" />
          Reject
        </Button>
      </div>

      {/* Optimistic indicator */}
      {isPending && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </motion.div>
  );
};

export default ActionCard;
