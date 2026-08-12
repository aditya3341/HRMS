import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, Brain, Calendar, Clock, DollarSign, 
  TrendingUp, Bell, Lock, Unlock, Save, RotateCcw, 
  AlertTriangle, CheckCircle2, History, Shield
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { configApi } from "@/lib/configApi";

const SECTIONS = [
  { key: "AI_CONFIG",           label: "AI Engine",         icon: Brain,      color: "from-violet-500/20 to-purple-500/10", badge: "AI" },
  { key: "LEAVE_CONFIG",        label: "Leave Policy",      icon: Calendar,   color: "from-emerald-500/20 to-teal-500/10",  badge: "HR" },
  { key: "ATTENDANCE_CONFIG",   label: "Attendance Rules",  icon: Clock,      color: "from-blue-500/20 to-cyan-500/10",     badge: "OPS" },
  { key: "ATTENDANCE_MODE_CONFIG", label: "Attendance Mode",  icon: Shield,     color: "from-indigo-500/20 to-blue-500/10",   badge: "SYSTEM" },
  { key: "ATTENDANCE_SECURITY_CONFIG", label: "Geo-Fencing & Safety", icon: Lock, color: "from-rose-500/20 to-pink-500/10",   badge: "SECURITY" },
  { key: "PAYROLL_CONFIG",      label: "Payroll Rules",     icon: DollarSign, color: "from-amber-500/20 to-orange-500/10",  badge: "PAYROLL" },
  { key: "PERFORMANCE_CONFIG",  label: "Performance",       icon: TrendingUp, color: "from-pink-500/20 to-rose-500/10",     badge: "PERF" },
  { key: "HOLIDAY_CONFIG",      label: "Holiday Calendar",  icon: Calendar,   color: "from-indigo-500/20 to-blue-500/10",   badge: "HR" },
  { key: "NOTIFICATION_CONFIG", label: "Notifications",     icon: Bell,       color: "from-teal-500/20 to-green-500/10",    badge: "SYSTEM" },
];

function PayrollLockPanel() {
  const { toast } = useToast();
  const [cycleId, setCycleId] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const qc = useQueryClient();

  const { data: lockStatus } = useQuery({
    queryKey: ["payroll-lock", cycleId],
    queryFn: () => configApi.getPayrollLock(cycleId),
  });

  const lockMutation = useMutation({
    mutationFn: (lock: boolean) => configApi.setPayrollLock(cycleId, lock),
    onSuccess: (_, lock) => {
      qc.invalidateQueries({ queryKey: ["payroll-lock"] });
      toast({ title: lock ? "🔒 Payroll Locked" : "🔓 Payroll Unlocked", description: `Cycle ${cycleId} updated.` });
    },
  });

  const isLocked = lockStatus?.is_locked;

  return (
    <div className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-4">
      <div className="flex items-center gap-3">
        {isLocked ? <Lock className="w-5 h-5 text-orange-400" /> : <Unlock className="w-5 h-5 text-emerald-400" />}
        <h3 className="font-bold text-white">Payroll Lock Control</h3>
        <Badge className={isLocked ? "bg-orange-500/20 text-orange-300 border-none" : "bg-emerald-500/20 text-emerald-300 border-none"}>
          {isLocked ? "LOCKED" : "OPEN"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Lock/unlock payroll for a cycle. Locked cycles block all salary updates and appraisal overwrites.</p>
      <div className="flex items-center gap-3">
        <input
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          placeholder="e.g. 2026-04"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => lockMutation.mutate(!isLocked)}
          disabled={lockMutation.isPending}
          className={`border-none font-bold ${isLocked ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"}`}
        >
          {isLocked ? "Unlock" : "Lock"} Payroll
        </Button>
      </div>
    </div>
  );
}

