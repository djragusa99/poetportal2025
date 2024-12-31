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
    list: () => fetch("/api/posts", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      }).then(handleResponse) as Promise<Post[]>,
    create: (title: string, content: string) =>
      fetch("/api/posts", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`,
          "Content-Type": "application/json" 
        },
        credentials: "include",
        body: JSON.stringify({ title, content }),
      }).then(handleResponse) as Promise<Post>,
    delete: (postId: number) =>
      fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      }).then(handleResponse),
  },
  comments: {
    create: (postId: number, content: string, parentId?: number | null) =>
      fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, parentId }),
      }).then(handleResponse) as Promise<Comment>,
    delete: (commentId: number) =>
      fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      }).then(handleResponse),
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
  users: {
    follow: async (userId: number) => {      
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: "include"
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data;
    },
    unfollow: (userId: number) =>
      fetch(`/api/users/${userId}/follow`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('auth_token')}`
        },
        credentials: "include",
      }).then(handleResponse),
  },
};

export default api;