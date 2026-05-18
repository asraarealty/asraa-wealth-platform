"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { logDebug } from "@/lib/utils/debugMetrics";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  }));

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (!event?.query) return;
      const queryKey = Array.isArray(event.query.queryKey) ? event.query.queryKey : [String(event.query.queryKey)];
      const actionType =
        event.type === "updated" && event.action && typeof event.action === "object"
          ? String((event.action as { type?: unknown }).type ?? "unknown")
          : event.type;
      if (actionType === "invalidate") {
        logDebug("cache", "invalidate", { queryKey: JSON.stringify(queryKey) });
      }
      if (actionType === "fetch") {
        logDebug("query", "execute", { queryKey: JSON.stringify(queryKey) });
      }
    });
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
