import { useUser } from "../hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { Post, Event } from "@db/schema";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  const { user } = useUser();
  
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    enabled: !!user
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    enabled: !!user, // Only fetch posts if user is logged in
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: !!user, // Only fetch events if user is logged in
  });

  if (!user) {
    return null; // Let the App component handle the unauthenticated state
  }

  const displayName = user.display_name || user.username;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4">
      {/* Left Sidebar - Events */}
      <div className="md:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingEvents ? (
              <p className="text-sm text-muted-foreground">Loading events...</p>
            ) : events && events.length > 0 ? (
              events.slice(0, 3).map((event) => (
                <div key={event.id} className="text-sm">
                  <h3 className="font-medium">{event.title}</h3>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Feed */}
      <div className="md:col-span-6 space-y-6">
        <CreatePost user={user} />
        {isLoadingPosts ? (
          <p className="text-center text-muted-foreground">Loading posts...</p>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No posts yet. Be the first to share something!
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Sidebar - User Profile */}
      <div className="md:col-span-3">
        <Card className="sticky top-4">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar ?? undefined} alt={displayName} />
              <AvatarFallback>
                {displayName.split(' ').map(word => word[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <CardTitle className="text-lg">{displayName}</CardTitle>
              <p className="text-sm text-muted-foreground text-[10px]" style={{ maxWidth: "100%" }}>
                  {user?.bio 
                  ? user.bio.split(' ').slice(0, 50).join(' ') + (user.bio.split(' ').length > 50 ? '...' : '')
                  : "No bio available"}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}