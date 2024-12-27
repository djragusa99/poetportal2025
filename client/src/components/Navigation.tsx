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
      <div className="container flex h-14 items-center justify-between">
        {/* Left section with logo */}
        <div className="flex items-center md:w-1/4">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">PoetPortal</span>
          </Link>
        </div>

        {/* Center section with navigation items */}
        <div className="hidden md:flex md:w-2/4 justify-center">
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
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          </nav>
        </div>

        {/* Right section with search and profile */}
        <div className="flex items-center justify-end md:w-1/4">
          <div className="w-full flex-1 md:w-auto md:flex-none">
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