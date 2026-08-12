import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyApprovals, submitApprovalAction } from '@/lib/approvalApi';
import { ApprovalRequestResponse, ApprovalModule } from '@/lib/types';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { ApprovalDrawer } from '@/components/approvals/ApprovalDrawer';
import {
  CheckCircle2, Search, SlidersHorizontal,
  ChevronDown, Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { isToday, isYesterday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';

const ADMIN_ROLES = ['super_admin', 'hr_admin'];

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type ModuleFilter = ApprovalModule | 'ALL';
type SortKey = 'urgency' | 'newest' | 'oldest' | 'priority';

const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export const ApprovalInbox: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequestResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('urgency');
  const [sortOpen, setSortOpen] = useState(false);

  const isAdmin = ADMIN_ROLES.includes((user?.role ?? '').toLowerCase());

  const { data, isLoading } = useQuery({
    queryKey: ['myApprovals'],
    queryFn: getMyApprovals,
    refetchInterval: 15000,
  });

  // NORMALIZE API RESPONSE
  const safeApprovals: ApprovalRequestResponse[] = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const approvals = safeApprovals;

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVED' | 'REJECTED' }) =>
      submitApprovalAction(id, { action }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['myApprovals'] });
      const previous = queryClient.getQueryData<ApprovalRequestResponse[]>(['myApprovals']);
      queryClient.setQueryData<ApprovalRequestResponse[]>(
        ['myApprovals'],
        old => old?.filter(r => r.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) queryClient.setQueryData(['myApprovals'], context.previous);
      toast.error('Failed to process approval action');
    },
    onSuccess: (_, { id, action }) => {
      toast.success(`Request ${action === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      if (selectedRequest?.id === id) setSelectedRequest(null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['myApprovals'] }),
  });

  const handleApprove = (e: React.MouseEvent, req: ApprovalRequestResponse) => {
    e.stopPropagation();
    actionMutation.mutate({ id: req.id, action: 'APPROVED' });
  };

  const handleReject = (e: React.MouseEvent, req: ApprovalRequestResponse) => {
    e.stopPropagation();
    actionMutation.mutate({ id: req.id, action: 'REJECTED' });
  };

  const counts = useMemo(() => ({
    ALL: (approvals ?? []).length,
    PENDING:  (approvals ?? []).filter(r => r.status === 'PENDING').length,
    APPROVED: (approvals ?? []).filter(r => r.status === 'APPROVED').length,
    REJECTED: (approvals ?? []).filter(r => r.status === 'REJECTED').length,
  }), [approvals]);

  const filtered = useMemo(() => {
    let list = [...(approvals ?? [])];
    if (statusFilter !== 'ALL') list = list.filter(r => r.status === statusFilter);
    if (moduleFilter !== 'ALL') list = list.filter(r => r.module === moduleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.reference?.title ?? '').toLowerCase().includes(q) ||
        (r.reference?.subtitle ?? '').toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'urgency': {
        const SLA_SCORE: Record<string, number> = { ESCALATED: 4, OVERDUE: 3, DUE_SOON: 2, SAFE: 1, NONE: 0 };
        list.sort((a, b) => {
          const scoreA = SLA_SCORE[a.sla?.status ?? 'NONE'] ?? 0;
          const scoreB = SLA_SCORE[b.sla?.status ?? 'NONE'] ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          const hA = a.sla?.hours_left ?? Infinity;
          const hB = b.sla?.hours_left ?? Infinity;
          if (hA !== hB) return hA - hB;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      }
      case 'oldest':
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'priority':
        list.sort((a, b) => {
          const pA = PRIORITY_WEIGHT[a.priority ?? 'LOW'] ?? 1;
          const pB = PRIORITY_WEIGHT[b.priority ?? 'LOW'] ?? 1;
          if (pA !== pB) return pB - pA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      default:
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [approvals, statusFilter, moduleFilter, searchQuery, sort]);

  const groups: [string, ApprovalRequestResponse[]][] = [
    ['Today',     (filtered ?? []).filter(a => isToday(new Date(a.created_at)))],
    ['Yesterday', (filtered ?? []).filter(a => isYesterday(new Date(a.created_at)))],
    ['Older',     (filtered ?? []).filter(a => !isToday(new Date(a.created_at)) && !isYesterday(new Date(a.created_at)))],
  ];

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL',      label: 'All' },
    { value: 'PENDING',  label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  const SORT_LABELS: Record<SortKey, string> = {
    urgency:  'Urgency',
    newest:   'Newest',
    oldest:   'Oldest',
    priority: 'Priority',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        icon={Inbox}
        title="Approvals"
        subtitle={isAdmin ? "Viewing all organizational approval requests." : "Pending actions requiring your verification."}
        actions={
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['ALL', 'OFFER', 'ONBOARDING', 'EMPLOYEE'] as const).map(m => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  moduleFilter === m
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'ALL' ? 'All' : m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, role..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setSortOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Sort: {SORT_LABELS[sort]}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 mt-2 w-full sm:w-44 bg-card border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                  <button
                    key={k}
                    onClick={() => { setSort(k); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                      sort === k ? 'font-semibold text-primary' : 'text-slate-300'
                    }`}
                  >
                    {SORT_LABELS[k]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/5">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              statusFilter === tab.value ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
              statusFilter === tab.value ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-600'
            }`}>
              {counts[tab.value]}
            </span>
            {statusFilter === tab.value && (
              <motion.div layoutId="statusUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-8 pt-2" onClick={() => setSortOpen(false)}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-8">
            {groups.map(([label, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={label}>
                  <h3 className="text-xs font-semibold text-slate-500 mb-3 ml-1 flex items-center gap-2">
                    {label}
                    <span className="bg-white/5 px-1.5 py-0.5 rounded-full text-[10px] text-slate-600 font-bold">
                      {items.length}
                    </span>
                  </h3>
                  <AnimatePresence mode="popLayout">
                    <div className="space-y-3">
                      {items.map(req => (
                        <ApprovalCard
                          key={req.id}
                          request={req}
                          onClick={setSelectedRequest}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <CheckCircle2 className="w-8 h-8 text-slate-800" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Queue Clear</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              All approval requests have been processed.
            </p>
          </motion.div>
        )}
      </div>

      <ApprovalDrawer
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
};

export default ApprovalInbox;
