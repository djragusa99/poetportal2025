import { Post, Event, PointOfInterest, Resource } from "@db/schema";

const api = {
  posts: {
    list: () => fetch("/api/posts").then((r) => r.json() as Promise<Post[]>),
    create: (content: string) =>
      fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      }).then((r) => r.json() as Promise<Post>),
  },
  events: {
    list: () => fetch("/api/events").then((r) => r.json() as Promise<Event[]>),
  },
  pointsOfInterest: {
    list: () =>
      fetch("/api/points-of-interest").then(
        (r) => r.json() as Promise<PointOfInterest[]>
      ),
  },
  resources: {
    list: () =>
      fetch("/api/resources").then((r) => r.json() as Promise<Resource[]>),
  },
};

export default api;
