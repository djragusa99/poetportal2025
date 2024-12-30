
import { Post, Comment } from "@db/schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Reply, UserPlus, UserMinus, Heart } from "lucide-react";
import api from "../lib/api";
import { useUser } from "../hooks/use-user";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

// Keep all the existing interfaces and CommentComponent

export default function PostCard({ post }: PostCardProps) {
  const [comment, setComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  // Keep all the existing mutations and hooks

  if (!user) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {post.user?.display_name || post.user?.username}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={post.user?.avatar} className="object-cover" />
            <AvatarFallback>
              {(post.user?.display_name || post.user?.username || '')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {post.userId !== user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      followStatus?.following
                        ? unfollowMutation.mutate()
                        : followMutation.mutate()
                    }
                  >
                    {followStatus?.following ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(post.created_at), "PPp")}
                </span>
              </div>
              {post.userId === user.id && (
                <DeleteConfirmDialog
                  title="Delete Post"
                  description="Are you sure you want to delete this post? All comments will also be deleted. This action cannot be undone."
                  onDelete={handleDeletePost}
                />
              )}
            </div>
          </div>
        </div>
        <p className="mt-2 text-lg font-medium">{post.title}</p>
        <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
        <div className="flex gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => likeMutation.mutate()}
            disabled={post.userId === user?.id}
            title={post.userId === user?.id ? "You cannot like your own post" : ""}
          >
            <Heart 
              className={`mr-2 h-4 w-4 ${likeStatus?.liked ? 'fill-current text-red-500' : ''}`} 
            />
            {likeStatus?.count || 0} likes
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {post.comments && post.comments.length > 0 && (
          <div className="mt-4 space-y-4">
            {post.comments.map((comment) => (
              <CommentComponent
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onDelete={handleDeleteComment}
                currentUserId={user.id}
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {isCommenting ? (
          <div className="flex w-full gap-2">
            <Input
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
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
              onClick={() => {
                setIsCommenting(false);
                setReplyingTo(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleComment} disabled={!comment.trim()}>
              {replyingTo ? "Reply" : "Comment"}
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
