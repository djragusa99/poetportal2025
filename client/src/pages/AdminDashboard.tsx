import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@db/schema";
import { useLocation } from "wouter";
import { useUser } from "../hooks/use-user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Loader2, Shield, ShieldOff, Trash2 } from "lucide-react";

interface AdminUser extends User {
  display_name: string | null;
  bio: string | null;
  is_admin: boolean;
  is_suspended: boolean;
}

export default function AdminDashboard() {
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useUser();

  // If still loading auth, show loading state
  if (authLoading) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect if not admin
  if (!authLoading && (!user || !user.is_admin)) {
    setLocation("/auth");
    return null;
  }

  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setLocation("/auth");
          throw new Error("Not authenticated");
        }

        const errorText = await response.text();
        throw new Error(errorText || `Failed to fetch users (${response.status})`);
      }

      return response.json();
    },
    enabled: !!user?.is_admin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof Error && 
          (error.message.includes('401') || 
           error.message.includes('403') ||
           error.message.includes('Not authenticated'))) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: AdminUser) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          username: userData.username,
          display_name: userData.display_name || "",
          bio: userData.bio || "",
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setLocation("/auth");
          throw new Error("Not authenticated");
        }

        const text = await response.text();
        throw new Error(text || "Failed to update user");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (userData: { id: number; is_suspended: boolean }) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userData.id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_suspended: userData.is_suspended }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update suspension status");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: `User ${variables.is_suspended ? "suspended" : "unsuspended"} successfully`,
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

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete user");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
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

  if (error) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-destructive">
              Error loading users: {error.toString()}
              {!error.toString().includes('401') && !error.toString().includes('403') && (
                <Button
                  className="mt-4"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })}
                >
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Bio</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.display_name || "-"}</TableCell>
                    <TableCell>{user.bio || "-"}</TableCell>
                    <TableCell>{user.is_admin ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <span className={user.is_suspended ? "text-destructive" : "text-green-600"}>
                        {user.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Make changes to user information below
                              </DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <label htmlFor="display_name">Display Name</label>
                                  <Input
                                    id="display_name"
                                    value={editingUser.display_name || ""}
                                    onChange={(e) =>
                                      setEditingUser({
                                        ...editingUser,
                                        display_name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label htmlFor="bio">Bio</label>
                                  <Input
                                    id="bio"
                                    value={editingUser.bio || ""}
                                    onChange={(e) =>
                                      setEditingUser({
                                        ...editingUser,
                                        bio: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <Button
                                  onClick={() => updateUserMutation.mutate(editingUser)}
                                >
                                  Save Changes
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSuspendMutation.mutate({
                            id: user.id,
                            is_suspended: !user.is_suspended
                          })}
                        >
                          {user.is_suspended ? (
                            <ShieldOff className="h-4 w-4 text-destructive" />
                          ) : (
                            <Shield className="h-4 w-4 text-green-600" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}