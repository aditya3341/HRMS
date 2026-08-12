import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * useRealtimeUpdates
 * Intelligent synchronization hook to keep UI perfectly in-sync.
 * Uses reactive polling with focus-refetching for a "live" feel.
 */
export const useRealtimeUpdates = (queryKeys: string | string[], interval: number = 30000) => {
  const queryClient = useQueryClient();
  const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];

  const refreshAction = useCallback(() => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }, [queryClient, keys]);

  useEffect(() => {
    // 1. WebSocket simulation / Long Polling
    const timer = setInterval(() => {
       // Only refresh if tab is active to save resources
       if (document.visibilityState === "visible") {
         refreshAction();
       }
    }, interval);

    // 2. Focused visibility sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAction();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshAction);

    return () => {
      clearInterval(timer);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshAction);
    };
  }, [refreshAction, interval]);

  return { refresh: refreshAction };
};
