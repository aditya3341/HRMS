import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DepartmentBarChartProps {
  data?: { department: string; count: number }[];
  isLoading: boolean;
}

const COLORS = ["#6366f1", "#8b5cf6", "#d946ef", "#f43f5e", "#f59e0b"];

const DepartmentBarChart: React.FC<DepartmentBarChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  return (
    <Card className="border-none bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Leaves by Department
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="department"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                width={100}
              />
              <Tooltip
                cursor={{ fill: "rgba(226, 232, 240, 0.4)" }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1500}>
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentBarChart;
