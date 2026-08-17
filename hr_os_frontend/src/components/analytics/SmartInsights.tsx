import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface SmartInsightsProps {
  data?: {
    burnout_risk: { name: string; leaves: number }[];
  };
  isLoading: boolean;
}

const SmartInsights: React.FC<SmartInsightsProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  const hasBurnout = data && data.burnout_risk.length > 0;

  return (
    <Card className="border-none bg-indigo-600 dark:bg-indigo-900/40 backdrop-blur-xl shadow-2xl shadow-indigo-200 dark:shadow-none text-white overflow-hidden h-full">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Zap size={120} />
      </div>
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Workforce Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {!hasBurnout ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold">All good 🚀</h4>
              <p className="text-sm text-white/70">No immediate burnout risks detected in the last 90 days.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white/10 rounded-xl p-4 flex gap-3 items-center">
              <AlertCircle className="text-orange-300" size={24} />
              <p className="text-sm">
                Detecting unusual leave patterns for <strong>{data.burnout_risk.length}</strong> employees. High burnout risk.
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-white/60">Risk Profile</p>
              {data.burnout_risk.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/20">
                      <AvatarImage src={`https://ui-avatars.com/api/?name=${item.name}&background=random`} />
                      <AvatarFallback>{item.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-white/60">High Absence Frequency</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{item.leaves} Days</p>
                    <div className="h-1.5 w-16 bg-white/20 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-orange-400" 
                        style={{ width: `${Math.min((item.leaves / 15) * 100, 100)}%` }} 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold shadow-lg hover:shadow-white/20 transition-all active:scale-95">
              Schedule Wellbeing Check-ins
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartInsights;
