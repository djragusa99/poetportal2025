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

async function login(data: LoginData): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to login');
  }

  const result = await response.json();
  return result.user;
}

async function register(data: LoginData): Promise<User> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to register');
  }

  const result = await response.json();
  return result.user;
}

async function logout(): Promise<void> {
  const response = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to logout');
  }
}

async function fetchUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/user', {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      const text = await response.text();
      throw new Error(text || 'Failed to fetch user');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: fetchUser,
    retry: 1,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true, // Refresh when window regains focus
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
      // Even if logout fails on server, clear local state
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