import React from "react";
import { Bell, Palmtree, Briefcase } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, markNotificationAsRead } from "@/lib/notificationApi";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 10000, // Faster polling (10s)
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // Find the notification to show title in toast
      const notif = notifications.find(n => n.id === variables);
      if (notif) {
        toast.success(`Marked as read: ${notif.title}`, {
          description: "Notification updated successfully",
        });
      }
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-white/5 transition-all active:scale-95">
          <Bell className="h-5 w-5 text-foreground/80 hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary border-2 border-background"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0 rounded-2xl border-white/10 bg-background/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <DropdownMenuLabel className="p-4 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Alerts</span>
            {unreadCount > 0 && (
              <span className="text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md leading-none animate-pulse">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-white/10"
            onClick={() => {
              // Mark all as read logic
              notifications.filter(n => !n.read).forEach(n => markReadMutation.mutate(n.id));
              if (unreadCount > 0) toast.success("Marked all as read");
            }}
          >
            Mark all
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10 m-0" />
        
        <ScrollArea className="h-[380px]">
          {notifications.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center opacity-20">
                <Bell className="h-6 w-6" />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium italic">All caught up!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className={cn(
                    "p-4 cursor-pointer focus:bg-primary/10 flex gap-4 transition-all items-start relative border-b border-white/[0.03] last:border-0",
                    !n.read ? "bg-primary/[0.03] hover:bg-primary/[0.05]" : "opacity-60 grayscale-[0.5]"
                  )}
                  onClick={() => {
                    if (!n.read) {
                      markReadMutation.mutate(n.id);
                    }
                    if (n.link) {
                      navigate(n.link);
                    }
                  }}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      !n.read ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                    )}>
                      {n.type === 'LEAVE' ? <Palmtree className="h-4 w-4" /> : 
                       n.type === 'OFFER' ? <Briefcase className="h-4 w-4" /> :
                       <Bell className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <div className="flex items-center justify-between gap-2">
                       <p className={cn("text-[11px] leading-tight truncate", !n.read ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                      {n.body}
                    </p>
                    <p className="text-[9px] text-muted-foreground/30 font-bold uppercase tracking-wider">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 bg-white/5 flex items-center justify-center">
          <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">Zipaworld HR OS • v1.2</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
