import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";

export default function Resources() {
  const [search, setSearch] = useState("");
  const { data: resources = [] } = useQuery({
    queryKey: ["/api/resources"],
    queryFn: api.resources.list,
  });

  const filteredResources = resources.filter((resource) =>
    resource.title.toLowerCase().includes(search.toLowerCase()) ||
    resource.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Poetry Resources</h1>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => (
          <Card key={resource.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between">
                <span>{resource.title}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {resource.type}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {resource.description}
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => window.open(resource.link, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Resource
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
