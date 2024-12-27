import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "./hooks/use-user";
import { Loader2 } from "lucide-react";
import Navigation from "./components/Navigation";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Events from "./pages/Events";
import PointsOfInterest from "./pages/PointsOfInterest";
import Resources from "./pages/Resources";
import Organizations from "./pages/Organizations";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/events" component={Events} />
          <Route path="/points-of-interest" component={PointsOfInterest} />
          <Route path="/resources" component={Resources} />
          <Route path="/organizations" component={Organizations} />
          <Route path="/admin" component={AdminDashboard} />
        </Switch>
      </main>
      <Toaster />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}