function ConfigEditor({ configKey }: { configKey: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["config", configKey],
    queryFn: () => configApi.getByKey(configKey),
    enabled: !!configKey,
  });

  const { data: history } = useQuery({
    queryKey: ["config-history", configKey],
    queryFn: () => configApi.getHistory(configKey),
    enabled: showHistory,
  });

  const [draft, setDraft] = useState<string | null>(null);
  const currentJson = draft ?? (config ? JSON.stringify(config.config_value, null, 2) : "");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const onJsonChange = (value: string) => {
    setDraft(value);
    try { JSON.parse(value); setJsonError(null); }
    catch (e: unknown) { setJsonError((e as Error).message); }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsed = JSON.parse(currentJson);
      return configApi.update(configKey, parsed, config?.description);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config", configKey] });
      setDraft(null);
      toast({ title: "✅ Config Saved", description: `${configKey} updated successfully.` });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Unknown error";
      toast({ title: "❌ Save Failed", description: msg, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Loading configuration...</div>;
  if (!config) return (
    <div className="py-12 text-center text-muted-foreground space-y-2">
      <AlertTriangle className="w-8 h-8 mx-auto text-amber-400" />
      <p className="text-sm">Config key <code className="text-amber-400">{configKey}</code> not found in the database.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{configKey}</h3>
          {config.description && <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>}
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white" onClick={() => setShowHistory(!showHistory)}>
          <History className="w-3.5 h-3.5 mr-1.5" />
          {showHistory ? "Hide" : "Version History"}
        </Button>
      </div>

      {/* JSON Editor */}
      <div className="relative">
        <Textarea
          value={currentJson}
          onChange={(e) => onJsonChange(e.target.value)}
          rows={18}
          className={`font-mono text-xs bg-black/40 border rounded-xl resize-none transition-colors ${
            jsonError ? "border-red-500/60 focus:ring-red-500/50" : "border-white/10 focus:ring-primary/50"
          } text-emerald-300 leading-5`}
        />
        {jsonError && (
          <p className="mt-1.5 text-[10px] text-red-400 font-mono">{jsonError}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !!jsonError || draft === null}
          className="bg-primary hover:bg-primary/90 text-white font-bold flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
        {draft !== null && (
          <Button variant="outline" onClick={() => setDraft(null)} className="border-white/15 text-muted-foreground hover:text-white">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
        {saveMutation.isSuccess && !draft && (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-in zoom-in" />
        )}
      </div>

      {/* Version History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
              {!history?.data?.length && <p className="text-xs text-muted-foreground text-center py-4">No history yet.</p>}
              {history?.data?.map((entry: { id: string; timestamp: string; updated_by: string; old_value: unknown; new_value: unknown }) => (
                <div key={entry.id} className="p-3 rounded-xl bg-white/5 border border-white/8 text-xs space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                    <span className="font-mono text-[10px] truncate max-w-[120px]">{entry.updated_by}</span>
                  </div>
                  <pre className="text-[10px] text-white/60 overflow-x-auto">{JSON.stringify(entry.new_value, null, 1).slice(0, 200)}...</pre>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SystemSettings() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);
  const active = SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">Superadmin control panel — Configure all HR OS policies from one place.</p>
        </div>
        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> SUPER_ADMIN ONLY
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-sm font-medium ${
                  isActive
                    ? "bg-primary/15 text-white border border-primary/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/25" : "bg-white/5"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div>{section.label}</div>
                  <div className="text-[10px] opacity-50 font-mono">{section.key}</div>
                </div>
              </button>
            );
          })}
          
          {/* Payroll Lock quick access */}
          <div className="pt-2">
            <div className="h-px bg-white/5 my-2" />
            <div className="px-4 py-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-3">Quick Controls</p>
              <PayrollLockPanel />
            </div>
          </div>
        </div>

        {/* Main Editor Panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Card className={`p-6 bg-gradient-to-br ${active.color} border border-white/10 backdrop-blur-xl`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <active.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{active.label}</h2>
                    <p className="text-xs text-muted-foreground">Edit JSON config below. Changes apply immediately to new operations.</p>
                  </div>
                  <Badge className="ml-auto bg-white/10 text-white/70 border-none text-[10px] font-mono">{active.badge}</Badge>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3 mb-5 text-xs text-amber-200/80">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Live Impact:</strong> Changes here immediately affect new operations. Locked performance cycles and completed payroll are always protected and will never be retroactively altered.
                  </span>
                </div>

                <ConfigEditor configKey={activeSection} />
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
