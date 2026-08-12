import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BiometricDevice, useAddDevice, useUpdateDevice } from '@/api/biometricDevices';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  device_code: z.string().min(2, "Device code is required"),
  device_type: z.enum(['FACE', 'FINGER']),
  connection_type: z.enum(['PULL', 'PUSH', 'FILE']),
  ip_address: z.string().optional(),
  port: z.coerce.number().optional(),
  api_url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: BiometricDevice | null;
}

export function DeviceModal({ open, onOpenChange, device }: DeviceModalProps) {
  const isEditing = !!device;
  const addDevice = useAddDevice();
  const updateDevice = useUpdateDevice();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      device_code: '',
      device_type: 'FACE',
      connection_type: 'PUSH',
      ip_address: '',
      port: 4370,
      api_url: '',
    },
  });

  const connectionType = watch('connection_type');
  const deviceType = watch('device_type');

  useEffect(() => {
    if (device && open) {
      reset({
        name: device.name,
        device_code: device.device_code,
        device_type: (device as any).device_type || 'FACE',
        connection_type: device.connection_type,
        ip_address: device.ip_address || '',
        port: device.port || 4370,
        api_url: device.api_url || '',
      });
    } else if (!device && open) {
      reset({
        name: '',
        device_code: '',
        device_type: 'FACE',
        connection_type: 'PUSH',
        ip_address: '',
        port: 4370,
        api_url: '',
      });
    }
  }, [device, open, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing) {
        await updateDevice.mutateAsync({ id: device.id, ...data } as any);
        toast.success("Device updated successfully");
      } else {
        await addDevice.mutateAsync({ ...data, status: 'ACTIVE' } as any);
        toast.success("Device added successfully");
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.detail || "Failed to save device");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Biometric Device' : 'Add New Device'}</DialogTitle>
          <DialogDescription>
            Configure connection settings for the biometric attendance device.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Device Name *</Label>
              <Input id="name" placeholder="SPEEDFACE Main" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="device_code">Device Code *</Label>
              <Input id="device_code" placeholder="DEV-001" {...register('device_code')} disabled={isEditing} />
              {errors.device_code && <p className="text-xs text-red-500">{errors.device_code.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Device Type *</Label>
              <Select 
                value={deviceType} 
                onValueChange={(val: any) => setValue('device_type', val)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACE">FACE (SpeedFace/Ai)</SelectItem>
                  <SelectItem value="FINGER">FINGER (Classical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Connection *</Label>
              <Select 
                value={connectionType} 
                onValueChange={(val: any) => setValue('connection_type', val)}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUSH">PUSH (HTTP/ADMS)</SelectItem>
                  <SelectItem value="PULL">PULL (TCP/IP)</SelectItem>
                  <SelectItem value="FILE">FILE (Manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {connectionType === 'PULL' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input id="ip_address" placeholder="192.168.1.201" {...register('ip_address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" type="number" placeholder="4370" {...register('port')} />
              </div>
            </div>
          )}

          {connectionType === 'PUSH' && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
              <Label htmlFor="api_url">Webhook Port/Path (Optional)</Label>
              <Input id="api_url" placeholder="Default endpoint: /biometric/logs/punch" {...register('api_url')} />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Device'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
