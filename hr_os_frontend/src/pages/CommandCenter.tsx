import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from "@/components/ui/switch";
import LeavePolicyConfig from '@/components/admin/LeavePolicyConfig';
import { 
  Shield, 
  Settings, 
  Users, 
  LayoutGrid, 
  Building2, 
  Search, 
  Plus, 
  Check, 
  X, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Lock,
  ChevronDown,
  UserCheck,
  History,
  Activity,
  UserPlus,
  ArrowRight,
  Trash2,
  CalendarDays
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/[0.04] border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

const Chip = ({ children, active, onClick }: { children: React.ReactNode, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
      active 
        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105" 
        : "bg-white/[0.05] border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20"
    }`}
  >
    {children}
  </button>
);

// --- Sections ---

const RoleManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminApi.getRoles
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success("Role created successfully");
      setIsModalOpen(false);
      setNewRole("");
      setDisplayName("");
      setDescription("");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success("Role deleted successfully");
    },
    onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to delete role");
    }
  });

  const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE", "HR_ADMIN"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">System Roles</h2>
          <p className="text-sm text-slate-500">Define and manage organizational roles and permissions.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-medium text-sm transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Add Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-white/10 backdrop-blur-3xl bg-slate-900/90 shadow-2xl text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-medium">Create New Role</DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role Identifier</label>
                <Input 
                  placeholder="e.g. SYSTEM_AUDITOR" 
                  value={newRole} 
                  onChange={(e) => setNewRole(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-medium"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Name</label>
                <Input 
                  placeholder="e.g. System Auditor" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-medium"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <Input 
                  placeholder="Responsibilities..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-14 rounded-2xl bg-white/5 border-white/5 focus:border-primary/50 text-white font-medium"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createMutation.mutate({ role: newRole, display_name: displayName, description })}
                disabled={!newRole || !displayName || createMutation.isPending}
                className="w-full bg-primary text-white rounded-xl h-12 font-medium"
              >
                {createMutation.isPending ? "Creating..." : "Save Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-3xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))
        ) : (
          roles?.map((roleObj: any) => (
            <motion.div 
              key={roleObj.role}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity" />
              <GlassCard className="p-6 h-full transition-all border-white/10 bg-white/[0.04] rounded-2xl flex flex-col justify-between relative z-10">
                <div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-medium text-slate-500">System Role</span>
                         {!SYSTEM_ROLES.includes(roleObj.role) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete the ${roleObj.display_name} role?`)) {
                                  deleteMutation.mutate(roleObj.role);
                                }
                              }}
                              className="w-7 h-7 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                      </div>
                   </div>
                   <h3 className="text-lg font-semibold text-white mb-2">{roleObj.display_name}</h3>
                   <p className="text-xs text-slate-500 leading-relaxed mb-6">{roleObj.description}</p>
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-auto">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                   <span className="text-[10px] font-mono text-slate-600">ID: {roleObj.role}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const PermissionMatrix = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [search, setSearch] = useState("");
  
  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminApi.getRoles
  });

  const { data: permissions, isLoading: permsLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: adminApi.getPermissions
  });

  const { data: rolePerms, isLoading: rolePermsLoading } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: () => adminApi.getRolePermissions(selectedRole),
    enabled: !!selectedRole
  });

  const [localPerms, setLocalPerms] = useState<string[]>([]);

  useEffect(() => {
    if (rolePerms) {
      setLocalPerms(rolePerms);
    }
  }, [rolePerms]);

  const updateMutation = useMutation({
    mutationFn: (newPerms: string[]) => adminApi.updateRolePermissions(selectedRole, newPerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions', selectedRole] });
      toast.success("Permissions updated successfully");
    },
    onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to update permissions");
        setLocalPerms(rolePerms || []);
    }
  });

  const togglePermission = (code: string) => {
    const next = localPerms.includes(code)
      ? localPerms.filter(p => p !== code)
      : [...localPerms, code];
    setLocalPerms(next);
  };

  const filteredPermissions = useMemo(() => {
     if (!permissions) return {};
     const filtered: any = {};
     Object.entries(permissions).forEach(([category, perms]: [string, any]) => {
        const matches = perms.filter((p: any) => 
            p.code.toLowerCase().includes(search.toLowerCase()) || 
            p.description.toLowerCase().includes(search.toLowerCase())
        );
        if (matches.length > 0) {
            filtered[category] = matches;
        }
     });
     return filtered;
  }, [permissions, search]);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleApply = () => {
    if (selectedRole === "SUPER_ADMIN") {
        setShowConfirm(true);
    } else {
        updateMutation.mutate(localPerms);
    }
  };

  const confirmUpdate = () => {
    setShowConfirm(false);
    updateMutation.mutate(localPerms);
  };

  if (!roles) return null;

  return (
    <div className="space-y-8 max-w-6xl">
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-[2.5rem] border-none backdrop-blur-3xl bg-slate-900/95 shadow-2xl text-white overflow-hidden p-0">
          <div className="h-2 bg-red-600 animate-pulse" />
          <div className="p-8 space-y-6">
             <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-red-500 font-semibold text-xl">
                   <AlertCircle className="w-6 h-6" /> Security Warning
                </DialogTitle>
             </DialogHeader>
             <div className="py-2">
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                   You are attempting to modify core architecture permissions for the <span className="font-black text-white underline decoration-red-500 underline-offset-4 tracking-widest">SUPER_ADMIN</span> node. This action bypasses standard safety protocols and could lead to permanent system desynchronization or lockout.
                </p>
             </div>
             <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowConfirm(false)} className="rounded-xl border-white/10 text-slate-400">Cancel</Button>
                <Button onClick={confirmUpdate} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">Confirm Changes</Button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/[0.02] p-4 rounded-3xl border border-white/5 backdrop-blur-3xl">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Access Matrix</h2>
              <p className="text-xs text-slate-500">Define visibility and modification rights for this role.</p>
            </div>
         </div>

        <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-64 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
               <Input 
                 placeholder="Search permissions..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="pl-12 h-11 bg-white/5 border-white/10 rounded-xl text-sm text-white"
               />
            </div>

            <Select value={selectedRole} onValueChange={v => setSelectedRole(v)}>
                <SelectTrigger className="w-56 h-12 rounded-2xl border-white/10 bg-black/40 text-xs font-black uppercase tracking-widest text-white shadow-xl">
                    <SelectValue placeholder="Protocol Node" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/10 backdrop-blur-3xl bg-slate-900/90 text-white">
                    {roles.map((rObject: any) => (
                        <SelectItem key={rObject.role} value={rObject.role} className="rounded-xl focus:bg-white/10 font-black uppercase text-[10px] tracking-widest">
                           {rObject.display_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Button 
              disabled={!selectedRole || updateMutation.isPending || JSON.stringify(localPerms) === JSON.stringify(rolePerms)}
              onClick={handleApply}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-medium text-sm transition-all active:scale-95"
            >
              {updateMutation.isPending ? "Updating..." : "Save Changes"}
            </Button>
        </div>
      </div>

      {!selectedRole ? (
        <div className="h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-6 bg-white/[0.01] animate-in fade-in duration-1000">
           <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
              <ShieldCheck className="w-8 h-8 text-slate-800" />
           </div>
           <div className="text-center space-y-1">
              <h3 className="text-lg font-medium text-white">Select a Role</h3>
              <p className="text-xs text-slate-500">Select a role to view and manage its permissions.</p>
           </div>
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-xl">
           <div className="max-h-[600px] overflow-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-white/10">
                    <tr>
                       <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Permission Code</th>
                       <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Description</th>
                       <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredPermissions && Object.entries(filteredPermissions).map(([category, perms]: [string, any]) => (
                        <React.Fragment key={category}>
                            <tr className="bg-white/[0.04]">
                                <td colSpan={3} className="px-8 py-2 text-[10px] font-bold text-primary uppercase tracking-wider">
                                    {category}
                                </td>
                            </tr>
                            {perms.map((p: any) => (
                                <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                           <div className={`w-1.5 h-1.5 rounded-full ${localPerms.includes(p.code) ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                                           <p className="text-xs font-medium text-slate-200">{p.code}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="text-xs text-slate-500 max-w-md mx-auto text-center">{p.description}</p>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <Switch 
                                            checked={localPerms.includes(p.code)}
                                            onCheckedChange={() => togglePermission(p.code)}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

const UserRoleAssignment = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any>(null);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);
  const [localUserPerms, setLocalUserPerms] = useState<string[]>([]);
  const [permsSearch, setPermsSearch] = useState("");
  
  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminApi.getRoles
  });

  const { data: permissions } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: adminApi.getPermissions
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-search', search],
    queryFn: () => adminApi.searchUsers(search),
    enabled: true
  });

  const { data: userPerms } = useQuery({
    queryKey: ['user-permissions', selectedUserForPerms?.id],
    queryFn: () => adminApi.getUserPermissions(selectedUserForPerms.id),
    enabled: !!selectedUserForPerms?.id
  });

  useEffect(() => {
    if (userPerms) {
      setLocalUserPerms(userPerms);
    }
  }, [userPerms]);

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: string }) => adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-search'] });
      toast.success("User role updated successfully");
    }
  });

  const updateUserPermsMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: string, permissions: string[] }) =>
      adminApi.updateUserPermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', selectedUserForPerms?.id] });
      toast.success("Individual permissions override updated successfully");
      setIsPermsModalOpen(false);
      setSelectedUserForPerms(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update permissions");
    }
  });

  const handleManageUserPermissions = (user: any) => {
    setSelectedUserForPerms(user);
    setLocalUserPerms([]);
    setIsPermsModalOpen(true);
  };

  const toggleUserPermission = (code: string) => {
    setLocalUserPerms(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const filteredPermissions = useMemo(() => {
     if (!permissions) return {};
     const filtered: any = {};
     Object.entries(permissions).forEach(([category, perms]: [string, any]) => {
        const matches = perms.filter((p: any) => 
            p.code.toLowerCase().includes(permsSearch.toLowerCase()) || 
            p.description.toLowerCase().includes(permsSearch.toLowerCase())
        );
        if (matches.length > 0) {
            filtered[category] = matches;
        }
     });
     return filtered;
  }, [permissions, permsSearch]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Individual Permissions Override Dialog */}
      <Dialog open={isPermsModalOpen} onOpenChange={setIsPermsModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] rounded-[2rem] border-white/10 backdrop-blur-3xl bg-slate-900/90 shadow-2xl text-white flex flex-col p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Customize Permissions: {selectedUserForPerms?.email}
            </DialogTitle>
            <p className="text-xs text-slate-400">
              Grant specific feature permissions directly to this user. These overrides are additive to the role permissions.
            </p>
          </DialogHeader>

          <div className="mb-4 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filter permissions..." 
              value={permsSearch}
              onChange={(e) => setPermsSearch(e.target.value)}
              className="pl-12 h-10 bg-white/5 border-white/10 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
            {Object.keys(filteredPermissions).length === 0 ? (
              <p className="text-center text-xs text-slate-500 italic py-6">No permissions found matching search.</p>
            ) : (
              Object.entries(filteredPermissions).map(([category, perms]: [string, any]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider bg-white/[0.02] px-3 py-1.5 rounded-lg">
                    {category}
                  </h4>
                  <div className="divide-y divide-white/5 bg-white/[0.01] rounded-xl border border-white/5 overflow-hidden">
                    {perms.map((p: any) => (
                      <div key={p.code} className="flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-200">{p.code}</p>
                          <p className="text-[10px] text-slate-500">{p.description}</p>
                        </div>
                        <Switch 
                          checked={localUserPerms.includes(p.code)}
                          onCheckedChange={() => toggleUserPermission(p.code)}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPermsModalOpen(false)} className="rounded-xl border-white/10 text-slate-400 text-xs">
              Cancel
            </Button>
            <Button 
              onClick={() => updateUserPermsMutation.mutate({ userId: selectedUserForPerms.id, permissions: localUserPerms })}
              disabled={updateUserPermsMutation.isPending}
              className="bg-primary text-white rounded-xl text-xs h-10 px-6 font-medium"
            >
              {updateUserPermsMutation.isPending ? "Saving..." : "Save Overrides"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-xl font-medium text-white">User Roles & Permissions</h2>
          <p className="text-sm text-slate-500">Map users to roles and configure custom employee permission overrides.</p>
        </div>
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-11 bg-white/5 border-white/10 rounded-xl text-sm text-white"
          />
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.04] border-b border-white/10">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User Identity</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions / Role</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-sm font-medium text-white">{u.email}</span>
                         <span className="text-[10px] text-slate-600 font-mono">ID: {u.id.slice(0,8)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-9 h-9 rounded-xl border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        onClick={() => handleManageUserPermissions(u)}
                        title="Manage specific overrides for this employee"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Select 
                        defaultValue={u.role} 
                        onValueChange={(v) => updateRoleMutation.mutate({ userId: u.id, role: v })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-48 h-9 rounded-xl border-white/10 bg-black/40 text-xs font-medium text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-white/10 text-white rounded-xl">
                          {roles?.map((rObj: any) => (
                            <SelectItem key={rObj.role} value={rObj.role} className="text-xs">
                               {rObj.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DepartmentManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDept, setNewDept] = useState("");

  const { data: departments, isLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: adminApi.getDepartments
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      toast.success("Department created successfully");
      setIsModalOpen(false);
      setNewDept("");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">Departments</h2>
          <p className="text-sm text-slate-500">Manage organizational units and department structures.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-medium text-sm transition-all active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> Add Department
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-2xl bg-card border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-lg font-medium">Create New Department</DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department Name</label>
                        <Input 
                            placeholder="e.g. Engineering" 
                            value={newDept} 
                            onChange={(e) => setNewDept(e.target.value)}
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={() => createMutation.mutate(newDept)}
                        disabled={!newDept || createMutation.isPending}
                        className="w-full bg-primary text-white rounded-xl h-11"
                    >
                        {createMutation.isPending ? "Creating..." : "Save Department"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {departments?.map((dept: any) => (
            <motion.div key={dept.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }}>
                <GlassCard className="p-8 h-48 bg-white/[0.03] border-white/5 rounded-3xl relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full translate-x-16 -translate-y-16 blur-3xl group-hover:bg-orange-500/20 transition-all" />
                    <div className="flex justify-between items-start relative z-10">
                       <Building2 className="w-10 h-10 text-orange-500" />
                       <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employees</span>
                          <p className="text-2xl font-bold text-white">{dept.employee_count || 0}</p>
                       </div>
                    </div>
                    <div className="relative z-10">
                       <h3 className="text-xl font-medium text-white tracking-tight">{dept.name}</h3>
                       <p className="text-[10px] text-slate-600 font-mono mt-1">ID: {dept.id.slice(0,8)}</p>
                    </div>
                </GlassCard>
            </motion.div>
        ))}
      </div>
    </div>
  );
};
const AuditLogSection = () => {
  const [filters, setFilters] = useState<{
    action?: string;
    user_id?: string;
    module?: string;
    resource_id?: string;
  }>({});
  
  const { data: userData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
        const res = await fetch('/api/auth/me'); // Placeholder if needed
        return res.json();
    },
    enabled: false // Just showing logic
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', filters],
    queryFn: () => adminApi.getAuditLogs(filters)
  });

  const setQuickFilter = (type: string) => {
    switch(type) {
        case 'LEAVE':
            setFilters({ module: 'LEAVE' });
            break;
        case 'TODAY':
            // Today logic (backend will handle created_at if we add it, for now just show concept)
            setFilters({});
            break;
        case 'CRITICAL':
            setFilters({ action: 'ROLE_UPDATED' });
            break;
        case 'ALL':
        default:
            setFilters({});
            break;
    }
  };

  const getActionColor = (action: string) => {
     if (action.includes("CREATED")) return "text-emerald-500 bg-emerald-500/10";
     if (action.includes("PATCHED") || action.includes("UPDATED")) return "text-blue-500 bg-blue-500/10";
     if (action.includes("DELETED") || action.includes("REMOVED")) return "text-red-500 bg-red-500/10";
     return "text-slate-500 bg-slate-500/10";
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">Audit Logs</h2>
          <p className="text-sm text-slate-500">Complete record of administrative actions and system modifications.</p>
        </div>
        <div className="flex gap-3">
           <Select value={filters.action} onValueChange={v => setFilters({ ...filters, action: v === "ALL" ? undefined : v })}>
              <SelectTrigger className="w-48 h-10 rounded-xl bg-white/5 border-white/10 text-xs font-medium">
                 <SelectValue placeholder="Filter Action" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 backdrop-blur-3xl bg-slate-900/90 text-white">
                 <SelectItem value="ALL">All Actions</SelectItem>
                 <SelectItem value="EMPLOYEE_CREATED">Employee Created</SelectItem>
                 <SelectItem value="ROLE_UPDATED">Role Updated</SelectItem>
                 <SelectItem value="LEAVE_APPROVED">Leave Approved</SelectItem>
                 <SelectItem value="LOGIN_SUCCESS">Login Success</SelectItem>
              </SelectContent>
           </Select>
        </div>
      </div>

       <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <Chip active={Object.keys(filters).length === 0} onClick={() => setQuickFilter('ALL')}>All Logs</Chip>
          <Chip active={filters.module === 'LEAVE'} onClick={() => setQuickFilter('LEAVE')}>Leave Management</Chip>
          <Chip active={filters.action === 'ROLE_UPDATED'} onClick={() => setQuickFilter('CRITICAL')}>Critical Changes</Chip>
          <Chip onClick={() => toast.info("Advanced date filtering coming soon")}>Today</Chip>
       </div>

       <div className="border border-white/10 bg-white/[0.02] rounded-2xl overflow-hidden shadow-xl">
          <div className="max-h-[600px] overflow-auto">
             {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center space-y-4">
                   <Activity className="w-10 h-10 text-slate-700 animate-pulse" />
                   <p className="text-slate-500 text-xs">Loading logs...</p>
                </div>
             ) : (
                <table className="w-full text-left border-collapse">
                   <thead className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-white/10 z-20">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actor</th>
                         <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Context</th>
                      </tr>
                   </thead>
                  <tbody>
                     {logs?.map((log: any) => (
                        <tr key={log.id} className="group hover:bg-white/[0.03] transition-colors border-b border-white/[0.02]">
                           <td className="px-6 py-4">
                              <p className="text-[10px] font-bold text-slate-400 font-mono">
                                 {new Date(log.created_at).toLocaleString()}
                              </p>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getActionColor(log.action)}`}>
                                 {log.action.replace(/_/g, " ")}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-black text-white capitalize">
                                    {log.user?.name?.[0] || log.user?.email?.[0] || "U"}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-300">{log.user?.name || "System"}</span>
                                    <span className="text-[9px] text-slate-500">{log.user?.email}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{log.module}</span>
                                 <span className="text-[9px] text-slate-500">{log.resource_type}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex justify-end">
                                 <div className="bg-slate-900/50 p-2 rounded-lg border border-white/5 max-w-[200px] hover:max-w-none transition-all overflow-hidden text-right group/context">
                                    <pre className="text-[8px] font-mono text-slate-500 truncate group-hover/context:whitespace-normal">
                                       {JSON.stringify(log.new_values || log.metadata || {}, null, 2)}
                                    </pre>
                                 </div>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
             )}
          </div>
       </div>
    </div>
  );
};

const AutomationRules = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerType, setTriggerType] = useState("CATEGORY");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState("ASSIGN");
  const [actionValue, setActionValue] = useState("");

  const { data: rules, isLoading } = useQuery({
    queryKey: ['admin-automation-rules'],
    queryFn: adminApi.getAutomationRules
  });

  const createMutation = useMutation({
    mutationFn: adminApi.createAutomationRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-automation-rules'] });
      toast.success("Automation rule initialized");
      setIsModalOpen(false);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => adminApi.toggleAutomationRule(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-automation-rules'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">Automation Rules</h2>
          <p className="text-sm text-slate-500">Configure automated workflows and triggers.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-white rounded-xl h-11 px-6">
                    <Plus className="w-4 h-4 mr-2" /> New Rule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-lg font-medium">Create Workflow Rule</DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trigger Type</label>
                        <Select value={triggerType} onValueChange={setTriggerType}>
                            <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10 text-white rounded-xl">
                                <SelectItem value="CATEGORY">By Category</SelectItem>
                                <SelectItem value="PRIORITY">By Priority</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Condition Value</label>
                            <Input 
                                placeholder="e.g. IT" 
                                value={conditionValue}
                                onChange={(e) => setConditionValue(e.target.value)}
                                className="h-11 rounded-xl bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Action</label>
                            <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white rounded-xl">
                                    <SelectItem value="ASSIGN">Assign To User</SelectItem>
                                    <SelectItem value="SET_PRIORITY">Set Priority</SelectItem>
                                    <SelectItem value="SET_SLA">Set SLA Hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Value</label>
                        <Input 
                            placeholder="Value" 
                            value={actionValue}
                            onChange={(e) => setActionValue(e.target.value)}
                            className="h-11 rounded-xl bg-white/5 border-white/10 text-white"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        onClick={() => createMutation.mutate({ 
                             trigger_type: triggerType, 
                             condition_value: conditionValue, 
                             action_type: actionType, 
                             action_value: actionValue 
                        })}
                        disabled={createMutation.isPending || !conditionValue || !actionValue}
                        className="w-full h-11 bg-primary text-white rounded-xl"
                    >
                        {createMutation.isPending ? "Creating..." : "Create Rule"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {rules?.map((rule: any) => (
          <motion.div 
            key={rule.id}
            whileHover={{ y: -4 }}
          >
             <GlassCard className="p-6 bg-white/[0.04] border-white/10 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Rule</p>
                      <h3 className="text-lg font-semibold text-white">{rule.trigger_type} ({rule.condition_value})</h3>
                   </div>
                   <Switch 
                      checked={rule.is_active}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                      className="data-[state=checked]:bg-primary"
                   />
                </div>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 mb-4">
                   <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <ArrowRight className="w-4 h-4" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Execution Action</p>
                      <p className="text-sm font-medium text-slate-200">{rule.action_type} → <span className="text-primary">{rule.action_value}</span></p>
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                   <span className="text-[10px] text-slate-600 font-mono">v1.0.4</span>
                </div>
             </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function CommandCenter() {
  const [activeTab, setActiveTab ] = useState<'roles' | 'permissions' | 'users' | 'departments' | 'audit' | 'automation' | 'leave-policies'>('roles');

  const navigation = [
    { id: 'roles', label: 'Roles', icon: Shield, color: 'text-blue-500' },
    { id: 'permissions', label: 'Permissions', icon: Lock, color: 'text-emerald-500' },
    { id: 'users', label: 'User Roles', icon: UserCheck, color: 'text-violet-500' },
    { id: 'departments', label: 'Departments', icon: Building2, color: 'text-orange-500' },
    { id: 'automation', label: 'Automation', icon: Activity, color: 'text-blue-500' },
    { id: 'leave-policies', label: 'Leave Policies', icon: CalendarDays, color: 'text-rose-500' },
    { id: 'audit', label: 'Audit Logs', icon: History, color: 'text-slate-400' },
  ];

  return (
    <div className="flex h-[calc(100vh-100px)] animate-in fade-in duration-500">

      <div className="w-80 fixed h-full p-8 hidden lg:block border-r border-white/5 bg-background z-30">
        <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Admin</h1>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Command Center</p>
            </div>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group
                ${activeTab === item.id 
                  ? 'bg-white/5 text-white' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-primary' : 'text-slate-500'}`} />
              <span className="text-xs font-medium tracking-wide">{item.label}</span>
              
              {activeTab === item.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute left-0 w-1 h-4 bg-primary rounded-r-full"
                  />
              )}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-1 lg:ml-80 relative z-10 overflow-y-auto pr-2">
        <div className="space-y-8">
            <PageHeader 
              icon={Settings}
              title="Command Center"
              subtitle="Administrative hub for managing organizational rules, permissions, and system audit logs."
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'roles' && <RoleManagement />}
                    {activeTab === 'permissions' && <PermissionMatrix />}
                    {activeTab === 'users' && <UserRoleAssignment />}
                    {activeTab === 'departments' && <DepartmentManagement />}
                    {activeTab === 'automation' && <AutomationRules />}
                    {activeTab === 'audit' && <AuditLogSection />}
                    {activeTab === 'leave-policies' && <LeavePolicyConfig />}
                </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
