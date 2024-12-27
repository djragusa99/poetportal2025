import { Event } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{event.title}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarDays className="mr-2 h-4 w-4" />
          {format(new Date(event.date), "PPP")}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4" />
          {event.location}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        <Button className="mt-4" variant="secondary">
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
}