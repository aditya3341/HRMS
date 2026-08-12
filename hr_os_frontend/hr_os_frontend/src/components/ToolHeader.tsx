import { Badge } from "@/components/ui/badge";

interface ToolHeaderProps {
  title: string;
}

export function ToolHeader({ title }: ToolHeaderProps) {
  return (
    <div className="sticky top-0 z-10 w-full rounded-xl bg-white/70 dark:bg-slate-950/70 backdrop-blur-md border border-primary/20 shadow-sm p-4 flex items-center justify-between animate-fade-in mb-4 bg-gradient-to-r from-background to-secondary/10">
      <div className="flex flex-col space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">
          You are using an AI-powered external tool within Zipaworld.
        </p>
      </div>
      <div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          External Tool
        </Badge>
      </div>
    </div>
  );
}
