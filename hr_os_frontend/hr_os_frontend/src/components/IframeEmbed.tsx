import { useState, useEffect, useRef } from "react";
import { ExternalLink, Loader2, Maximize, Minimize, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IframeEmbedProps {
  url: string;
  title: string;
}

export function IframeEmbed({ url, title }: IframeEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Error Timeout (8 seconds)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isLoading) {
      timeout = setTimeout(() => {
        setHasError(true);
        setIsLoading(false);
      }, 8000);
    }
    return () => clearTimeout(timeout);
  }, [isLoading, url]);

  // Record Last Tool Opened
  useEffect(() => {
    localStorage.setItem("last_tool", title === "🧠 Resume Analyzer" ? "resume" : title === "🎯 Proctored Quiz" ? "proctor" : "dashboard");
  }, [title]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    // Force simple re-render of iframe via key if needed, or just let states reset
  };

  return (
    <div 
      ref={containerRef} 
      className={`flex flex-col w-full animate-in fade-in duration-500 bg-background ${isFullscreen ? "h-screen p-4" : "h-[calc(100vh-10rem)]"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h1 className={`${isFullscreen ? "text-xl" : "text-3xl"} font-bold tracking-tight`}>{title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleFullscreen} className="flex items-center gap-2">
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open in new tab
            </a>
          </Button>
        </div>
      </div>

      <div className="relative flex-grow w-full border rounded-xl overflow-hidden shadow-sm glass bg-muted/10">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 transition-opacity">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse font-medium">Loading tool...</p>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md z-20">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4 animate-bounce" />
            <h3 className="text-xl font-bold mb-2 text-foreground">⚠️ Unable to load tool.</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              This may be due to browser restrictions, ad-blockers, or network issues. 
              Please try opening it in a new tab instead.
            </p>
            <div className="flex gap-4">
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Open in New Tab
                </a>
              </Button>
            </div>
          </div>
        )}

        <iframe
          key={hasError ? "error" : "loading"} // forces remount if retry clears error
          src={url}
          title={title}
          className={`w-full h-full border-0 transition-opacity duration-700 ${isLoading ? "opacity-0" : "opacity-100"}`}
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
