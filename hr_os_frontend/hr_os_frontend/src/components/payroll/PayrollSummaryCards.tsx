import React from "react";
import { motion } from "framer-motion";
import { Users, CreditCard, TrendingDown, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryProps {
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

export const PayrollSummaryCards = ({ totalEmployees, totalGross, totalDeductions, totalNet }: SummaryProps) => {
  const stats = [
    { label: "Total Employees", value: totalEmployees, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Total Gross", value: `₹${totalGross.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Deductions", value: `₹${totalDeductions.toLocaleString()}`, icon: TrendingDown, color: "text-rose-400", bg: "bg-rose-500/10" },
    { label: "Total Net Payroll", value: `₹${totalNet.toLocaleString()}`, icon: Wallet, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="glass-card border-white/10 bg-white/5 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-black text-white tracking-tighter tabular-nums">{stat.value}</h3>
                </div>
                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} border border-white/5 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
