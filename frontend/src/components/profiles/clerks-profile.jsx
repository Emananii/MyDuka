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

function ClerkProfile() {
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

  // Fetch cashiers
  const { data: cashiers = [], isLoading: cashiersLoading, error: cashiersError } = useQuery({
    queryKey: ['cashiers'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/api/users?role=cashier`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch cashiers');
      return res.json();
    },
  });

  // Create cashier mutation
  const createCashierMutation = useMutation({
    mutationFn: async (newCashier) => {
      const res = await fetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ...newCashier, role: 'cashier' }),
      });
      if (!res.ok) throw new Error('Failed to create cashier');
      return res.json();
    },
    onSuccess: (created) => {
      queryClient.setQueryData(['cashiers'], (old) => [...(old || []), created]);
      toast({ description: 'Cashier created successfully', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to create cashier', variant: 'destructive' });
    },
  });

  // Deactivate cashier mutation
  const deactivateCashierMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/api/users/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to deactivate cashier');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['cashiers'], (old) =>
        old.map((item) => (item.id === id ? { ...item, is_active: false } : item))
      );
      toast({ description: 'Cashier deactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to deactivate cashier', variant: 'destructive' });
    },
  });

  // Reactivate cashier mutation
  const reactivateCashierMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${BACKEND_URL}/api/users/${id}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to reactivate cashier');
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(['cashiers'], (old) =>
        old.map((item) => (item.id === id ? { ...item, is_active: true } : item))
      );
      toast({ description: 'Cashier reactivated', variant: 'success' });
    },
    onError: () => {
      toast({ description: 'Failed to reactivate cashier', variant: 'destructive' });
    },
  });

  const handleCreateCashier = (e) => {
    e.preventDefault();
    createCashierMutation.mutate({
      name: e.target.name.value,
      email: e.target.email.value,
      password: e.target.password.value,
    });
    e.target.reset();
  };

  if (!user) {
    return <div className="text-center mt-10 text-red-600 font-semibold">Not logged in</div>;
  }

  if (user.role !== 'clerk') {
    return <div className="text-center mt-10 text-red-600 font-semibold">Unauthorized</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Clerk Profile</CardTitle>
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
            <h3 className="text-lg font-semibold mb-2">Create New Cashier</h3>
            <form onSubmit={handleCreateCashier} className="flex flex-col gap-3">
              <Input name="name" placeholder="Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <Input name="password" type="password" placeholder="Password" required />
              <Button type="submit" disabled={createCashierMutation.isLoading}>
                {createCashierMutation.isLoading ? 'Creating...' : 'Create Cashier'}
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Cashiers List</h3>
            {cashiersLoading ? (
              <div>Loading...</div>
            ) : cashiersError ? (
              <div className="text-red-600">Error: {cashiersError.message}</div>
            ) : cashiers.length === 0 ? (
              <p>No cashiers found</p>
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
                  {cashiers.map((cashier) => (
                    <TableRow key={cashier.id}>
                      <TableCell>{cashier.name}</TableCell>
                      <TableCell>{cashier.email}</TableCell>
                      <TableCell>
                        {cashier.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-red-600">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cashier.is_active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deactivateCashierMutation.mutate(cashier.id)}
                            disabled={deactivateCashierMutation.isLoading}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => reactivateCashierMutation.mutate(cashier.id)}
                            disabled={reactivateCashierMutation.isLoading}
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
            <Link href="/inventory">
              <Button>View Inventory</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ClerkProfile;