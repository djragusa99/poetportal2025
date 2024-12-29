import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Instead of forcing a page refresh, let the auth system handle it
            throw new Error('Not authenticated');
          }

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(await res.text());
        }

        return res.json();
      },
      retry: false,
      staleTime: 30000, // Cache for 30 seconds
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    }
  },
});