import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Fingerprint, Plus, Server, CheckCircle2, XCircle, Pencil, Settings2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useBiometricDevices, useUpdateDevice, BiometricDevice } from '@/api/biometricDevices';
import { DeviceModal } from '@/components/biometric/DeviceModal';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { BiometricMappingUI } from '@/components/biometric/BiometricMappingUI';

export default function BiometricDevicesPage() {
  const { data: devices, isLoading, isError } = useBiometricDevices();
  const updateDevice = useUpdateDevice();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);

  // Biomax Config Local State
  const [biomaxUrl, setBiomaxUrl] = useState("");
  const [biomaxKey, setBiomaxKey] = useState("");
  const [biomaxSerial, setBiomaxSerial] = useState("");
  const [biomaxEnabled, setBiomaxEnabled] = useState(false);

  // Fetch Biomax Config
  const { data: biomaxConfig } = useQuery({
    queryKey: ['biomax-config'],
    queryFn: async () => {
      const res: any = await api.get('/biometric/devices/biomax/config');
      return res?.data || res;
    }
  });

  useEffect(() => {
    if (biomaxConfig) {
      setBiomaxUrl(biomaxConfig.api_url || "");
      setBiomaxKey(biomaxConfig.api_key || "");
      setBiomaxSerial(biomaxConfig.device_serial || "");
      setBiomaxEnabled(biomaxConfig.enabled || false);
    }
  }, [biomaxConfig]);

  const saveBiomaxConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/biometric/devices/biomax/config', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['biomax-config'] });
      toast.success('Biomax integration configurations saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save Biomax config.');
    }
  });

  const testBiomaxSyncMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/biometric/devices/biomax/sync');
    },
    onSuccess: (res: any) => {
      if (res && res.success) {
        toast.success(`Biomax: ${res.data?.message || 'Sync successful'}`);
      } else {
        toast.error(res?.error || 'Integration is disabled. Enable to sync.');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to sync with Biomax API.');
    }
  });

  // Global Attendance Mode
  const { data: modeConfigObj, isLoading: configLoading } = useQuery({
    queryKey: ['attendance-mode-config-admin'],
    queryFn: async () => {
      const res = await api.get('/configs/ATTENDANCE_MODE_CONFIG');
      return res ?? null;
    }
  });
  
  const modeConfig = modeConfigObj?.config_value || { mode: 'MANUAL', allow_manual: true };

  const updateModeMutation = useMutation({
    mutationFn: async (newConfig: any) => {
      await api.put('/configs/ATTENDANCE_MODE_CONFIG', {
        config_value: newConfig,
        description: "Updated from Biometric Devices settings"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-mode-config-admin'] });
      toast.success('Attendance mode updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "Failed to update attendance mode.");
    }
  });

  const handleModeToggle = (checked: boolean) => {
    updateModeMutation.mutate({
      ...modeConfig,
      mode: checked ? "BIOMETRIC" : "MANUAL",
      allow_manual: !checked
    });
  };

  const handleToggleStatus = async (device: BiometricDevice, newStatus: boolean) => {
    try {
      await updateDevice.mutateAsync({
        id: device.id,
        status: newStatus ? 'ACTIVE' : 'INACTIVE',
      });
      toast.success(`${device.name} has been ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to update device status");
    }
  };

  const handleEdit = (device: BiometricDevice) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedDevice(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={Fingerprint}
          title="Biometric Devices"
          subtitle="Manage hardware devices and API integrations for automated attendance tracking."
        />
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Device
        </Button>
      </div>

      {/* Global Mode Configuration Card */}
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden mb-8">
        <div className="p-1 border-b bg-muted/20">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            Global Attendance Mode
          </div>
        </div>
        <div className="p-6 bg-gradient-to-br from-card to-card/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Enforce Biometric Only Mode
                {modeConfig.mode === 'BIOMETRIC' && (
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Active</Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                When enabled, employees can only check in/out using configured biometric devices. Manual web and mobile check-ins will be disabled across the entire organization.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-muted/30 px-4 py-3 rounded-xl border border-border/50">
              <span className={`text-sm font-medium ${modeConfig.mode !== 'BIOMETRIC' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Manual Allowed
              </span>
              <Switch 
                checked={modeConfig.mode === 'BIOMETRIC'}
                onCheckedChange={handleModeToggle}
                disabled={configLoading || updateModeMutation.isPending}
                className="data-[state=checked]:bg-purple-600"
              />
              <span className={`text-sm font-medium flex items-center gap-1.5 ${modeConfig.mode === 'BIOMETRIC' ? 'text-purple-500' : 'text-muted-foreground'}`}>
                <ShieldCheck className="w-4 h-4" /> Strict Biometric
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Biomax Integration Settings Card */}
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden mb-8">
        <div className="p-1 border-b bg-muted/20">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground">
            <Server className="w-4 h-4 text-purple-400" />
            Biomax Hardware Integration Setup
          </div>
        </div>
        <div className="p-6 bg-gradient-to-br from-card to-card/50 space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Biomax API Sync Configuration
              {biomaxEnabled && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Enabled</Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Configure parameters to connect this system directly to your local Biomax attendance scanner device. Once you receive your device API details, enter them below to trigger immediate synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Biomax Host Endpoint API</label>
              <Input 
                value={biomaxUrl} 
                onChange={(e) => setBiomaxUrl(e.target.value)} 
                placeholder="e.g. http://192.168.1.200/api"
                className="bg-black/30 text-xs border-border h-10 rounded-lg text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Biomax API Token Key</label>
              <Input 
                value={biomaxKey} 
                onChange={(e) => setBiomaxKey(e.target.value)} 
                placeholder="Secure access token"
                type="password"
                className="bg-black/30 text-xs border-border h-10 rounded-lg text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Device Serial Number</label>
              <Input 
                value={biomaxSerial} 
                onChange={(e) => setBiomaxSerial(e.target.value)} 
                placeholder="e.g. BX_DEVICE_01"
                className="bg-black/30 text-xs border-border h-10 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 bg-muted/20 px-4 py-2.5 rounded-xl border border-border/50">
              <span className="text-xs font-semibold text-foreground">Enable Biomax Pull Sync</span>
              <Switch 
                checked={biomaxEnabled}
                onCheckedChange={setBiomaxEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => testBiomaxSyncMutation.mutate()}
                disabled={testBiomaxSyncMutation.isPending}
                className="h-10 rounded-lg text-xs font-bold px-5 uppercase tracking-wider border-purple-500/30 hover:bg-purple-500/10 text-purple-400"
              >
                {testBiomaxSyncMutation.isPending ? "Connecting..." : "Test Connection & Pull Sync"}
              </Button>
              <Button 
                onClick={() => saveBiomaxConfigMutation.mutate({
                  api_url: biomaxUrl,
                  api_key: biomaxKey,
                  device_serial: biomaxSerial,
                  enabled: biomaxEnabled
                })}
                disabled={saveBiomaxConfigMutation.isPending}
                className="h-10 rounded-lg text-xs font-bold px-6 uppercase tracking-wider shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveBiomaxConfigMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="p-1 border-b bg-muted/20">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground">
            <Server className="w-4 h-4" />
            Configured Infrastructure
          </div>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 flex flex-col items-center justify-center text-red-500 gap-2">
              <XCircle className="w-8 h-8" />
              <p>Failed to load biometric devices.</p>
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Fingerprint className="w-8 h-8 opacity-50" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">No devices configured</h3>
                <p className="text-sm mt-1">Add your first biometric device to sync attendance logs.</p>
              </div>
              <Button variant="outline" onClick={handleAdd} className="mt-2">
                Configure Device
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Device Info</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Endpoints</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{device.name}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-0.5">Code: {device.device_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        device.connection_type === 'PULL' ? 'bg-blue-500/10 text-blue-500' :
                        device.connection_type === 'PUSH' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-amber-500/10 text-amber-500'
                      }>
                        {device.connection_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.connection_type === 'PULL' ? (
                        <div className="text-sm">
                          <span className="text-muted-foreground mr-1">IP:</span>{device.ip_address || 'N/A'}<br/>
                          <span className="text-muted-foreground mr-1">Port:</span>{device.port || 'N/A'}
                        </div>
                      ) : device.connection_type === 'PUSH' ? (
                        <div className="text-sm truncate max-w-[200px]" title={device.api_url}>
                          {device.api_url || 'N/A'}
                        </div>
                      ) : (
                        <div className="text-sm italic text-muted-foreground">CSV Upload Only</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={device.status === 'ACTIVE'}
                          disabled={updateDevice.isPending}
                          onCheckedChange={(checked) => handleToggleStatus(device, checked)}
                        />
                        {device.status === 'ACTIVE' ? (
                          <div className="flex items-center text-xs text-green-500 font-medium">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                          </div>
                        ) : (
                          <div className="flex items-center text-xs text-muted-foreground font-medium">
                            <XCircle className="w-3 h-3 mr-1" /> Disabled
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(device)}>
                        <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <DeviceModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        device={selectedDevice} 
      />

      <div className="pt-6 border-t border-dashed border-border/50">
        <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 transition-all hover:bg-primary/[0.07] hover:border-primary/20">
          <BiometricMappingUI />
        </div>
      </div>
    </div>
  );
}
