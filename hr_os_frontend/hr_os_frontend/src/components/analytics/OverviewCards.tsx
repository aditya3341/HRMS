import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, UserCheck, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewCardsProps {
  data?: {
    total_leaves: number;
    pending: number;
    on_leave_today: number;
    avg_leave: number;
  };
  isLoading: boolean;
}

const OverviewCards: React.FC<OverviewCardsProps> = ({ data, isLoading }) => {
  const cards = [
    {
      title: "Total Approved Leaves",
      value: data?.total_leaves ?? 0,
      icon: Calendar,
      color: "from-blue-500/20 to-indigo-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
      subtitle: "Lifetime approvals",
    },
    {
      title: "Pending Approvals",
      value: data?.pending ?? 0,
      icon: Clock,
      color: "from-amber-500/20 to-orange-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      subtitle: "Action required",
    },
    {
      title: "On Leave Today",
      value: data?.on_leave_today ?? 0,
      icon: UserCheck,
      color: "from-emerald-500/20 to-teal-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      subtitle: "Active absences",
    },
    {
      title: "Avg Leaves / Emp",
      value: data?.avg_leave ?? 0,
      icon: TrendingUp,
      color: "from-purple-500/20 to-pink-500/20",
      textColor: "text-purple-600 dark:text-purple-400",
      subtitle: "Company threshold",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -5 }}
        >
          <Card className="relative overflow-hidden border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 group">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-30 group-hover:opacity-50 transition-opacity`} />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {card.title}
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {card.value}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 ${card.textColor} shadow-sm`}>
                  <card.icon size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default OverviewCards;
