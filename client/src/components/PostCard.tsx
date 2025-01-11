import { Post, Comment } from "@db/schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Reply, UserPlus, UserMinus, Heart, Loader2 } from "lucide-react";
import api from "../lib/api";
import { useUser } from "../hooks/use-user";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface CommentProps {
  comment: Comment & {
    user: any;
    childComments?: (Comment & { user: any })[];
  };
  onReply: (parentId: number) => void;
  onDelete: (commentId: number) => void;
  currentUserId: number;
  depth?: number;
}

function CommentComponent({ comment, onReply, onDelete, currentUserId, depth = 0 }: CommentProps) {
  const maxDepth = 3;
  const { data: likeStatus } = useQuery({
    queryKey: [`/api/likes/comment/${comment.id}`],
  });

  const queryClient = useQueryClient();
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType: 'comment',
          targetId: comment.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/comment/${comment.id}`] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-3 ${depth > 0 ? 'ml-6 pl-6 border-l' : ''}`}>
        <Avatar className="h-6 w-6">
          <AvatarImage src={comment.user?.avatar} className="object-cover" />
          <AvatarFallback>
            {comment.user?.firstName?.[0]}
            {comment.user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {comment.user?.firstName} {comment.user?.lastName}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(comment.createdAt || ''), "PPp")}
            </span>
          </div>
          <p className="text-sm mt-1">{comment.content}</p>
          <div className="flex gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => likeMutation.mutate()}
              disabled={comment.userId === currentUserId}
              title={comment.userId === currentUserId ? "You cannot like your own comment" : ""}
            >
              <Heart 
                className={`mr-1 h-3 w-3 ${likeStatus?.liked ? 'fill-current text-red-500' : ''}`} 
              />
              {likeStatus?.count || 0}
            </Button>
            {depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="mr-1 h-3 w-3" />
                Reply
              </Button>
            )}
            {comment.userId === currentUserId && (
              <DeleteConfirmDialog
                title="Delete Comment"
                description="Are you sure you want to delete this comment? This action cannot be undone."
                onDelete={() => onDelete(comment.id)}
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
      {comment.childComments && comment.childComments.length > 0 && (
        <div className="space-y-4">
          {comment.childComments.map((reply) => (
            <CommentComponent
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PostCardProps {
  post: Post & {
    user: any;
    comments?: (Comment & {
      user: any;
      childComments?: (Comment & { user: any })[];
    })[];
  };
}

export default function PostCard({ post }: PostCardProps) {
  const [comment, setComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
    queryKey: [`/api/users/${post.user?.id}/following`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${post.user?.id}/following`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: "include"
      });
      if (!response.ok) {
        return { isFollowing: false };
      }
      return response.json();
    },
    enabled: post.userId !== user?.id && !!user
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to follow users");
      if (!post.user?.id) throw new Error("Invalid user ID");
      return await api.users.follow(post.user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/users/${post.user?.id}/following`],
        exact: true,
        refetchType: 'none'
      });
      refetchFollowStatus();
      toast({
        title: "Success",
        description: "Successfully followed user",
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

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to unfollow users");
      if (!post.user?.id) throw new Error("Invalid user ID");
      await api.users.unfollow(post.user.id);
      return { message: "Successfully unfollowed user" };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/users/${post.user?.id}/following`],
        exact: true,
        refetchType: 'none'
      });
      refetchFollowStatus();
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
    if (followStatus?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const { data: likeStatus } = useQuery({
    queryKey: [`/api/likes/post/${post.id}`],
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType: 'post',
          targetId: post.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/likes/post/${post.id}`] });
    },
  });

  const handleComment = async () => {
    try {
      await api.comments.create(post.id, comment, replyingTo);
      setComment("");
      setReplyingTo(null);
      setIsCommenting(false);
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

  const handleDeletePost = async () => {
    try {
      await api.posts.delete(post.id);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.comments.delete(commentId);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const handleReply = (parentId: number) => {
    setReplyingTo(parentId);
    setIsCommenting(true);
  };

  if (!user) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-start gap-4">
        <Avatar className="mt-1">
          <AvatarImage src={post.user?.avatar} className="object-cover" />
          <AvatarFallback>
            {post.user?.firstName && post.user?.lastName 
              ? `${post.user.firstName[0]}${post.user.lastName[0]}`.toUpperCase()
              : post.user?.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {post.user?.display_name || post.user?.username}
              </span>
              {post.userId !== user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFollow}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {followMutation.isPending || unfollowMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {followStatus?.isFollowing ? (
                        <UserMinus className="h-4 w-4 mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      {followStatus?.isFollowing ? 'Following' : 'Follow'}
                    </>
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
          <p className="mt-2 whitespace-pre-wrap text-sm">{post.content}</p>
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