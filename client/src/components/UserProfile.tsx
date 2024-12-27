import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogOut, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar ?? undefined} className="object-cover" />
              <AvatarFallback>
                {user.firstName[0]}
                {user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold">
              {user.firstName} {user.lastName}
            </h3>
            {user.pronouns && (
              <p className="text-sm text-muted-foreground">{user.pronouns}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.location}</p>
            <p className="text-sm font-medium">{user.userType}</p>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold">Bio</h4>
          <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>
        </div>
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