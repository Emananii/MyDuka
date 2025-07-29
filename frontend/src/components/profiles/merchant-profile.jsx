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

function MerchantProfile() {
  const { user, logout } = useContext(UserContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  });

  // Fetch admins
  const { data: admins = [], isLoading: adminsLoading, error: adminsError } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/users?role=admin`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch admins');
      return res.json();
    },
  });

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (newAdmin) => {
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ...newAdmin, role: 'admin' }),
      });
      if (!res.ok) throw new Error('Failed to create admin');
      return res.json();
    },
    onSuccess: (created) => {
      queryClient.setQueryData(['admins'], (old) => [...(old || []), created.user]);
      toast({ description: 'Admin created successfully', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to create admin', variant: 'destructive' });
    },
  });

  // Deactivate admin mutation
  const deactivateAdminMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/api/users/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to deactivate admin');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['admins'], (old) =>
        old.map((item) => (item.id === id ? { ...item, is_active: false } : item))
      );
      toast({ description: 'Admin deactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to deactivate admin', variant: 'destructive' });
    },
  });

  // Reactivate admin mutation
  const reactivateAdminMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/api/users/${id}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reactivate admin');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['admins'], (old) =>
        old.map((item) => (item.id === id ? { ...item, is_active: true } : item))
      );
      toast({ description: 'Admin reactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to reactivate admin', variant: 'destructive' });
    },
  });

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    createAdminMutation.mutate({
      name: e.target.name.value,
      email: e.target.email.value,
      password: e.target.password.value,
    });
    e.target.reset();
  };

  if (!user) {
    return <div className="text-center mt-10 text-red-600 font-semibold">Not logged in</div>;
  }

  if (user.role !== 'merchant') {
    return <div className="text-center mt-10 text-red-600 font-semibold">Unauthorized</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Merchant Profile</CardTitle>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div>Loading...</div>
          ) : profileError ? (
            <div className="text-red-600">Error: {profileError.message}</div>
          ) : (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">My Info</h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Role:</strong> {profile.role}</p>
                <p><strong>Store:</strong> {profile.store_name || 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Create New Admin</h3>
            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-3">
              <Input name="name" placeholder="Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password" required />
              <Button type="submit" disabled={createAdminMutation.isLoading}>
                {createAdminMutation.isLoading ? 'Creating...' : 'Create Admin'}
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Admins List</h3>
            {adminsLoading ? (
              <div>Loading...</div>
            ) : adminsError ? (
              <div className="text-red-600">Error: {adminsError.message}</div>
            ) : admins.length === 0 ? (
              <p>No admins found</p>
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
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {admin.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.is_active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deactivateAdminMutation.mutate(admin.id)}
                            disabled={deactivateAdminMutation.isLoading}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => reactivateAdminMutation.mutate(admin.id)}
                            disabled={reactivateAdminMutation.isLoading}
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
            <Link href="/merchant-dashboard">
              <Button>View Dashboard</Button>
            </Link>
            <Link href="/stores" className="ml-2">
              <Button variant="outline">Manage Stores</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MerchantProfile;