import React from "react";
import { AlertCircle, Bell, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProactiveAlertsProps {
  signals: string[];
}

export function ProactiveAlerts({ signals }: ProactiveAlertsProps) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-in slide-in-from-top-2 duration-400">
      {signals.map((signal, i) => (
        <div 
          key={i} 
          className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-3 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary border border-indigo-100 shrink-0 group-hover:scale-110 transition-transform">
             <Bell className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-700 leading-tight">
            {signal}
          </p>
        </div>
      ))}
    </div>
  );
}
