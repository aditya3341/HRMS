import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  ChevronDown, 
  ChevronRight, 
  UserPlus, 
  Building, 
  User, 
  Edit2, 
  Check, 
  Link as LinkIcon, 
  Users,
  Grid,
  Network
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface OrgNodeData {
  id: string;
  name: string;
  designation: string;
  department: string;
  email?: string;
  avatar_url?: string;
  manager_id?: string | null;
  children?: OrgNodeData[];
}

interface ModernOrgChartProps {
  data: OrgNodeData[];
}

interface HighlightedNode extends OrgNodeData {
  children: HighlightedNode[];
  reportsToName?: string | null;
}

export default function ModernOrgChart({ data }: ModernOrgChartProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  
  // Local list copy to sync updates instantly
  const [localEmployees, setLocalEmployees] = useState<OrgNodeData[]>(data || []);

  // Sync when data prop updates
  useEffect(() => {
    if (data) setLocalEmployees(data);
  }, [data]);

  const isHRorAdmin = useMemo(() => {
    const r = (user?.role || "").toUpperCase();
    return ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "HR"].includes(r);
  }, [user]);

  // Fetch departments for dropdowns
  const { data: departments } = useQuery({
    queryKey: ["departments-org"],
    queryFn: async () => {
      const res: any = await api.get('/admin/departments');
      return res?.data || res || [];
    }
  });

  // Assign Manager Mutation
  const assignManagerMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; managerId: string | null }) => {
      await api.patch(`/employees/${payload.employeeId}`, { manager_id: payload.managerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["orgChartData"] });
      queryClient.invalidateQueries({ queryKey: ["orgChart"] });
      toast.success("Manager assigned successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to assign manager.");
    }
  });

  // Assign Department Mutation
  const assignDeptMutation = useMutation({
    mutationFn: async (payload: { userId: string; departmentId: string }) => {
      await api.patch(`/admin/users/${payload.userId}/department`, { department_id: payload.departmentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["orgChartData"] });
      queryClient.invalidateQueries({ queryKey: ["orgChart"] });
      toast.success("Department updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update department.");
    }
  });

  // Group: Unassigned Employees (No manager ID, or manager ID not in active database)
  const unassignedEmployees = useMemo(() => {
    return localEmployees.filter(emp => {
      if (!emp.manager_id) return true;
      const exists = localEmployees.some(e => e.id === emp.manager_id);
      return !exists;
    });
  }, [localEmployees]);

  // Transform flat list of employees into hierarchical tree structure
  const hierarchicalTree = useMemo(() => {
    const nodeMap: Record<string, HighlightedNode> = {};
    
    // Initialize nodes
    localEmployees.forEach(emp => {
      nodeMap[emp.id] = {
        ...emp,
        children: []
      };
    });

    const roots: HighlightedNode[] = [];
    localEmployees.forEach(emp => {
      const node = nodeMap[emp.id];
      if (emp.manager_id && nodeMap[emp.manager_id]) {
        node.reportsToName = nodeMap[emp.manager_id].name;
        nodeMap[emp.manager_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Filtering tree
    const filterTree = (nodes: HighlightedNode[]): HighlightedNode[] => {
      return nodes.map(n => {
        const nameText = n.name || "";
        const designationText = n.designation || "";
        const matchesSearch = searchTerm ? nameText.toLowerCase().includes(searchTerm.toLowerCase()) || designationText.toLowerCase().includes(searchTerm.toLowerCase()) : true;
        const matchesDept = departmentFilter ? n.department === departmentFilter : true;
        const filteredChildren = filterTree(n.children);
        
        if (matchesSearch && matchesDept) {
          return { ...n, children: filteredChildren };
        } else if (filteredChildren.length > 0) {
          return { ...n, children: filteredChildren };
        }
        return null;
      }).filter(Boolean) as HighlightedNode[];
    };

    return filterTree(roots);
  }, [localEmployees, searchTerm, departmentFilter]);

  // Handle department shift
  const handleUpdateDept = (empId: string, deptId: string) => {
    // Resolve user ID
    api.get(`/employees/${empId}/profile`).then((res: any) => {
      const uid = res?.data?.basic?.user_id;
      if (uid) {
        assignDeptMutation.mutate({ userId: uid, departmentId: deptId });
      } else {
        toast.error("User ID mapping not found.");
      }
    });
  };

  // Helper: List potential managers (excluding the employee themselves)
  const getPotentialManagers = (empId: string) => {
    return localEmployees.filter(e => e.id !== empId);
  };

  // RECURSIVE NODE CARD RENDERER
  const TreeNodeComponent = ({ node, level = 0 }: { node: HighlightedNode; level: number }) => {
    const [collapsed, setCollapsed] = useState(false);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="pl-6 relative border-l border-white/10 ml-4 py-2 space-y-2">
        {/* Connector stem */}
        <div className="absolute left-0 top-7 w-6 h-px bg-white/10" />

        {/* Dynamic Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 max-w-md shadow-md flex items-center justify-between gap-4 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-white/5 shadow-lg">
              <AvatarImage src={node.avatar_url || "/zipaworld_logo_light.png"} />
              <AvatarFallback className="text-xs font-bold">{node.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-black text-white">{node.name}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{node.designation}</p>
              <span className="text-[8px] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-black uppercase tracking-widest mt-1 inline-block">
                {node.department || "Staff"}
              </span>
            </div>
          </div>

          {/* HR Reassignment Dropdown Controls */}
          {isHRorAdmin && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Manager assignment dropdown */}
              <Select 
                value={node.manager_id || "none"} 
                onValueChange={(val) => assignManagerMutation.mutate({ 
                  employeeId: node.id, 
                  managerId: val === "none" ? null : val 
                })}
              >
                <SelectTrigger className="h-7 w-28 text-[9px] bg-black/40 border-white/5 text-slate-300 font-bold uppercase tracking-wider rounded-lg">
                  <SelectValue placeholder="Manager" />
                </SelectTrigger>
                <SelectContent className="bg-card text-white border-white/10 text-xs">
                  <SelectItem value="none">No Manager</SelectItem>
                  {getPotentialManagers(node.id).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department assignment dropdown */}
              <Select 
                value={node.department || ""} 
                onValueChange={(val) => {
                  const target = departments?.find((d: any) => d.name === val);
                  if (target) handleUpdateDept(node.id, target.id);
                }}
              >
                <SelectTrigger className="h-7 w-24 text-[9px] bg-black/40 border-white/5 text-slate-300 font-bold uppercase tracking-wider rounded-lg">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent className="bg-card text-white border-white/10 text-xs">
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Collapsible toggle */}
        {hasChildren && (
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-[9px] font-black uppercase text-primary tracking-widest pl-2 hover:text-white transition-colors py-1 block"
          >
            {collapsed ? `+ Expand ${node.children.length} Reportees` : `- Collapse Subordinates`}
          </button>
        )}

        {/* Children nodes rendering */}
        {hasChildren && !collapsed && (
          <div className="space-y-2 pt-1">
            {node.children.map(child => (
              <TreeNodeComponent key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
      
      {/* LEFT AREA: HIERARCHICAL TREE MAP */}
      <div className="lg:col-span-8 space-y-6">
        {/* Dynamic filter toolbar */}
        <div className="flex flex-wrap gap-4 py-3 px-4 bg-white/[0.02] border border-white/10 rounded-2xl items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search employee or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-black/40 border-white/5 text-xs text-white rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select 
              value={departmentFilter || "all"} 
              onValueChange={(val) => setDepartmentFilter(val === "all" ? null : val)}
            >
              <SelectTrigger className="h-9 w-40 text-xs bg-black/40 border-white/5 text-slate-300 rounded-xl">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-card text-white border-white/10 text-xs">
                <SelectItem value="all">All Departments</SelectItem>
                {departments?.map((d: any) => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Hierarchy Tree container */}
        <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-2xl overflow-y-auto max-h-[600px] space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-xs font-black uppercase text-white tracking-wider">Interactive Reporting Tree</span>
          </div>

          {hierarchicalTree.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              No matching branches in organization hierarchy.
            </div>
          ) : (
            <div className="space-y-4">
              {hierarchicalTree.map(root => (
                <div key={root.id} className="relative">
                  {/* Root Node Header styling */}
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-md shadow-md flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-primary/30 shadow-lg">
                        <AvatarImage src={root.avatar_url || "/zipaworld_logo_light.png"} />
                        <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">{root.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-white">{root.name}</p>
                          <span className="px-1.5 py-0.5 rounded bg-primary text-white text-[7px] font-black uppercase tracking-widest">Root</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{root.designation}</p>
                        <span className="text-[8px] px-2 py-0.5 rounded bg-primary/25 text-primary font-black uppercase tracking-widest mt-1 inline-block">
                          {root.department || "Staff"}
                        </span>
                      </div>
                    </div>

                    {isHRorAdmin && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Select 
                          value={root.manager_id || "none"} 
                          onValueChange={(val) => assignManagerMutation.mutate({ 
                            employeeId: root.id, 
                            managerId: val === "none" ? null : val 
                          })}
                        >
                          <SelectTrigger className="h-7 w-28 text-[9px] bg-black/40 border-white/5 text-slate-300 font-bold uppercase tracking-wider rounded-lg">
                            <SelectValue placeholder="Manager" />
                          </SelectTrigger>
                          <SelectContent className="bg-card text-white border-white/10 text-xs">
                            <SelectItem value="none">No Manager</SelectItem>
                            {getPotentialManagers(root.id).map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Root Children */}
                  {root.children && root.children.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {root.children.map(child => (
                        <TreeNodeComponent key={child.id} node={child} level={1} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: UNASSIGNED EMPLOYEES DESK */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Unassigned Members
            </span>
            <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/10">
              {unassignedEmployees.length} Total
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            These active employees do not currently have reporting managers assigned. Assign them to a manager to link them to the hierarchy chart.
          </p>

          <div className="space-y-3 max-h-[480px] overflow-y-auto">
            {unassignedEmployees.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                All active employees are mapped.
              </div>
            ) : (
              unassignedEmployees.map((emp) => (
                <div key={emp.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3 shadow-inner hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 border border-white/5">
                      <AvatarFallback className="text-xs font-bold">{emp.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-white">{emp.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{emp.designation}</p>
                      <span className="text-[8px] text-slate-500">{emp.department || "Unassigned"}</span>
                    </div>
                  </div>

                  {isHRorAdmin ? (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <Label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Assign Reporting Manager</Label>
                      <Select 
                        value="none" 
                        onValueChange={(val) => {
                          if (val !== "none") {
                            assignManagerMutation.mutate({ employeeId: emp.id, managerId: val });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-full text-xs bg-black/50 border-white/5 text-slate-300 rounded-lg">
                          <SelectValue placeholder="Select Manager..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card text-white border-white/10 text-xs">
                          <SelectItem value="none">Select Manager...</SelectItem>
                          {getPotentialManagers(emp.id).map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-[9px] text-amber-400 font-bold uppercase py-1 bg-amber-500/5 text-center rounded-lg">
                      Manager Assignment Required
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
