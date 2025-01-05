import { QueryClient } from "@tanstack/react-query";

const getAuthToken = () => localStorage.getItem('auth_token');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = getAuthToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(queryKey[0] as string, {
          headers,
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 401) {
            // Clear token on authentication error
            localStorage.removeItem('auth_token');
            window.location.href = '/auth';
            throw new Error('Not authenticated');
          }

          if (res.status === 403) {
            throw new Error('Not authorized');
          }

          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(await res.text());
        }

        return res.json();
      },
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof Error && 
            (error.message.includes('401') || 
             error.message.includes('403') ||
             error.message.includes('Not authenticated'))) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchInterval: 4 * 60 * 1000, // Refresh every 4 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    }
  },
});