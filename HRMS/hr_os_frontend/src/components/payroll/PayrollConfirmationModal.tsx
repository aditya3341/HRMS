import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  month: string;
}

export const PayrollConfirmationModal = ({ isOpen, onClose, onConfirm, isLoading, month }: ConfirmationModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md glass-card border-white/10 bg-slate-950/90 text-white p-8">
        <DialogHeader className="space-y-4">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 mx-auto">
            <AlertTriangle size={32} />
          </div>
          <DialogTitle className="text-2xl font-black text-center tracking-tight uppercase">Confirm Payroll Processing</DialogTitle>
          <DialogDescription className="text-center text-slate-400 font-medium">
            You are about to process payroll for <span className="text-white font-bold">{month}</span>. 
            This action will finalize salary calculations and may lock further changes.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-8 flex gap-3 sm:justify-center">
          <Button 
            variant="ghost" 
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 h-14 rounded-2xl font-bold text-slate-400 hover:bg-white/5 transition-all"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black uppercase tracking-widest shadow-lg shadow-amber-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
