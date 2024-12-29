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
    throw new Error(await response.text());
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
    throw new Error(await response.text());
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
    throw new Error(await response.text());
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
      throw new Error(await response.text());
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: fetchUser,
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
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
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
  };
}