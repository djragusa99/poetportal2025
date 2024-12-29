import { useUser } from "../hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { data: users = [], refetch } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    }
  });

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const userData = {
      username: formData.get('username'),
      displayName: formData.get('displayName'),
      bio: formData.get('bio')
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      refetch();
      (event.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  id="displayName"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  name="bio"
                  id="bio"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Create User
              </button>
            </form>
          </CardContent>
        </Card>

        {/* User List */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user.id} className="border rounded p-4">
                  <h3 className="font-semibold">{user.displayName}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                  {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}