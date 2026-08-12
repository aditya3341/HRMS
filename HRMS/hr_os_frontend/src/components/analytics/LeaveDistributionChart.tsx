import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaveDistributionChartProps {
  data?: { type: string; count: number }[];
  isLoading: boolean;
}

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

const LeaveDistributionChart: React.FC<LeaveDistributionChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  const total = data?.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <Card className="border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Leave Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
                nameKey="type"
                animationDuration={1500}
              >
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-10">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{total}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveDistributionChart;
