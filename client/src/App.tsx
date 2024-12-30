import { StrictMode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "./hooks/use-user";
import { Loader2 } from "lucide-react";
import Navigation from "./components/Navigation";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Resources from "./pages/Resources";
import AdminDashboard from "./pages/AdminDashboard";
import { useState, useEffect } from "react";

// Protected route component for admin only access
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user?.is_admin) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}

function App() {
  const { user, isLoading } = useUser();
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash screen after delay
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (showSplash) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold">PoetPortal</h1>
      </div>
    );
  }

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
          <Route path="/resources" component={Resources} />
          <Route path="/admin" component={() => <AdminRoute component={AdminDashboard} />} />
          <Route path="/auth" component={AuthPage} />
        </Switch>
      </main>
      <Toaster />
    </div>
  );
}

export default function WrappedApp() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
}