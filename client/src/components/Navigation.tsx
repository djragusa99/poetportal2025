import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  Landmark,
  Book,
  User,
  Search,
  Building2,
  Settings,
} from "lucide-react";
import { useUser } from "../hooks/use-user";
import UserProfile from "./UserProfile";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Navigation() {
  const { user } = useUser();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">PoetPortal</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Events
              </Button>
            </Link>
            <Link href="/organizations">
              <Button variant="ghost" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Organizations
              </Button>
            </Link>
            <Link href="/points-of-interest">
              <Button variant="ghost" size="sm">
                <Landmark className="h-4 w-4 mr-2" />
                Points of Interest
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" size="sm">
                <Book className="h-4 w-4 mr-2" />
                Resources
              </Button>
            </Link>
            {user?.is_admin && (
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="w-full md:w-auto">
            <Button variant="outline" className="w-full justify-start">
              <Search className="mr-2 h-4 w-4" />
              <span>Search...</span>
            </Button>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <UserProfile user={user} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </nav>
  );
}