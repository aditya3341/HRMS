import React, { useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Users } from 'lucide-react';

export interface OrgNodeCardProps {
  data: {
    id: string;
    name: string;
    designation: string;
    department: string;
    avatarUrl?: string;
    reportingTo?: string;
    childrenCount?: number;
    isSearchResult?: boolean;
  };
  isHighlighted?: boolean;
  departmentColor?: string;
}

const getInitials = (name: string) => {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getDepartmentGradient = (dept: string): [string, string] => {
  const deptLower = dept.toLowerCase();
  
  const colorMap: Record<string, [string, string]> = {
    'engineering': ['from-blue-500', 'to-cyan-500'],
    'sales': ['from-emerald-500', 'to-teal-500'],
    'marketing': ['from-purple-500', 'to-pink-500'],
    'hr': ['from-orange-500', 'to-red-500'],
    'finance': ['from-indigo-500', 'to-blue-500'],
    'operations': ['from-yellow-500', 'to-orange-500'],
    'product': ['from-fuchsia-500', 'to-purple-500'],
    'design': ['from-pink-500', 'to-rose-500'],
  };

  for (const [key, colors] of Object.entries(colorMap)) {
    if (deptLower.includes(key)) return colors;
  }

  const hash = dept.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients: Array<[string, string]> = [
    ['from-blue-500', 'to-cyan-500'],
    ['from-emerald-500', 'to-teal-500'],
    ['from-purple-500', 'to-pink-500'],
    ['from-indigo-500', 'to-blue-500'],
    ['from-yellow-500', 'to-orange-500'],
  ];
  return gradients[hash % gradients.length];
};

const OrgNodeCard: React.FC<OrgNodeCardProps> = ({ data, isHighlighted = false, departmentColor }) => {
  const navigate = useNavigate();
  const [fromColor, toColor] = useMemo(() => getDepartmentGradient(data.department), [data.department]);

  const handleClick = () => {
    if (data.id) {
      navigate(`/employees/${data.id}`);
    }
  };

  const isExecutive = data.designation?.toLowerCase().includes('director') || 
                      data.designation?.toLowerCase().includes('head') ||
                      data.designation?.toLowerCase().includes('manager') ||
                      data.designation?.toLowerCase().includes('cto') ||
                      data.designation?.toLowerCase().includes('ceo');

  const nodeSize = isExecutive ? 'w-80' : 'w-72';
  const borderWidth = isHighlighted ? 'border-2' : 'border';

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      className={`relative ${nodeSize} p-4 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl ${borderWidth} ${
        isHighlighted ? 'border-yellow-400 dark:border-yellow-500 shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'border-gray-100 dark:border-gray-700'
      } shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_12px_50px_rgba(59,130,246,0.25)] dark:hover:shadow-[0_12px_50px_rgba(59,130,246,0.15)] cursor-pointer group overflow-hidden transition-all duration-200`}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800 z-10"
      />

      {/* Decorative gradient orb */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${fromColor} ${toColor} rounded-full blur-3xl opacity-0 group-hover:opacity-25 dark:group-hover:opacity-15 transition-opacity duration-300 pointer-events-none`} />

      {/* Top accent bar showing department */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${fromColor} ${toColor}`} />

      <div className="relative space-y-3 z-10">
        {/* Avatar + Name Row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br ${fromColor} ${toColor} p-[2px] shadow-md ring-2 ring-white dark:ring-gray-700`}>
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
              {data.avatarUrl ? (
                <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <span className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-br ${fromColor} ${toColor}`}>
                  {getInitials(data.name)}
                </span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
              {data.name}
            </p>
            <p className={`text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-r ${fromColor} ${toColor} truncate`}>
              {data.designation}
            </p>
          </div>

          {/* View Profile icon — appears on hover */}
          <ExternalLink className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
        </div>

        {/* Department Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${fromColor} ${toColor} text-white shadow-sm`}>
            {data.department}
          </span>
          {data.childrenCount && data.childrenCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-600">
              <Users className="w-3 h-3" />
              <span>{data.childrenCount}</span>
            </span>
          )}
        </div>

        {/* Additional info row for executives */}
        {isExecutive && data.reportingTo && (
          <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reports to: <span className="font-medium text-gray-700 dark:text-gray-300">{data.reportingTo}</span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800 z-10"
      />

      {/* Pulse indicator for search results */}
      {data.isSearchResult && (
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`absolute -inset-1 rounded-2xl border border-yellow-400 opacity-50 pointer-events-none`}
        />
      )}
    </motion.div>
  );
};

export default OrgNodeCard;
