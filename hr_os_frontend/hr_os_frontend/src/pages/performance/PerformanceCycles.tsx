import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Calendar, Play, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { APIResponse } from "@/lib/types";

interface PerformanceCycle {
  id: string;
  name: string;
  type: "MID_YEAR" | "ANNUAL";
  start_date: string;
  end_date: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  created_at: string;
}

export default function PerformanceCycles() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCycle, setNewCycle] = useState({
    name: "",
    type: "ANNUAL",
    start_date: "",
    end_date: "",
  });

  const { data: cycles, isLoading, refetch } = useQuery({
    queryKey: ["performance-cycles"],
    queryFn: async () => {
      const res = await api.get<PerformanceCycle[]>("/performance/cycles");
      return res || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCycle) => {
      const res = await api.post<APIResponse>("/performance/cycles", data);
      if (!res?.success) throw new Error(res?.error || "Failed to create cycle");
      return res;
    },
    onSuccess: () => {
      toast.success("Performance cycle created");
      setIsCreateOpen(false);
      setNewCycle({ name: "", type: "ANNUAL", start_date: "", end_date: "" });
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<APIResponse>(`/performance/cycles/${id}/activate`, {});
      if (!res?.success) throw new Error(res?.error || "Failed to activate cycle");
      return res;
    },
    onSuccess: () => {
      toast.success("Cycle activated and rules frozen");
      refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Performance Cycles</h1>
          <p className="text-muted-foreground text-sm">Design and schedule organizational review periods.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Cycle
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active & Upcoming Cycles</CardTitle>
            <CardDescription>View status and timelines of all performance reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : cycles?.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">No cycles found.</TableCell></TableRow>
                ) : (
                  cycles?.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">{cycle.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cycle.type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            cycle.status === "ACTIVE" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                            cycle.status === "CLOSED" ? "bg-slate-100 text-slate-700" : ""
                          }
                          variant={cycle.status === "DRAFT" ? "secondary" : "default"}
                        >
                          {cycle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {cycle.status === "DRAFT" ? (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => activateMutation.mutate(cycle.id)}
                            disabled={activateMutation.isPending}
                          >
                            <Play className="w-3 h-3" />
                            Activate
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                            <Lock className="w-3 h-3" />
                            Rules Frozen
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {cycles?.some(c => c.status === "ACTIVE") && (
            <Card className="border-green-200 bg-green-50/30 dark:bg-green-950/10">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
                        <div>
                            <h3 className="font-semibold text-green-900 dark:text-green-100">Live Cycle in Progress</h3>
                            <p className="text-sm text-green-700 dark:text-green-300 opacity-80">
                                Employees can currently submit goals based on the frozen configuration snapshot. 
                                Changes made to global System Config will NOT affect this cycle.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Performance Cycle</DialogTitle>
            <DialogDescription>
              Set up a new review period. Logic will be frozen upon activation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Cycle Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. FY24 Annual Performance Review" 
                value={newCycle.name}
                onChange={(e) => setNewCycle({...newCycle, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Cycle Type</Label>
              <Select value={newCycle.type} onValueChange={(v) => setNewCycle({...newCycle, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MID_YEAR">Mid-Year Review</SelectItem>
                  <SelectItem value="ANNUAL">Annual Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Start Date</Label>
                <Input 
                  id="start" 
                  type="date" 
                  value={newCycle.start_date}
                  onChange={(e) => setNewCycle({...newCycle, start_date: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">End Date</Label>
                <Input 
                  id="end" 
                  type="date" 
                  value={newCycle.end_date}
                  onChange={(e) => setNewCycle({...newCycle, end_date: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button 
                disabled={!newCycle.name || !newCycle.start_date || !newCycle.end_date || createMutation.isPending}
                onClick={() => createMutation.mutate(newCycle)}
            >
              {createMutation.isPending ? "Creating..." : "Save Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
