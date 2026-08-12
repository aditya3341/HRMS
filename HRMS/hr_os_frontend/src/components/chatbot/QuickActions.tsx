import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (text: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";

  const actions = {
    EMPLOYEE: [
      "My leave balance",
      "My attendance",
      "Apply leave",
      "My IT ticket status"
    ],
    MANAGER: [
      "Who is on leave today?",
      "Team attendance summary",
      "Pending approvals",
      "Low trust score employees"
    ],
    HR_ADMIN: [
      "Top performers",
      "Fraud alerts",
      "Payroll summary"
    ],
    SUPER_ADMIN: [
      "System stats",
      "Fraud signals",
      "Audit logs"
    ]
  };

  const currentActions = actions[role as keyof typeof actions] || actions.EMPLOYEE;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
      {currentActions.map((action) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className="shrink-0 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all uppercase tracking-widest whitespace-nowrap shadow-sm"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
