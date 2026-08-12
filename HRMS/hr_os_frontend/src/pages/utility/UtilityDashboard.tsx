import { FileText, ShieldCheck, ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UtilityDashboard() {
  const [lastTool, setLastTool] = useState<string | null>(null);

  useEffect(() => {
    setLastTool(localStorage.getItem("last_tool"));
  }, []);
  const tools = [
    {
      title: "AI Resume Analyzer",
      description: "Upload and analyze multiple resumes against job descriptions using advanced AI matching.",
      icon: FileText,
      link: "/utility-tools/resume",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      title: "AI Proctor Tool",
      description: "Secure, automated proctoring environment for candidate assessments and quizzes.",
      icon: ShieldCheck,
      link: "/utility-tools/proctor",
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utility Tools</h1>
        <p className="text-muted-foreground mt-2">
          Access specialized AI tools and external integrations to enhance your HR workflow.
        </p>
      </div>

      {lastTool && (lastTool === "resume" || lastTool === "proctor") && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm glass">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <PlayCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Continue where you left off</p>
              <p className="text-xs text-muted-foreground">Jump back into your recent session</p>
            </div>
          </div>
          <Button variant="default" asChild className="shrink-0 group">
            <Link to={`/utility-tools/${lastTool}`}>
              {lastTool === "resume" ? "Resume Analyzer" : "Proctored Quiz"}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.link} to={tool.link} className="block group">
              <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm relative overflow-hidden border border-border/50">
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${tool.bgColor}`} />
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tool.bgColor} ${tool.borderColor} border`}>
                    <Icon className={`w-6 h-6 ${tool.color}`} />
                  </div>
                  <CardTitle className="flex justify-between items-center text-lg">
                    {tool.title}
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
