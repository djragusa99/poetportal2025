import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ExternalLink } from "lucide-react";
import { useState } from "react";

interface PointOfInterest {
  id: number;
  title: string;
  description: string;
  location: string;
  link: string;
}

export default function PointsOfInterest() {
  const [search, setSearch] = useState("");
  const { data: points = [], isLoading } = useQuery<PointOfInterest[]>({
    queryKey: ["/api/points-of-interest"],
  });

  const filteredPoints = points.filter((point) =>
    point.title.toLowerCase().includes(search.toLowerCase()) ||
    point.description.toLowerCase().includes(search.toLowerCase()) ||
    point.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Points of Interest</h1>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search points of interest..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">Loading points of interest...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPoints.map((point) => (
            <Card key={point.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{point.title}</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  {point.location}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {point.description}
                </p>
                <Button
                  variant="secondary"
                  className="w-full mt-auto"
                  onClick={() => window.open(point.link, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}