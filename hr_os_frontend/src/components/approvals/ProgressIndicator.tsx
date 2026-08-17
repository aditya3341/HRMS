import React from 'react';
import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  overallStatus?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  overallStatus,
}) => {
  const stepsCount = totalSteps && totalSteps > 0 ? totalSteps : Math.max(currentStep + 1, 3);
  const safeCurrent = currentStep || 1;
  const isRejected = overallStatus === 'REJECTED';
  const isApproved = overallStatus === 'APPROVED';

  return (
    <div className="flex items-center gap-1.5" title={`Step ${safeCurrent} of ${stepsCount}`}>
      {Array.from({ length: stepsCount }).map((_, idx) => {
        const stepNum = idx + 1;
        let state: 'completed' | 'active' | 'waiting' = 'waiting';
        if (isApproved) state = 'completed';
        else if (isRejected) state = stepNum <= safeCurrent ? 'completed' : 'waiting';
        else if (stepNum < safeCurrent) state = 'completed';
        else if (stepNum === safeCurrent) state = 'active';

        if (state === 'active') {
          return (
            <span key={idx} className="relative flex h-2.5 w-2.5">
              <motion.span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.75, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          );
        }

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08, type: 'spring', stiffness: 300 }}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              state === 'completed'
                ? isRejected
                  ? 'bg-red-500'
                  : 'bg-emerald-500'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        );
      })}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-0.5">
        {isApproved ? 'Done' : isRejected ? 'Declined' : `${safeCurrent}/${stepsCount}`}
      </span>
    </div>
  );
};
