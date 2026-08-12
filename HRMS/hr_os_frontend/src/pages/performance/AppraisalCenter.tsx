import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Save,
  User,
  Search,
  ExternalLink,
  TrendingUp
} from "lucide-react";
import { 
  getCycles,
  generateRecommendations,
  getAppraisals,
  updateAppraisal,
  lockAppraisal,
  getPromotions,
  approvePromotion
} from "@/lib/performanceApi";
import api from "@/lib/api"; // For direct fetching of appraisal lists
import { toast } from "sonner";

const AppraisalCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"appraisals" | "promotions">("appraisals");
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: cycles } = useQuery({
    queryKey: ["performance-cycles"],
    queryFn: getCycles,
  });

  const { data: appraisals, isLoading } = useQuery({
    queryKey: ["performance-appraisals", selectedCycle],
    queryFn: () => getAppraisals(selectedCycle),
    enabled: !!selectedCycle
  });

  const generateMutation = useMutation({
    mutationFn: (cycleId: string) => generateRecommendations(cycleId),
    onSuccess: () => {
      toast.success("Recommendations generated for all completed reviews");
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, pct, reason }: { id: string, pct: number, reason: string }) => 
      updateAppraisal(id, { increment_percentage: pct, reason }),
    onSuccess: () => {
      toast.success("Appraisal updated successfully");
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    }
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => lockAppraisal(id),
    onSuccess: () => {
      toast.success("Appraisal locked and payroll updated");
      queryClient.invalidateQueries({ queryKey: ["performance-appraisals"] });
    }
  });

  const { data: promotions } = useQuery({
    queryKey: ["performance-promotions", selectedCycle],
    queryFn: () => getPromotions(selectedCycle),
    enabled: !!selectedCycle && activeTab === "promotions"
  });

  const approvePromotionMutation = useMutation({
    mutationFn: (id: string) => approvePromotion(id),
    onSuccess: () => {
      toast.success("Promotion approved successfully");
      queryClient.invalidateQueries({ queryKey: ["performance-promotions"] });
    }
  });

  return (
    <div className="p-8 space-y-8 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Appraisal Center</h1>
          <p className="text-white/60">Manage salary increments & payroll integration</p>
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
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-purple-500/50 w-64"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button 
          onClick={() => setActiveTab("appraisals")}
          className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === "appraisals" ? "text-purple-400" : "text-white/40 hover:text-white"}`}
        >
          Salary Appraisals
          {activeTab === "appraisals" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />}
        </button>
        <button 
          onClick={() => setActiveTab("promotions")}
          className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === "promotions" ? "text-purple-400" : "text-white/40 hover:text-white"}`}
        >
          Promotion Requests
          {activeTab === "promotions" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />}
        </button>
      </div>

      {!selectedCycle ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40 max-w-xs">Please select a performance cycle to manage appraisals</p>
        </div>
      ) : activeTab === "appraisals" ? (
        appraisals?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-purple-400/40" />
            </div>
            <div className="space-y-2">
              <p className="text-white/60 font-medium text-lg">No appraisals generated yet</p>
              <p className="text-white/40 max-w-xs mx-auto text-sm">Initialize recommendations for all employees with completed reviews in this cycle</p>
            </div>
            <button 
              onClick={() => generateMutation.mutate(selectedCycle)}
              disabled={generateMutation.isPending}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-semibold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              {generateMutation.isPending ? "Generating..." : "Generate Recommendations"}
            </button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Employee</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Band</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Current Salary</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Recommended</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Final Increment %</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Status</th>
                  <th className="px-6 py-4 text-sm font-medium text-white/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {appraisals?.filter((a: any) => a.employee_name?.toLowerCase().includes(search.toLowerCase()))
                  .map((a: any) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-xs">
                          {a.employee_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium">{a.employee_name}</div>
                          <div className="text-xs text-white/40">{a.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-white">
                        {a.band}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/80 font-mono">
                      ${a.current_salary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-green-400 font-medium">
                      {a.recommended_increment}%
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        defaultValue={a.increment_percentage}
                        disabled={a.status === "LOCKED"}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val !== a.increment_percentage) {
                            updateMutation.mutate({ id: a.id, pct: val, reason: "Manual Adjustment" });
                          }
                        }}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                         {a.status === "LOCKED" ? (
                           <span className="flex items-center gap-1 text-green-400 text-xs">
                             <Lock className="w-3 h-3" /> Locked
                           </span>
                         ) : (
                           <span className="text-amber-400 text-xs">Draft</span>
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {a.status !== "LOCKED" && (
                          <button 
                            onClick={() => lockMutation.mutate(a.id)}
                            className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500 hover:text-white transition-all shadow-sm"
                            title="Lock & Sync Payroll"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 bg-white/5 text-white/40 rounded-lg hover:text-white transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-sm font-medium text-white/40">Employee</th>
                <th className="px-6 py-4 text-sm font-medium text-white/40">Current Designation</th>
                <th className="px-6 py-4 text-sm font-medium text-white/40">Proposed</th>
                <th className="px-6 py-4 text-sm font-medium text-white/40">Eligibility</th>
                <th className="px-6 py-4 text-sm font-medium text-white/40">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {promotions?.filter((p: any) => p.employee_name?.toLowerCase().includes(search.toLowerCase()))
                .map((p: any) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{p.employee_name}</div>
                  </td>
                  <td className="px-6 py-4 text-white/60">{p.current_designation}</td>
                  <td className="px-6 py-4 text-purple-400 font-medium">{p.proposed_designation}</td>
                  <td className="px-6 py-4">
                    {p.eligibility_flag ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Eligible</span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Review Required</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/40 text-sm">{p.status}</td>
                  <td className="px-6 py-4">
                    {p.status === "PENDING" && (
                      <button 
                        onClick={() => approvePromotionMutation.mutate(p.id)}
                        className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-all"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {promotions?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20">
                    No pending promotions for this cycle
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AppraisalCenter;
