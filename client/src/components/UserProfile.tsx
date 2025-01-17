import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogOut, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserProfileProps {
  user: User;
}

interface FollowUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string | null;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery<FollowUser[]>({
    queryKey: [`/api/users/${user.id}/followers`],
    queryFn: () => fetch(`/api/users/${user.id}/followers`, { 
      credentials: 'include' 
    }).then(res => res.json()),
  });

  const { data: followingData, isLoading: isLoadingFollowing } = useQuery({
    queryKey: [`/api/users/${user.id}/following-list`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user.id}/following-list`, { 
        credentials: 'include' 
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
  });

  const following = Array.isArray(followingData) ? followingData : [];

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      // Only update the current user's avatar in the cache
      queryClient.setQueryData(['user'], (oldData: any) => {
        if (oldData?.id === user.id) {
          return {
            ...oldData,
            avatar: data.avatarUrl
          };
        }
        return oldData;
      });

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => fetch('/api/user', { credentials: 'include' }).then(res => res.json())
  });

  const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
    queryKey: [`/api/users/${user?.id}/following`] as const,
    queryFn: () => fetch(`/api/users/${user?.id}/following`, { credentials: 'include' }).then(res => res.json()),
    enabled: Boolean(user?.id) && Boolean(currentUser?.id) && currentUser?.id !== user?.id
  });

  const isFollowing = Boolean(followStatus?.following);

  const followMutation = useMutation({
    mutationFn: async () => {
      return api.users.follow(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/followers`] });
      toast({
        title: "Success",
        description: "Successfully followed user",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return api.users.unfollow(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/followers`] });
      toast({
        title: "Success",
        description: "Successfully unfollowed user",
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

  const handleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar ?? undefined} className="object-cover" />
              <AvatarFallback>
                {user.display_name?.split(' ').map(word => word[0]).join('').toUpperCase() || 
                 user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {currentUser?.id === user.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6 text-white" />
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">
              {user.display_name || user.username}
            </h3>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {user.bio || 'No bio available'}
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>{followers?.length || 0} followers</span>
              <span>{following?.length || 0} following</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="followers" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="followers">
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[300px] w-full">
                  {isLoadingFollowers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : followers.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No followers yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {followers.map((follower) => (
                        <div key={follower.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={follower.avatar ?? undefined} />
                            <AvatarFallback>
                              {follower.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {follower.firstName} {follower.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{follower.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="following">
            <Card>
              <CardContent className="p-4">
                <ScrollArea className="h-[300px] w-full">
                  {isLoadingFollowing ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : following.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">Not following anyone yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {following.map((followed) => (
                        <div key={followed.id} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={followed.avatar ?? undefined} />
                            <AvatarFallback>
                              {followed.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {followed.firstName} {followed.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{followed.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          variant="destructive"
          className="mt-6 w-full"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}