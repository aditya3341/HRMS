/**
 * SLA Utility — calculates escalation status from created_at + escalation_hours.
 * Used by ApprovalCard and ApprovalInbox sort logic.
 */

export type SlaState = 'safe' | 'warning' | 'overdue' | 'escalated' | 'none';

export interface SlaInfo {
  state: SlaState;
  /** Positive = hours remaining, negative = hours overdue */
  hoursRemaining: number | null;
  /** ISO string of the deadline */
  deadlineAt: string | null;
  label: string;
  urgencyScore: number; // 0 = none, 1 = safe, 2 = warning, 3 = overdue, 4 = escalated
}

/**
 * Derives the SLA state for an approval request.
 * @param createdAt  ISO timestamp when the request was created
 * @param escalationHours  SLA window in hours (null / undefined = no SLA)
 * @param isEscalated  whether backend has already flagged this as escalated
 */
export function computeSla(
  createdAt: string,
  escalationHours?: number | null,
  isEscalated?: boolean,
): SlaInfo {
  const NONE: SlaInfo = {
    state: 'none', hoursRemaining: null, deadlineAt: null, label: '', urgencyScore: 0,
  };

  if (!escalationHours) return NONE;

  const created = new Date(createdAt).getTime();
  const deadline = created + escalationHours * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = deadline - now;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (isEscalated) {
    return {
      state: 'escalated',
      hoursRemaining,
      deadlineAt: new Date(deadline).toISOString(),
      label: 'Escalated',
      urgencyScore: 4,
    };
  }

  if (hoursRemaining < 0) {
    const overdue = Math.abs(hoursRemaining);
    return {
      state: 'overdue',
      hoursRemaining,
      deadlineAt: new Date(deadline).toISOString(),
      label: overdue < 1
        ? `Overdue by ${Math.round(overdue * 60)}m`
        : `Overdue by ${Math.round(overdue)}h`,
      urgencyScore: 3,
    };
  }

  if (hoursRemaining <= 2) {
    return {
      state: 'warning',
      hoursRemaining,
      deadlineAt: new Date(deadline).toISOString(),
      label: hoursRemaining < 1
        ? `Due in ${Math.round(hoursRemaining * 60)}m`
        : `Due in ${hoursRemaining.toFixed(1)}h`,
      urgencyScore: 2,
    };
  }

  return {
    state: 'safe',
    hoursRemaining,
    deadlineAt: new Date(deadline).toISOString(),
    label: `Due in ${hoursRemaining.toFixed(0)}h`,
    urgencyScore: 1,
  };
}

/** CSS classes per SLA state for the card's left border */
export const SLA_BORDER: Record<SlaState, string> = {
  escalated: 'border-l-4 border-purple-500 dark:border-purple-600',
  overdue:   'border-l-4 border-red-500   dark:border-red-600',
  warning:   'border-l-4 border-amber-400 dark:border-amber-500',
  safe:      'border-l-4 border-emerald-400 dark:border-emerald-600',
  none:      '',
};

/** Badge color classes per SLA state */
export const SLA_BADGE: Record<SlaState, string> = {
  escalated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  overdue:   'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',
  warning:   'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300',
  safe:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  none:      '',
};

/** Sorting comparator — more urgent = higher in list */
export function slaUrgencySort(a: SlaInfo, b: SlaInfo): number {
  if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
  // within same tier, most overdue / least remaining goes first
  if (a.hoursRemaining !== null && b.hoursRemaining !== null) return a.hoursRemaining - b.hoursRemaining;
  return 0;
}
