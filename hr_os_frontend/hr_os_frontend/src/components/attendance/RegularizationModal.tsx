import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle2, FileText, ChevronDown } from "lucide-react";
import { attendanceApi } from "@/lib/attendanceApi";
import type { AttendanceRecord, RegularizationRequest, AttendanceRegularizationConfig } from "@/lib/types";
import { toast } from "sonner";
import { format } from "date-fns";

interface RegularizationModalProps {
  record: AttendanceRecord;
  onClose: () => void;
}

export const RegularizationModal: React.FC<RegularizationModalProps> = ({ record, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [config, setConfig] = useState<AttendanceRegularizationConfig | null>(null);

  const DEFAULT_REASONS = ["Missed Punch", "System Error", "Work From Home", "Client Visit", "Other"];

  useEffect(() => {
    attendanceApi.getRegularizationConfig().then(setConfig);
  }, []);

  const reasons = config?.reasons ?? DEFAULT_REASONS;
  const requireComment = config?.require_comment_if_other ?? true;
  const commentRequired = requireComment && reason === "Other";

  const mutation = useMutation({
    mutationFn: (payload: RegularizationRequest) => attendanceApi.submitRegularization(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-regularize-me"] });
      toast.success("Regularization request submitted for approval.");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to submit regularization.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast.error("Please select a reason.");
    if (commentRequired && !comment.trim()) return toast.error("Please add a comment for 'Other' reason.");
    if (!record.id) return toast.error("Invalid attendance record.");

    mutation.mutate({
      attendance_id: record.id,
      reason,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
          transition={{ type: "spring", bounce: 0.25 }}
          className="relative bg-slate-900/95 border border-white/10 rounded-3xl p-6 w-full max-w-lg mx-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">Regularization Request</h3>
                <p className="text-xs text-slate-400 font-medium">Request correction for an attendance record</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Record Info */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Date</p>
              <p className="text-sm font-bold text-white">{format(new Date(record.date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                record.status === "PRESENT" ? "bg-emerald-500/10 text-emerald-400" :
                record.status === "ABSENT" ? "bg-red-500/10 text-red-400" :
                record.status === "LATE" ? "bg-amber-500/10 text-amber-400" :
                "bg-blue-500/10 text-blue-400"
              }`}>{record.status}</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Check In</p>
              <p className="text-sm text-slate-300 font-mono">{record.check_in ? format(new Date(record.check_in), "hh:mm a") : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Check Out</p>
              <p className="text-sm text-slate-300 font-mono">{record.check_out ? format(new Date(record.check_out), "hh:mm a") : "—"}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason Selector */}
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">
                Reason <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all cursor-pointer"
                  required
                >
                  <option value="" disabled className="bg-slate-900">Select a reason…</option>
                  {reasons.map(r => (
                    <option key={r} value={r} className="bg-slate-900">{r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">
                Comment {commentRequired && <span className="text-rose-400">*</span>}
                {!commentRequired && <span className="text-slate-600 normal-case font-normal">(optional)</span>}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={commentRequired ? "Please explain in detail…" : "Add any additional notes…"}
                rows={3}
                required={commentRequired}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-all resize-none"
              />
            </div>

            {/* Warning if reason not selected */}
            {commentRequired && reason === "Other" && !comment && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                A detailed comment is required when selecting "Other".
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-300 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={mutation.isPending}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <>Submitting…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Submit Request</>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
