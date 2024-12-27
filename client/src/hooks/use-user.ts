import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

type LoginData = {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string;
  userType?: string;
  pronouns?: string;
  bio?: string;
};

async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error(await response.text());
  }

  return response.json();
}

async function login(data: LoginData): Promise<User> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes("Incorrect username")) {
      throw new Error("Account not found. Please register first or check your username.");
    } else if (errorText.includes("Incorrect password")) {
      throw new Error("Incorrect password. Please try again.");
    }
    throw new Error(errorText);
  }

  return response.json();
}

async function register(data: LoginData): Promise<User> {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
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

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("Account not found")) {
        toast({
          title: "Login Failed",
          description: "Would you like to create an account?",
          variant: "destructive",
          action: {
            label: "Register",
            onClick: () => setLocation("/register")
          },
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}