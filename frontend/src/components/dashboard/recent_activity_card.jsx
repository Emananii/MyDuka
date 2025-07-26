import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { BASE_URL } from '@/lib/constants';

const RecentActivityCards = ({ userRole }) => {
  // Fetch recent activities from the new endpoint
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/dashboard/activities`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure JWT is sent with the request
      });
      if (!res.ok) throw new Error('Failed to fetch recent activities');
      return res.json();
    },
  });

  // Format timestamp to "time ago" format
  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Filter activities based on user role
  const filteredActivities = activities.filter((activity) => {
    if (userRole === 'Merchant') return true; // Merchant sees all activities
    if (userRole === 'Admin' && ['stock', 'restock', 'payment'].includes(activity.type)) return true;
    if (userRole === 'Clerk' && ['stock', 'restock'].includes(activity.type)) return true;
    if (userRole === 'Cashier' && activity.type === 'sale') return true;
    return false;
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading activities...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Error: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-lg shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-600" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-96 overflow-y-auto">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start p-4 border-l-4 border-blue-500 bg-gray-50 rounded-md"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-700">{activity.description}</p>
                <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No recent activities to display.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityCards;