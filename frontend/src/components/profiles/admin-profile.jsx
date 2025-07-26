import React, { useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserContext } from '@/context/UserContext';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function AdminProfile() {
  const { user, logout } = useContext(UserContext); // Assume logout is added to UserContext
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clerks
  const { data: clerks = [], isLoading, error } = useQuery({
    queryKey: ['clerks'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/users?role=clerk`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`, // Assume JWT is stored
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch clerks');
      return res.json();
    },
  });

  // Create clerk mutation
  const createClerkMutation = useMutation({
    mutationFn: async (newClerk) => {
      const res = await fetch(`${BACKEND_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ...newClerk, role: 'clerk' }),
      });
      if (!res.ok) throw new Error('Failed to create clerk');
      return res.json();
    },
    onSuccess: (created) => {
      queryClient.setQueryData(['clerks'], (old) => [...(old || []), created]);
      toast({ description: 'Clerk created successfully', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to create clerk', variant: 'destructive' });
    },
  });

  // Deactivate clerk mutation
  const deactivateClerkMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/users/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to deactivate clerk');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['clerks'], (old) =>
        old.map((u) => (u.id === id ? { ...u, is_active: false } : u))
      );
      toast({ description: 'Clerk deactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to deactivate clerk', variant: 'destructive' });
    },
  });

  // Reactivate clerk mutation
  const reactivateClerkMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/users/${id}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reactivate clerk');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['clerks'], (old) =>
        old.map((u) => (u.id === id ? { ...u, is_active: true } : u))
      );
      toast({ description: 'Clerk reactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to reactivate clerk', variant: 'destructive' });
    },
  });

  const handleCreateClerk = (e) => {
    e.preventDefault();
    createClerkMutation.mutate({
      name: e.target.name.value,
      email: e.target.email.value,
      password: e.target.password.value,
    });
    e.target.reset();
  };

  if (!user) {
    return <div className="text-center mt-10 text-red-600 font-semibold">Not logged in</div>;
  }

  if (user.role !== 'admin') {
    return <div className="text-center mt-10 text-red-600 font-semibold">Unauthorized</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Admin Profile</CardTitle>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">My Info</h3>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Create New Clerk</h3>
            <form onSubmit={handleCreateClerk} className="flex flex-col gap-3">
              <Input name="name" placeholder="Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password" required />
              <Button type="submit" disabled={createClerkMutation.isLoading}>
                {createClerkMutation.isLoading ? 'Creating...' : 'Create Clerk'}
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Clerk List</h3>
            {isLoading ? (
              <div>Loading...</div>
            ) : error ? (
              <div className="text-red-600">Error: {error.message}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clerks.map((clerk) => (
                    <TableRow key={clerk.id}>
                      <TableCell>{clerk.name}</TableCell>
                      <TableCell>{clerk.email}</TableCell>
                      <TableCell>
                        {clerk.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {clerk.is_active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deactivateClerkMutation.mutate(clerk.id)}
                            disabled={deactivateClerkMutation.isLoading}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => reactivateClerkMutation.mutate(clerk.id)}
                            disabled={reactivateClerkMutation.isLoading}
                          >
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="mt-6">
            <Link href="/stores">
              <Button variant="outline">Manage Stores</Button>
            </Link>
            <Link href="/reports" className="ml-2">
              <Button variant="outline">View Reports</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminProfile;