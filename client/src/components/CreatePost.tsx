import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  username: string;
  display_name: string | null;
}

interface CreatePostProps {
  user: User;
}

export default function CreatePost({ user }: CreatePostProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!content.trim()) {
      return;
    }

    try {
      const title = content.split('\n')[0].slice(0, 50);
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setContent("");
      toast({
        title: "Success",
        description: "Your post has been created",
      });
    } catch (error: any) {
      console.error("Post creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    }
  };

  const displayName = user.display_name || user.username;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarFallback>
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">
          {displayName}
        </span>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
        <Button
          className="mt-4 w-full"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          Post
        </Button>
      </CardContent>
    </Card>
  );
}