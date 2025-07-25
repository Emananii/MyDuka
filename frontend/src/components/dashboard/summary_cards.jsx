import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

// ✅ API-driven summary component
export default function DashboardSummary() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["/dashboard/summary"],
    queryFn: async () => {
      const res = await fetch("http://127.0.0.1:5000/dashboard/summary");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  if (isLoading) {
    return <p>Loading summary…</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Low Stock */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-3xl font-semibold text-gray-900">
                {data.low_stock_count || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Out of Stock</p>
              <p className="text-3xl font-semibold text-gray-900">
                {data.out_of_stock_count || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
