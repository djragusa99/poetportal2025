import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";

export default function PointsOfInterest() {
  const [search, setSearch] = useState("");
  const { data: points = [] } = useQuery({
    queryKey: ["/api/points-of-interest"],
    queryFn: api.pointsOfInterest.list,
  });

  const filteredPoints = points.filter((point) =>
    point.name.toLowerCase().includes(search.toLowerCase()) ||
    point.description.toLowerCase().includes(search.toLowerCase())
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPoints.map((point) => (
          <Card key={point.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span>{point.name}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {point.type}
                </span>
              </CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                {point.location}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {point.description}
              </p>
              <Button variant="secondary" className="w-full">
                Learn More
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
