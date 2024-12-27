import { useUser } from "../hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@db/schema";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import EventCard from "../components/EventCard";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserProfile from "../components/UserProfile";

export default function Home() {
  const { user } = useUser();
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    queryFn: api.posts.list,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: api.events.list,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Left Sidebar - Events */}
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Feed */}
      <div className="md:col-span-6 space-y-6">
        <CreatePost user={user} />
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Right Sidebar - User Profile */}
      <div className="md:col-span-3">
        <Dialog>
          <DialogTrigger asChild>
            <Card className="sticky top-20 hover:bg-accent/50 cursor-pointer transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <CardTitle className="text-lg">
                    {user?.firstName} {user?.lastName}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">{user?.userType}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {user?.location && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-2 h-4 w-4" />
                    {user.location}
                  </div>
                )}
                {user?.bio && (
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                )}
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Profile</DialogTitle>
            </DialogHeader>
            {user && <UserProfile user={user} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}