import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

type User = {
  id: number;
  username: string;
  display_name: string | null;
  is_admin: boolean;
};

type LoginData = {
  username: string;
  password: string;
  display_name?: string;
};

type AuthResponse = {
  token: string;
  user: User;
};

// Token management
const TOKEN_KEY = 'auth_token';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
const setStoredToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const removeStoredToken = () => localStorage.removeItem(TOKEN_KEY);

// API functions
async function login(data: LoginData): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to login');
  }

  const result: AuthResponse = await response.json();
  setStoredToken(result.token);
  return result.user;
}

async function register(data: LoginData): Promise<User> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to register');
  }

  const result: AuthResponse = await response.json();
  setStoredToken(result.token);
  return result.user;
}

async function logout(): Promise<void> {
  removeStoredToken();
}

async function fetchUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  try {
    const response = await fetch('/api/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        removeStoredToken();
        return null;
      }
      const text = await response.text();
      throw new Error(text || 'Failed to fetch user');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: fetchUser,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('403'))) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (userData) => {
      queryClient.setQueryData(['/api/user'], userData);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (userData) => {
      queryClient.setQueryData(['/api/user'], userData);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['/api/user'], null);
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: error.message,
      });
      // Even if logout fails, clear local state
      queryClient.setQueryData(['/api/user'], null);
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
  };
}