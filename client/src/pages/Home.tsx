import { useUser } from "../hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Post } from "@db/schema";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import EventCard from "../components/EventCard";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

      {/* Right Sidebar */}
      <div className="md:col-span-3">
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Welcome to PoetPortal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with fellow poets, discover events, and share your passion
              for poetry.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
