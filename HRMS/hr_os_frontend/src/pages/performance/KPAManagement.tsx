import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Target, Layers, ChevronRight, ChevronDown, Wand2, Info } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { APIResponse } from "@/lib/types";

interface KRA {
  id: string;
  name: string;
  description: string;
  default_weightage: number;
  is_active: boolean;
}

interface KPA {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  kras: KRA[];
}

export default function KPAManagement() {
  const [isKPAOpen, setIsKPAOpen] = useState(false);
  const [isKRAOpen, setIsKRAOpen] = useState(false);
  const [selectedKPA, setSelectedKPA] = useState<string | null>(null);
  const [expandedKPAs, setExpandedKPAs] = useState<Set<string>>(new Set());

  const [newKPA, setNewKPA] = useState({ name: "", description: "" });
  const [newKRA, setNewKRA] = useState({ name: "", description: "", default_weightage: 0 });

  const { data: kpas, isLoading, refetch } = useQuery({
    queryKey: ["kpas"],
    queryFn: async () => {
      const res = await api.get<KPA[]>("/performance/kpa");
      return res || [];
    },
  });

  const kpaMutation = useMutation({
    mutationFn: async (data: typeof newKPA) => {
      const res = await api.post<any>("/performance/kpa", data);
      return res;
    },
    onSuccess: () => {
      toast.success("KPA created successfully");
      setIsKPAOpen(false);
      setNewKPA({ name: "", description: "" });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const kraMutation = useMutation({
    mutationFn: async (data: typeof newKRA & { kpa_id: string }) => {
      const res = await api.post<APIResponse>(`/performance/kra?kpa_id=${data.kpa_id}`, data);
      if (!res?.success) throw new Error(res?.error || "Failed to create KRA");
      return res;
    },
    onSuccess: () => {
      toast.success("KRA added to KPA");
      setIsKRAOpen(false);
      setNewKRA({ name: "", description: "", default_weightage: 0 });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expandedKPAs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedKPAs(next);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals & KPAs</h1>
          <p className="text-muted-foreground text-sm">Define the hierarchical structure of performance metrics.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsKPAOpen(true)}>
          <Plus className="w-4 h-4" />
          Add KPA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <p>Loading hierarchical structure...</p>
          ) : kpas?.length === 0 ? (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center space-y-4">
                <Layers className="w-12 h-12 text-muted-foreground opacity-20" />
                <div className="space-y-1">
                    <p className="font-medium">No Key Performance Areas Defined</p>
                    <p className="text-sm text-muted-foreground">Start by creating a KPA like "Technical Excellence" or "Leadership".</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsKPAOpen(true)}>Create First KPA</Button>
            </Card>
          ) : (
            kpas?.map((kpa) => (
              <Card key={kpa.id} className="overflow-hidden border-l-4 border-l-primary">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  onClick={() => toggleExpand(kpa.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedKPAs.has(kpa.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{kpa.name}</h3>
                      <p className="text-xs text-muted-foreground">{kpa.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{kpa.kras.length} KRAs</Badge>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKPA(kpa.id);
                            setIsKRAOpen(true);
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {expandedKPAs.has(kpa.id) && (
                  <CardContent className="bg-slate-50/50 dark:bg-slate-950/20 border-t p-0">
                    <div className="divide-y">
                      {kpa.kras.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground italic">
                              No Key Result Areas added yet.
                          </div>
                      ) : (
                        kpa.kras.map((kra) => (
                          <div key={kra.id} className="p-4 pl-12 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <Target className="w-4 h-4 text-muted-foreground opacity-40" />
                                <div>
                                    <p className="text-sm font-medium">{kra.name}</p>
                                    <p className="text-xs text-muted-foreground">{kra.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Weightage</p>
                                    <p className="text-sm font-bold text-primary">{kra.default_weightage}%</p>
                                </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-primary" />
                        About Hierarchies
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3 leading-relaxed opacity-80">
                    <p>
                        <strong>KPA (Key Performance Area):</strong> High-level groupings of responsibility or development areas.
                    </p>
                    <p>
                        <strong>KRA (Key Result Area):</strong> Specific, measurable outcomes within a KPA that employees are graded against.
                    </p>
                    <div className="flex items-start gap-2 bg-white/50 dark:bg-black/20 p-2 rounded border">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        <p>Defining centralized KPAs ensures consistency across different departments and roles during review cycles.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* KPA Dialog */}
      <Dialog open={isKPAOpen} onOpenChange={setIsKPAOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Key Performance Area</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="kpa-name">KPA Name</Label>
              <Input 
                id="kpa-name" 
                placeholder="e.g. Technical Excellence" 
                value={newKPA.name}
                onChange={(e) => setNewKPA({...newKPA, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kpa-desc">Description</Label>
              <Input 
                id="kpa-desc" 
                placeholder="Briefly describe this performance area" 
                value={newKPA.description}
                onChange={(e) => setNewKPA({...newKPA, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKPAOpen(false)}>Cancel</Button>
            <Button disabled={!newKPA.name || kpaMutation.isPending} onClick={() => kpaMutation.mutate(newKPA)}>
                {kpaMutation.isPending ? "Creating..." : "Save KPA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KRA Dialog */}
      <Dialog open={isKRAOpen} onOpenChange={setIsKRAOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Key Result Area (KRA)</DialogTitle>
            <DialogDescription>Define a specific metric within the performance area.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="kra-name">KRA Name</Label>
              <Input 
                id="kra-name" 
                placeholder="e.g. Code Quality & Reviews" 
                value={newKRA.name}
                onChange={(e) => setNewKRA({...newKRA, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kra-desc">Description</Label>
              <Input 
                id="kra-desc" 
                placeholder="What exactly is expected in this area?" 
                value={newKRA.description}
                onChange={(e) => setNewKRA({...newKRA, description: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kra-weight">Default Weightage (%)</Label>
              <Input 
                id="kra-weight" 
                type="number" 
                value={newKRA.default_weightage}
                onChange={(e) => setNewKRA({...newKRA, default_weightage: Number(e.target.value)})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKRAOpen(false)}>Cancel</Button>
            <Button 
                disabled={!newKRA.name || kraMutation.isPending} 
                onClick={() => kraMutation.mutate({...newKRA, kpa_id: selectedKPA!})}
            >
                {kraMutation.isPending ? "Adding..." : "Add KRA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
