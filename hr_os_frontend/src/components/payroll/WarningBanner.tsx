import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Anomaly {
  type: 'high_lop' | 'missing_attendance' | 'invalid_salary';
  employeeName: string;
  message: string;
}

interface WarningBannerProps {
  anomalies: Anomaly[];
  onClose?: () => void;
}

export const WarningBanner = ({ anomalies, onClose }: WarningBannerProps) => {
  if (anomalies.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
        animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="overflow-hidden"
      >
        <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-200 p-6 rounded-[2rem] relative">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div className="ml-4">
            <AlertTitle className="text-lg font-black tracking-tight mb-2 uppercase">Payroll Anomalies Detected</AlertTitle>
            <AlertDescription className="space-y-1">
              {anomalies.map((anomaly, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium opacity-90">
                  <div className="h-1 w-1 rounded-full bg-amber-500" />
                  <span>{anomaly.message}</span>
                </div>
              ))}
            </AlertDescription>
          </div>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="absolute top-4 right-4 text-amber-500 hover:bg-amber-500/20 rounded-full"
            >
              <X size={18} />
            </Button>
          )}
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};
