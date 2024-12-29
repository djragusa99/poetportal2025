import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    bio: "",
  });

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch all posts
  const { data: posts = [] } = useQuery({
    queryKey: ["/api/posts"],
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully!",
      });
      setNewUser({ username: "", displayName: "", bio: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(newUser);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
              />
            </div>
            <div>
              <Input
                placeholder="Display Name"
                value={newUser.displayName}
                onChange={(e) =>
                  setNewUser({ ...newUser, displayName: e.target.value })
                }
              />
            </div>
            <div>
              <Input
                placeholder="Bio"
                value={newUser.bio}
                onChange={(e) => setNewUser({ ...newUser, bio: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              Create User
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="p-4 border rounded-lg hover:bg-accent/50"
              >
                <h3 className="font-semibold">{user.displayName}</h3>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {user.bio && (
                  <p className="text-sm text-muted-foreground mt-2">{user.bio}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {posts.map((post: any) => (
              <div
                key={post.id}
                className="p-4 border rounded-lg hover:bg-accent/50"
              >
                <p className="text-sm">{post.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By User #{post.userId}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}