import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { APIResponse } from "@/lib/types";
import { ConfigFieldMapper } from "@/components/admin/config/ConfigFieldMapper";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
  is_active: boolean;
  updated_at: string;
}

export default function ConfigPanel() {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editObject, setEditObject] = useState<any>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data: configs, isLoading, refetch } = useQuery({
    queryKey: ["system-configs"],
    queryFn: async () => {
      const res = await api.get<any[]>("/configs/all");
      return res || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { key: string; value: any }) => {
      const res = await api.put<APIResponse>(`/configs/${data.key}`, {
        config_value: data.value,
      });
      if (!res?.success) throw new Error(res?.error || "Failed to update config");
      return res;
    },
    onSuccess: () => {
      toast.success("Configuration updated successfully");
      setEditingKey(null);
      setJsonError(null);
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleStartEdit = (config: SystemConfig) => {
    setEditingKey(config.config_key);
    setEditObject(JSON.parse(JSON.stringify(config.config_value))); // Deep clone
    setJsonError(null);
  };

  const handleSave = () => {
    updateMutation.mutate({ key: editingKey!, value: editObject });
  };

  if (isLoading) return <div className="p-8">Loading configurations...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground">Manage global business rules and performance settings.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {configs?.map((config) => (
          <Card key={config.id} className={editingKey === config.config_key ? "border-primary ring-1 ring-primary" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  {config.config_key}
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
              {editingKey !== config.config_key && (
                <Button variant="outline" size="sm" onClick={() => handleStartEdit(config)}>
                  Edit Values
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingKey === config.config_key ? (
                <div className="space-y-6 pt-4 animate-in slide-in-from-top-2 duration-300">
                  <ConfigFieldMapper 
                    data={editObject} 
                    onChange={setEditObject} 
                  />

                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleSave} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4" />
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(config.config_value).map(([propKey, propVal]) => (
                    <div key={propKey} className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-black">
                        {propKey.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-medium text-slate-300 truncate">
                        {typeof propVal === "boolean" 
                          ? (propVal ? "Enabled" : "Disabled") 
                          : Array.isArray(propVal) 
                            ? `${propVal.length} items` 
                            : String(propVal)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(config.config_value).length === 0 && (
                    <p className="text-xs text-slate-500 italic">No properties defined.</p>
                  )}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Last updated: {new Date(config.updated_at).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
