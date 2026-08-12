import React from "react";
import { CandidateCard } from "./CandidateCard";
import type { Application } from "@/lib/types";

interface ColumnProps {
  id: string;
  title: string;
  applications: Application[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, applicationId: string) => void;
  onDrop: (stageId: string, applicationId: string) => void;
}

export function Column({ id, title, applications, onDragStart, onDrop }: ColumnProps) {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(false);
    const applicationId = e.dataTransfer.getData("applicationId");
    if (applicationId) {
      onDrop(id, applicationId);
    }
  };

  return (
    <div
      className={`flex flex-col flex-shrink-0 w-80 rounded-xl bg-muted/30 border transition-colors ${
        isOver ? "border-primary/50 bg-muted/50" : "border-transparent"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 mb-2 flex items-center justify-between font-semibold border-b">
        <h3 className="text-sm">{title}</h3>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
          {applications.length}
        </span>
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px] custom-scrollbar">
        {applications.map((app) => (
          <CandidateCard
            key={app.id}
            application={app}
            onDragStart={onDragStart}
          />
        ))}
        {applications.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/20 rounded-lg p-6">
            <p>Drag candidates here</p>
          </div>
        )}
      </div>
    </div>
  );
}
