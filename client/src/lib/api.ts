import { Post, Event, PointOfInterest, Resource, Comment } from "@db/schema";

async function handleResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || response.statusText);
    }
    return data;
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    return text;
  }
}

const api = {
  posts: {
    list: () => fetch("/api/posts").then(handleResponse) as Promise<Post[]>,
    create: (content: string) =>
      fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      }).then(handleResponse) as Promise<Post>,
  },
  comments: {
    create: (postId: number, content: string) =>
      fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      }).then(handleResponse) as Promise<Comment>,
  },
  events: {
    list: () => fetch("/api/events").then(handleResponse) as Promise<Event[]>,
  },
  pointsOfInterest: {
    list: () =>
      fetch("/api/points-of-interest").then(handleResponse) as Promise<PointOfInterest[]>,
  },
  resources: {
    list: () =>
      fetch("/api/resources").then(handleResponse) as Promise<Resource[]>,
  },
};

export default api;