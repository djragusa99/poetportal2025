import { useQuery } from "@tanstack/react-query";
import { Event } from "@db/schema";
import EventCard from "../components/EventCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export default function Events() {
  const [search, setSearch] = useState("");
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Handle undefined events array and ensure type safety
  const filteredEvents = Array.isArray(events) ? events.filter((event) =>
    event.title?.toLowerCase().includes(search.toLowerCase()) ||
    event.description?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Events</h1>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}