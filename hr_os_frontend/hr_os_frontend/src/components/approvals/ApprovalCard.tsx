import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { ApprovalRequestResponse } from '@/lib/types';
import { ProgressIndicator } from './ProgressIndicator';
import {
  CheckCircle2, XCircle, Clock, ChevronRight, Loader2,
  AlertTriangle, Briefcase, UserCheck, Timer,
  TrendingUp, Flame,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { SlaInfo as BackendSla } from '@/lib/types';
import { SLA_BORDER, SLA_BADGE, SlaState } from '@/lib/slaUtils';

// Map server SLA response to the frontend SlaState + label
function slaInfoFromServer(sla: BackendSla | null | undefined): { state: SlaState; label: string; deadlineHint: string | null } {
  if (!sla || sla.status === 'NONE') return { state: 'none', label: '', deadlineHint: null };

  const h = sla.hours_left;
  const absH = h !== null ? Math.abs(h) : 0;
  const fmt = absH < 1 ? `${Math.round(absH * 60)}m` : `${absH.toFixed(1)}h`;

  switch (sla.status) {
    case 'ESCALATED': return { state: 'escalated', label: 'Escalated',          deadlineHint: h !== null ? `${fmt} past SLA` : null };
    case 'OVERDUE':   return { state: 'overdue',   label: `Overdue by ${fmt}`,  deadlineHint: null };
    case 'DUE_SOON':  return { state: 'warning',   label: `Due in ${fmt}`,      deadlineHint: null };
    case 'SAFE':      return { state: 'safe',       label: `Due in ${fmt}`,      deadlineHint: null };
    default:          return { state: 'none',       label: '',                   deadlineHint: null };
  }
}

interface ApprovalCardProps {
  request: ApprovalRequestResponse;
  onClick: (req: ApprovalRequestResponse) => void;
  onApprove: (e: React.MouseEvent, req: ApprovalRequestResponse) => void;
  onReject: (e: React.MouseEvent, req: ApprovalRequestResponse) => void;
}

const MODULE_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  OFFER: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    icon: <Briefcase className="w-3 h-3 mr-1" />,
    label: 'Offer',
  },
  ONBOARDING: {
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    icon: <UserCheck className="w-3 h-3 mr-1" />,
    label: 'Onboarding',
  },
  EMPLOYEE: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    icon: <UserCheck className="w-3 h-3 mr-1" />,
    label: 'Employee',
  },
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  MEDIUM: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  LOW:    'bg-gray-400 dark:bg-gray-600',
};

// SLA icon per state
const SLA_ICON: Record<SlaState, React.ReactNode | null> = {
  escalated: <Flame className="w-3 h-3 mr-1" />,
  overdue:   <AlertTriangle className="w-3 h-3 mr-1" />,
  warning:   <TrendingUp className="w-3 h-3 mr-1" />,
  safe:      <Timer className="w-3 h-3 mr-1" />,
  none:      null,
};

// forwardRef required so AnimatePresence can pass refs through
const ApprovalCard = forwardRef<HTMLDivElement, ApprovalCardProps>(
  ({ request, onClick, onApprove, onReject }, ref) => {
    const [actionState, setActionState] = useState<'APPROVE' | 'REJECT' | 'SUCCESS' | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    const slaResult = slaInfoFromServer(request.sla);
    const slaState = slaResult.state;
    const slaLabel = slaResult.label;

    const mod = MODULE_CONFIG[request.module] ?? {
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      icon: null,
      label: request.module,
    };

    const title = request.reference?.title || 'System Request';
    const subtitle = request.reference?.subtitle || '';
    const metaValues = Object.values(request.reference?.meta || {}).filter(Boolean);
    const displaySubtitle = [subtitle, ...metaValues].filter(Boolean).join(' • ');

    const isPending = request.status === 'PENDING';

    // Border: SLA overrides priority if more urgent
    const borderClass = (() => {
      if (slaState !== 'none') return SLA_BORDER[slaState];
      if (request.priority === 'HIGH')   return 'border-l-4 border-red-300 dark:border-red-800';
      if (request.priority === 'MEDIUM') return 'border-l-4 border-amber-300 dark:border-amber-800';
      return 'border border-gray-100 dark:border-gray-800/60';
    })();

    const handleApproveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActionState('APPROVE');
      setTimeout(() => setActionState('SUCCESS'), 300);
      setTimeout(() => onApprove(e, request), 600);
    };

    const handleRejectClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActionState('REJECT');
      setTimeout(() => onReject(e, request), 400);
    };

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 80, transition: { duration: 0.25, ease: 'easeIn' } }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onClick(request)}
        className={`group relative flex flex-col sm:flex-row items-start sm:items-stretch gap-4 p-5 bg-white dark:bg-[#1A1C20] rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer mb-3 overflow-hidden
          ${actionState === 'SUCCESS'
            ? 'border-l-4 border-emerald-500'
            : borderClass}
        `}
      >
        {/* Left: Avatar + info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow">
              {title.charAt(0).toUpperCase()}
            </div>
            {request.priority && request.priority !== 'LOW' && (
              <div
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#1A1C20] ${PRIORITY_DOT[request.priority] ?? ''}`}
                title={`${request.priority} Priority`}
              />
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            {/* Title row */}
            <div className="flex items-center flex-wrap gap-2">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-snug truncate">
                {title}
              </h3>
              <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${mod.color}`}>
                {mod.icon}{mod.label}
              </span>
              {request.priority === 'HIGH' && (
                <span className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />Urgent
                </span>
              )}
            </div>

            {/* Subtitle */}
            {displaySubtitle && (
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {displaySubtitle}
              </p>
            )}

            {/* Progress + time + SLA badge row */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3">
              <ProgressIndicator
                currentStep={request.current_step}
                totalSteps={request.total_steps}
                overallStatus={request.status}
              />

              <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 font-medium">
                <Clock className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </div>

              {/* SLA Badge */}
              {slaState !== 'none' && (
                <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md cursor-default select-none ${SLA_BADGE[slaState]}`}>
                    {SLA_ICON[slaState]}
                    {slaLabel}
                  </span>

                  {/* Tooltip */}
                  {showTooltip && slaResult.deadlineHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 whitespace-nowrap"
                    >
                      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-3 py-2 rounded-lg shadow-xl">
                        <div className="font-semibold mb-0.5">SLA Info</div>
                        <div>{slaResult.deadlineHint}</div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-800 pt-3 sm:pt-0 sm:pl-4 self-stretch sm:self-center flex-shrink-0">
          {isPending ? (
            <>
              <button
                onClick={handleRejectClick}
                disabled={!!actionState}
                className="flex items-center px-3.5 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40 focus:outline-none"
              >
                {actionState === 'REJECT'
                  ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  : <XCircle className="w-4 h-4 mr-1.5" />}
                Reject
              </button>
              <button
                onClick={handleApproveClick}
                disabled={!!actionState}
                className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-300 focus:outline-none disabled:opacity-40
                  ${actionState === 'SUCCESS'
                    ? 'bg-emerald-500 text-white scale-105'
                    : 'text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100'
                  }`}
              >
                {actionState === 'APPROVE'
                  ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                {actionState === 'SUCCESS' ? 'Approved!' : 'Approve'}
              </button>
            </>
          ) : (
            <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full ${
              request.status === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            }`}>
              {request.status === 'APPROVED'
                ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approved</>
                : <><XCircle className="w-3.5 h-3.5 mr-1" />Rejected</>}
            </span>
          )}
          <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 hidden sm:block ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>
    );
  }
);

ApprovalCard.displayName = 'ApprovalCard';
export { ApprovalCard };
