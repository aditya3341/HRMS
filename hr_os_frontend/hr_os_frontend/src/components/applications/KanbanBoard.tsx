import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Application } from "@/lib/types";
import { Column } from "./Column";

const STAGES = [
  { id: "applied", title: "Applied" },
  { id: "l1", title: "Round 1" },
  { id: "l2", title: "Round 2" },
  { id: "l3", title: "Round 3" },
  { id: "l4", title: "Final Round" },
  { id: "selected", title: "Selected" },
  { id: "rejected", title: "Rejected" },
];

interface KanbanBoardProps {
  applications: Application[];
  isLoading: boolean;
}

export function KanbanBoard({ applications: initialApplications, isLoading }: KanbanBoardProps) {
  const queryClient = useQueryClient();

  // ✅ Deduplicate applications
  const uniqueApplications = React.useMemo(() => {
    const appMap = new Map<string, Application>();
    const duplicateIds = new Set<string>();

    initialApplications.forEach((app) => {
      if (appMap.has(app.id)) {
        duplicateIds.add(app.id);
      }
      appMap.set(app.id, app);
    });

    if (duplicateIds.size > 0) {
      console.warn("Duplicate Application IDs found and removed:", Array.from(duplicateIds));
    }

    return Array.from(appMap.values());
  }, [initialApplications]);

  const [localApplications, setLocalApplications] = useState<Application[]>(uniqueApplications);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  useEffect(() => {
    setLocalApplications(uniqueApplications);
  }, [uniqueApplications]);

  // ---------------- MOVE MUTATION ----------------
  const moveMutation = useMutation({
    mutationFn: async ({ applicationId, toStatus }: { applicationId: string; toStatus: string }) => {
      const res = await api.post(`/interviews/${applicationId}/move?to_status=${toStatus}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Candidate moved successfully");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to move candidate");
      setLocalApplications(uniqueApplications); // rollback
    },
  });

  // ---------------- DRAG ----------------
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, applicationId: string) => {
    e.dataTransfer.setData("applicationId", applicationId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedAppId(applicationId);
  };

  const handleDrop = (stageId: string, applicationId: string) => {
    const application = localApplications.find((app) => app.id === applicationId);
    setDraggedAppId(null);

    if (!application) return;

    const currentStatus = application.status?.toLowerCase();

    if (currentStatus === stageId) return;

    // Optimistic update
    setLocalApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId ? { ...app, status: stageId as any } : app
      )
    );

    moveMutation.mutate({ applicationId, toStatus: stageId });
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p>Loading applications board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-x-auto overflow-y-hidden pb-4 gap-4" onDragEnd={handleDragEnd}>
      {STAGES.map((stage) => {
        const stageApps = localApplications.filter((app) => {
          const appStatus = app.status?.toLowerCase() || "";
          const offerStatus = app.offer?.status?.toLowerCase();

          // ✅ ONLY REMOVE AFTER JOINED
          if (offerStatus === "joined") return false;

          // ✅ SELECTED COLUMN (IMPORTANT FIX)
          if (stage.id === "selected") {
            return (
              appStatus === "selected" ||
              appStatus === "offer_created" ||
              offerStatus === "pending_approval" ||
              offerStatus === "approved" ||
              offerStatus === "sent" ||
              offerStatus === "accepted"
            );
          }

          return appStatus === stage.id;
        });

        return (
          <Column
            key={stage.id}
            id={stage.id}
            title={stage.title}
            applications={stageApps}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        );
      })}
    </div>
  );
}