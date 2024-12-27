import { Post } from "@db/schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import api from "../lib/api";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [comment, setComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleComment = async () => {
    try {
      await api.comments.create(post.id, comment);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={post.user.avatar} />
          <AvatarFallback>
            {post.user.firstName[0]}
            {post.user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold">
            {post.user.firstName} {post.user.lastName}
          </span>
          <span className="text-sm text-muted-foreground">
            {format(new Date(post.createdAt), "PPp")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>

        {post.comments && post.comments.length > 0 && (
          <div className="mt-4 space-y-4">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3 pl-6 border-l">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={comment.user.avatar} />
                  <AvatarFallback>
                    {comment.user.firstName[0]}
                    {comment.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {comment.user.firstName} {comment.user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.createdAt), "PPp")}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isCommenting ? (
          <div className="flex w-full gap-2">
            <Input
              placeholder="Write a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && comment.trim()) {
                  handleComment();
                }
              }}
            />
            <Button 
              variant="secondary" 
              onClick={() => setIsCommenting(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleComment}
              disabled={!comment.trim()}
            >
              Comment
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            onClick={() => setIsCommenting(true)}
          >
            Write a comment...
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}