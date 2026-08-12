import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Application, APIResponse } from "@/lib/types";
import { KanbanBoard } from "@/components/applications/KanbanBoard";

export default function Applications() {
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await api.get<Application[]>("/applications/");
      return res || [];
    },
  });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">
          Track and manage candidates through the recruitment pipeline.
        </p>
      </div>

      <KanbanBoard applications={applications} isLoading={isLoading} />
    </div>
  );
}
