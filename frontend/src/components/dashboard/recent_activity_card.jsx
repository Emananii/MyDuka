import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRightLeft, ShoppingCart } from "lucide-react";

const RecentActivityCards = ({ userRole }) => {
  // Mock data for recent activities (replace with API fetch)
  const activities = [
    { id: 1, type: 'sale', description: 'Sale of 5 units of Product A by Cashier John', timestamp: '2025-07-22 10:30 AM' },
    { id: 2, type: 'stock', description: 'Clerk added 20 units of Product B to inventory', timestamp: '2025-07-22 09:15 AM' },
    { id: 3, type: 'restock', description: 'Restock request for Product C approved by Admin', timestamp: '2025-07-21 04:20 PM' },
    { id: 4, type: 'payment', description: 'Supplier payment of $200 confirmed', timestamp: '2025-07-21 02:10 PM' },
  ];

  // Filter activities based on user role
  const filteredActivities = activities.filter(activity => {
    if (userRole === 'Merchant') return true; // Merchant sees all activities
    if (userRole === 'Admin' && ['stock', 'restock', 'payment'].includes(activity.type)) return true;
    if (userRole === 'Clerk' && ['stock', 'restock'].includes(activity.type)) return true;
    if (userRole === 'Cashier' && activity.type === 'sale') return true;
    return false;
  });

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Activities</h2>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredActivities.length > 0 ? (
          filteredActivities.map(activity => (
            <div
              key={activity.id}
              className="flex items-start p-4 border-l-4 border-blue-500 bg-gray-50 rounded-md"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-700">{activity.description}</p>
                <p className="text-xs text-gray-500">{activity.timestamp}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No recent activities to display.</p>
        )}
      </div>
    </div>
  );
};

export default RecentActivityCards;
