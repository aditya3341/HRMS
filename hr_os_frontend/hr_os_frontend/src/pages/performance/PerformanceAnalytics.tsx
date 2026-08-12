import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  BarChart3, 
  PieChart as PieChartIcon,
  Filter
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { getOrgOverview, getCycles, getTeamAnalytics } from "@/lib/performanceApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#8B5CF6", "#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

const PerformanceAnalytics: React.FC = () => {
  const [selectedCycle, setSelectedCycle] = React.useState<string>("");

  const { data: cycles } = useQuery({
    queryKey: ["performance-cycles"],
    queryFn: getCycles,
  });

  const { data: overview, isLoading } = useQuery({
    queryKey: ["performance-org-overview", selectedCycle],
    queryFn: () => getOrgOverview(selectedCycle),
    enabled: !!selectedCycle
  });

  const { data: teamAnalytics } = useQuery({
    queryKey: ["performance-team-analytics", selectedCycle],
    queryFn: () => getTeamAnalytics(selectedCycle),
    enabled: !!selectedCycle
  });

  if (isLoading) return <div className="p-8 text-center text-white/50">Loading Insights...</div>;

  const bandData = overview?.band_distribution ? Object.entries(overview.band_distribution).map(([name, value]) => ({
    name,
    value: value as number
  })) : [];

  const topBandEntry = bandData.reduce<{ name: string; value: number } | null>((best, item) => {
    if (!best || item.value > best.value) return item;
    return best;
  }, null);
  const topBandPercent = overview?.total_reviews && topBandEntry
    ? `${Math.round((topBandEntry.value / overview.total_reviews) * 100)}%`
    : "0%";

  return (
    <div className="p-8 space-y-8 min-h-screen bg-transparent">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Performance Analytics</h1>
          <p className="text-white/60">Strategic insights across the organization</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="" className="bg-slate-900">Select Cycle</option>
            {cycles?.map((c: any) => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/80 hover:bg-white/10 transition-all">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {!selectedCycle && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 max-w-xs">Please select a performance cycle to view analytics</p>
        </div>
      )}

      {selectedCycle && (
        <>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Avg Org Rating", value: overview?.average_rating || "0.0", icon: Award, color: "text-purple-400" },
          { label: "Participation", value: `${overview?.total_reviews || 0}`, icon: Users, color: "text-blue-400" },
          { label: "Avg Increment", value: `${overview?.average_increment_pct || 0}%`, icon: TrendingUp, color: "text-green-400" },
          { label: "Largest Band Share", value: topBandPercent, icon: Target, color: "text-amber-400" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-white/40">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Band Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <PieChartIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Band Distribution</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bandData.length > 0 ? bandData : [{ name: "No Data", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px", color: "#fff" }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Team Performance Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl md:col-span-2"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Departmental Performance</h3>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamAnalytics || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="department_name" stroke="#ffffff40" />
                <YAxis stroke="#ffffff40" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "12px", color: "#fff" }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="average_score" fill="#10B981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      </>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
