import { Post, Comment } from "@db/schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Reply } from "lucide-react";
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
  const maxDepth = 3; // Maximum nesting level

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-start gap-3 ${depth > 0 ? 'ml-6 pl-6 border-l' : ''}`}>
        <Avatar className="h-6 w-6">
          <AvatarImage src={comment.user?.avatar} />
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
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage src={post.user?.avatar} />
          <AvatarFallback>
            {post.user?.firstName?.[0]}
            {post.user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">
                {post.user?.firstName} {post.user?.lastName}
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                {format(new Date(post.createdAt || ''), "PPp")}
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
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{post.content}</p>

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
            <Button 
              onClick={handleComment}
              disabled={!comment.trim()}
            >
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