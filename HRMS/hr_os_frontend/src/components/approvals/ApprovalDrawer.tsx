import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApprovalRequestResponse, ApprovalTimelineStepResponse } from '@/lib/types';
import {
  X, CheckCircle2, XCircle, Clock, CornerDownRight,
  Hash, Calendar, User, Layers, ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getApprovalTimeline } from '@/lib/approvalApi';

interface ApprovalDrawerProps {
  request: ApprovalRequestResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  APPROVED: <CheckCircle2 className="w-5 h-5" />,
  REJECTED: <XCircle className="w-5 h-5" />,
  IGNORED:  <CornerDownRight className="w-4 h-4" />,
  PENDING:  <Clock className="w-5 h-5" />,
};

const STATUS_COLOR: Record<string, string> = {
  APPROVED: 'text-emerald-500 dark:text-emerald-400',
  REJECTED: 'text-red-500 dark:text-red-400',
  IGNORED:  'text-gray-400 dark:text-gray-600',
  PENDING:  'text-blue-500 dark:text-blue-400',
};

const STATUS_LABEL_COLOR: Record<string, string> = {
  APPROVED: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded',
  REJECTED: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded',
  IGNORED:  'text-gray-500 dark:text-gray-500',
  PENDING:  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded',
};

const STATUS_LINE: Record<string, string> = {
  APPROVED: 'border-emerald-400 dark:border-emerald-600',
  REJECTED: 'border-red-400 dark:border-red-700',
  IGNORED:  'border-gray-200 dark:border-gray-700',
  PENDING:  'border-blue-400 dark:border-blue-700',
};

// Group timeline steps by step_order
function groupByStep(timeline: ApprovalTimelineStepResponse[]) {
  const map = new Map<number, ApprovalTimelineStepResponse[]>();
  timeline.forEach(step => {
    const key = step.step_order ?? 0;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(step);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a - b);
}

export const ApprovalDrawer: React.FC<ApprovalDrawerProps> = ({ request, isOpen, onClose }) => {
  const { data: timeline, isLoading } = useQuery<ApprovalTimelineStepResponse[]>({
    queryKey: ['approvalTimeline', request?.id],
    queryFn: async () => {
      try {
        return await getApprovalTimeline(request!.id);
      } catch (err) {
        console.warn('[ApprovalDrawer] Timeline fetch failed:', err);
        return [];
      }
    },
    enabled: !!request && isOpen,
  });

  if (!isOpen) return null;

  const stepGroups = timeline ? groupByStep(timeline) : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="relative w-full max-w-[440px] h-full bg-white dark:bg-[#111214] border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-white/90 dark:bg-[#111214]/90 backdrop-blur-md px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Request Context</h2>
              {request && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                  #{request.reference_id_str?.slice(0, 8) ?? 'N/A'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 pt-5 pb-24 space-y-6">

            {/* Request Metadata Card */}
            {request && (
              <div className="p-5 bg-gray-50 dark:bg-[#1A1C20] rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    {request.module}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    request.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : request.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  }`}>
                    {request.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {request.reference?.title || 'System Request'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {[request.reference?.subtitle, ...Object.values(request.reference?.meta || {})].filter(Boolean).join(' • ')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Step {request.current_step} of {request.total_steps ?? '?'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono truncate">{request.id.slice(0, 14)}…</span>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 uppercase tracking-wider mb-4">
                Approval Timeline
              </h4>

              {isLoading ? (
                <div className="space-y-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex space-x-4 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stepGroups.length > 0 ? (
                <div className="space-y-6">
                  {stepGroups.map(([stepOrder, steps]) => {
                    // Determine the aggregate status for this group
                    const hasApproved = steps.some(s => s.status === 'APPROVED');
                    const hasRejected = steps.some(s => s.status === 'REJECTED');
                    const hasPending  = steps.some(s => s.status === 'PENDING');
                    const groupStatus = hasRejected ? 'REJECTED' : hasApproved && !hasPending ? 'APPROVED' : 'PENDING';

                    return (
                      <div key={stepOrder}>
                        {/* Step Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                            groupStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                            groupStatus === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                          }`}>
                            {stepOrder}
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Step {stepOrder}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-700" />
                          <span className={`text-[11px] font-semibold uppercase ${STATUS_COLOR[groupStatus]}`}>
                            {groupStatus === 'PENDING' ? 'In Progress' : groupStatus}
                          </span>
                        </div>

                        {/* Approvers in this step */}
                        <div className={`relative border-l-2 ${STATUS_LINE[groupStatus]} ml-3 space-y-5 pb-2 mt-1`}>
                          {steps.map((step, idx) => (
                            <div key={idx} className="relative pl-6">
                              <div className={`absolute -left-[11px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white dark:bg-[#111214] ${STATUS_COLOR[step.status]}`}>
                                {STATUS_ICON[step.status] ?? <Clock className="w-4 h-4" />}
                              </div>

                              <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                                    <User className="w-3 h-3 text-gray-400" />
                                    {step.approver_name || 'Unassigned'}
                                  </span>
                                  <span className={`text-[11px] font-semibold ${STATUS_LABEL_COLOR[step.status] ?? ''}`}>
                                    {step.status}
                                  </span>
                                </div>

                                {step.action_at && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {format(new Date(step.action_at), 'MMM d, h:mm a')}
                                  </span>
                                )}

                                {step.remarks && (
                                  <div className="mt-1.5 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-sm text-gray-600 dark:text-gray-300 italic border border-gray-100 dark:border-gray-800">
                                    "{step.remarks}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No timeline available yet.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
