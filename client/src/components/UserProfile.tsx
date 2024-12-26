import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  const { logout } = useUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>
              {user.firstName[0]}
              {user.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold">
              {user.firstName} {user.lastName}
            </h3>
            {user.pronouns && (
              <p className="text-sm text-muted-foreground">{user.pronouns}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.location}</p>
            <p className="text-sm font-medium">{user.userType}</p>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold">Bio</h4>
          <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>
        </div>
        <Button
          variant="destructive"
          className="mt-6 w-full"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
