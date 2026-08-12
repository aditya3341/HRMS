import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { biometricMappingApi, MappingCreate } from '@/api/biometricMapping';
import api from '@/lib/api';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  UserPlus, 
  Trash2, 
  Search, 
  Fingerprint, 
  Link as LinkIcon,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export function BiometricMappingUI() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('global');

  // Queries
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['biometric-mappings'],
    queryFn: () => biometricMappingApi.list()
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-for-mapping'],
    queryFn: async () => {
        const res = await api.get('/employees/');
        // Backend returns { success: true, data: [...] }
        return (res as any).data || [];
    }
  });

  const { data: devices } = useQuery({
    queryKey: ['biometric-devices-for-mapping'],
    queryFn: async () => {
        const res = await api.get('/biometric/devices/');
        return (res as any).data || [];
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: MappingCreate) => biometricMappingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
      toast.success('Employee mapped successfully');
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to create mapping');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => biometricMappingApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biometric-mappings'] });
      toast.success('Mapping removed');
    }
  });

  const resetForm = () => {
    setSelectedEmployeeId('');
    setEnrollmentId('');
    setSelectedDeviceId('global');
  };

  const handleCreate = () => {
    if (!selectedEmployeeId || !enrollmentId) {
      toast.error('Please select an employee and enter an enrollment ID');
      return;
    }

    createMutation.mutate({
      employee_id: selectedEmployeeId,
      device_enrollment_id: enrollmentId,
      source_device_id: selectedDeviceId === 'global' ? undefined : selectedDeviceId
    });
  };

  const filteredMappings = mappings?.filter(m => 
    m.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    m.employee_code.toLowerCase().includes(search.toLowerCase()) ||
    m.device_enrollment_id.includes(search)
  ) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Identity Mapping
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Bridge the gap between device user IDs (Enrollment IDs) and system employee records.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
              <UserPlus className="w-4 h-4" />
              New Mapping
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Identity Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>1. Select System Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>2. Device Enrollment ID (User ID on Terminal)</Label>
                <div className="relative">
                  <Fingerprint className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="e.g. 101, 5002" 
                    className="pl-9"
                    value={enrollmentId}
                    onChange={(e) => setEnrollmentId(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">This is the unique number assigned to the employee on the physical device.</p>
              </div>

              <div className="space-y-2 text-primary bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="flex gap-2">
                   <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                   <p className="text-xs leading-relaxed">
                     <strong>Pro Tip:</strong> For most Biomax/ZKteco devices, this is the "User ID" or "Enrollment Number" found in the device menu.
                   </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreate} 
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Mapping
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by name, code or device ID..." 
          className="pl-9 bg-background/50 border-white/5 focus:bg-background transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card/30 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>System Employee</TableHead>
              <TableHead>Enrollment ID</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Mapped On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappingsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                  No identity mappings found.
                </TableCell>
              </TableRow>
            ) : (
              filteredMappings.map((mapping: any) => (
                <TableRow key={mapping.id} className="hover:bg-muted/20 group">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">{mapping.employee_name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{mapping.employee_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono px-3">
                      <Fingerprint className="w-3 h-3 mr-1.5" />
                      {mapping.device_enrollment_id}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {mapping.source_device_name || 'All Devices'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {new Date(mapping.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this mapping?')) {
                          deleteMutation.mutate(mapping.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
