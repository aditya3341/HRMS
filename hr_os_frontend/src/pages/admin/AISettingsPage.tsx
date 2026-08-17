import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Sparkles, 
  Settings2, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  Save,
  CheckCircle2,
  BrainCircuit,
  Settings,
  Bot
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

const AISettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<any>(null);

  // 1. Fetch Config
  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const resp = await api.get<any>("/configs/AI_CONFIG");
      return resp.config_value;
    },
  });

  useEffect(() => {
    if (serverConfig) {
      setConfig(serverConfig);
    }
  }, [serverConfig]);

  // 2. Mutation
  const mutation = useMutation({
    mutationFn: async (newConfig: any) => {
      const resp = await api.put("/configs/AI_CONFIG", { config_value: newConfig });
      return resp;
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "AI behavior has been updated system-wide."
      });
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
    },
    onError: (err: any) => {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: err.response?.data?.error || "Could not update AI settings."
        });
    }
  });

  const handleToggle = (field: string, value: boolean) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFeatureToggle = (feature: string, value: boolean) => {
    setConfig((prev: any) => ({
      ...prev,
      features: { ...prev.features, [feature]: value }
    }));
  };

  if (isLoading || !config) return <div className="p-8 text-center text-white/50">Initializing Core AI Intelligence...</div>;

  const isEnabled = config.enabled;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <PageHeader 
          icon={BrainCircuit}
          title="AI Intelligence Hub"
          subtitle="Configure global LLM behavior, feature access, and precision thresholds."
        />

        <div className={`px-6 py-3 rounded-2xl flex items-center gap-4 border transition-all duration-500 ${
          isEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${isEnabled ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-sm font-black uppercase tracking-widest">
            AI is currently {isEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Master Controls */}
        <div className="space-y-8">
          <Card className="p-8 bg-white/[0.03] backdrop-blur-xl border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Master Enable
                </h4>
                <p className="text-xs text-muted-foreground">Toggle all AI operations system-wide.</p>
              </div>
              <Switch 
                checked={isEnabled} 
                onCheckedChange={(val) => handleToggle('enabled', val)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Primary Provider</Label>
               <Select 
                 disabled={!isEnabled}
                 value={config.provider} 
                 onValueChange={(val) => {
                   let defaultModel = "";
                   if (val === "GEMINI") defaultModel = "gemini-2.5-flash";
                   else if (val === "CHATGPT" || val === "OPENAI") defaultModel = "gpt-4o";
                   else if (val === "DEEPSEEK") defaultModel = "deepseek-chat";
                   else if (val === "BLACKBOX") defaultModel = "blackbox";
                   
                   setConfig((prev: any) => ({ 
                     ...prev, 
                     provider: val,
                     model_name: defaultModel
                   }));
                 }}
               >
                 <SelectTrigger className="bg-black/20 border-white/10 rounded-xl h-12">
                   <SelectValue placeholder="Select Provider" />
                 </SelectTrigger>
                 <SelectContent className="bg-zinc-900 border-white/10">
                   <SelectItem value="GEMINI">Google Gemini Pro</SelectItem>
                   <SelectItem value="OPENAI">OpenAI (ChatGPT)</SelectItem>
                   <SelectItem value="DEEPSEEK">DeepSeek AI</SelectItem>
                   <SelectItem value="BLACKBOX">Blackbox AI</SelectItem>
                 </SelectContent>
               </Select>

               <div className="space-y-4 pt-2">
                 <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">API Key</Label>
                   <input 
                     type="password"
                     placeholder="Enter API Key"
                     disabled={!isEnabled}
                     value={config.api_key || ""}
                     onChange={(e) => setConfig((prev: any) => ({ ...prev, api_key: e.target.value }))}
                     className="w-full bg-black/20 border border-white/10 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/20"
                   />
                 </div>

                 <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Model Name</Label>
                   <input 
                     type="text"
                     placeholder="e.g. gemini-1.5-pro, gpt-4o, deepseek-chat"
                     disabled={!isEnabled}
                     value={config.model_name || ""}
                     onChange={(e) => setConfig((prev: any) => ({ ...prev, model_name: e.target.value }))}
                     className="w-full bg-black/20 border border-white/10 rounded-xl h-12 px-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-white/20"
                   />
                 </div>
               </div>

               <p className="text-[10px] text-muted-foreground italic flex items-center gap-2 pt-2">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" />
                 Enterprise-grade encryption active for all prompts.
               </p>
            </div>
          </Card>

          <Card className={`p-8 bg-white/[0.03] border-white/10 transition-opacity duration-500 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
             <h4 className="text-sm font-bold mb-6 flex items-center gap-2">
               <Cpu className="w-4 h-4 text-purple-400" />
               Feature Governance
             </h4>
             <div className="space-y-6">
                {[
                  { id: 'summary', label: 'AI Synthesis', sub: 'Summarize candidate profiles and reviews.' },
                  { id: 'rating_suggestion', label: 'Inferred Ratings', sub: 'Suggest ratings based on qualitative feedback.' },
                  { id: 'risk_detection', label: 'Behavioral Risk', sub: 'Detect attrition risks and sentiment anomalies.' }
                ].map(feature => (
                  <div key={feature.id} className="flex items-center justify-between group">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold group-hover:text-primary transition-colors cursor-pointer">{feature.label}</Label>
                      <p className="text-[10px] text-muted-foreground">{feature.sub}</p>
                    </div>
                    <Switch 
                      checked={config.features?.[feature.id]} 
                      onCheckedChange={(val) => handleFeatureToggle(feature.id, val)}
                    />
                  </div>
                ))}
             </div>
          </Card>
        </div>

        {/* Right Column: Engine Precision */}
        <div className="lg:col-span-2 space-y-8">
           <Card className={`p-10 bg-white/[0.03] backdrop-blur-3xl border-white/10 h-full flex flex-col transition-opacity duration-500 ${!isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-4 mb-10">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Settings2 className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold">Inference Parameters</h3>
                    <p className="text-sm text-muted-foreground">Fine-tune the creativity and strictness of the AI engine.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1">
                 <div className="space-y-8">
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold">Temperature</Label>
                          <Badge variant="outline" className="text-primary border-primary/20">{config.temperature}</Badge>
                       </div>
                       <Slider 
                         value={[config.temperature]} 
                         min={0} 
                         max={1} 
                         step={0.1} 
                         onValueChange={(val) => setConfig((prev: any) => ({ ...prev, temperature: val[0] }))}
                         className="py-4"
                       />
                       <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                          Lower values (0.1–0.3) provide consistent, focused outputs. 
                          Higher values (0.7+) allow for more creative synthesis.
                       </p>
                    </div>

                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                          <Label className="text-sm font-bold">Confidence Threshold</Label>
                          <Badge variant="outline" className="text-primary border-primary/20">{config.confidence_threshold * 100}%</Badge>
                       </div>
                       <Slider 
                         value={[config.confidence_threshold]} 
                         min={0.1} 
                         max={1} 
                         step={0.05} 
                         onValueChange={(val) => setConfig((prev: any) => ({ ...prev, confidence_threshold: val[0] }))}
                         className="py-4"
                       />
                       <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                          Filters results that do not meet the minimum certainty score.
                       </p>
                    </div>
                 </div>

                 <div className="bg-white/5 rounded-3xl p-8 border border-white/5 flex flex-col justify-center text-center space-y-6">
                    <Bot className="w-12 h-12 text-primary mx-auto mb-2 opacity-50" />
                    <h5 className="font-bold text-lg">System Health</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-black/20">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Latency</p>
                          <p className="text-lg font-black text-emerald-400">0.8s</p>
                       </div>
                       <div className="p-4 rounded-2xl bg-black/20">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Up-time</p>
                          <p className="text-lg font-black text-emerald-400">99.9%</p>
                       </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Running on {config.provider} Enterprise clusters.</p>
                 </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3 text-amber-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Any changes made will take effect immediately for all users.</span>
                 </div>
                 <Button 
                   onClick={() => mutation.mutate(config)}
                   disabled={mutation.isPending}
                   className="bg-primary hover:bg-primary/90 text-white px-10 py-6 rounded-2xl shadow-xl shadow-primary/20 h-14"
                 >
                   {mutation.isPending ? (
                     <div className="flex items-center gap-3">
                       <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                       Saving...
                     </div>
                   ) : (
                     <div className="flex items-center gap-3">
                       <Save className="w-5 h-5" />
                       Apply Intelligence Changes
                     </div>
                   )}
                 </Button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPage;
