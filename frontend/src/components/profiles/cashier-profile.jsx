import React, { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserContext } from '@/context/UserContext';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function CashierProfile() {
  const { user, logout } = useContext(UserContext); // Use logout from UserContext

  // Fetch profile
  const { data: profile, isLoading, error } = useQuery({
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

  if (!user) {
    return <div className="text-center mt-10 text-red-600 font-semibold">Not logged in</div>;
  }

  if (user.role !== 'cashier') {
    return <div className="text-center mt-10 text-red-600 font-semibold">Unauthorized</div>;
  }

  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Cashier Profile</CardTitle>
            <Button variant="destructive" onClick={logout}>Logout</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">Error: {error.message}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Name</h3>
                <p>{profile.name}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Email</h3>
                <p>{profile.email}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Role</h3>
                <p>{profile.role}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Store</h3>
                <p>{profile.store_name || 'N/A'}</p>
              </div>
            </div>
          )}
          <div className="mt-6">
            <Link href="/pos">
              <Button>Access POS</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CashierProfile;