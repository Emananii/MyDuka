import React, { useState, useEffect } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

// The base URL for the API.
// This is now imported from your project's constants file.
import { BASE_URL } from "@/lib/constants";

// Importing the actual shadcn/ui components from your library
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ==============================================================================
// Start of the main application code
// ==============================================================================

const queryClient = new QueryClient();

/**
 * A shared API request function that handles authentication.
 * All mock data has been removed, so this will now make a real network request.
 */
const apiRequest = async (method, url) => {
  const token = localStorage.getItem("jwt_token"); // Get token from local storage
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`; // Add auth header if token exists
  }
  
  const response = await fetch(url, { method, headers });
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

/**
 * This hook represents where your real authentication solution would integrate.
 * The mock data for the user object has been updated.
 * IMPORTANT: You must replace the contents of this useEffect with your actual
 * user fetching or context logic (e.g., from a Clerk auth provider).
 */
const useUser = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This is where you would place your real user fetching logic.
    // For now, it will set a mock clerk user to keep the app functional.
    const fetchedUser = {
      id: "user_123",
      name: "Clerk User",
      role: "clerk",
      store_id: 101, // This store ID is crucial for the dashboard's data fetching
    };
    setUser(fetchedUser);
    setIsLoading(false);
  }, []);

  return { user, isLoading };
};

// --- Utility functions ---

const getStockStatus = (qty) =>
  qty === 0 ? "out-of-stock" : qty <= 5 ? "low-stock" : "in-stock";

const getBadge = (status) => {
  if (status === "out-of-stock") return <Badge variant="destructive">Out of Stock</Badge>;
  if (status === "low-stock")
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
};

// ==============================================================================
// Main ClerkDashboard Component
// ==============================================================================

function ClerkDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const clerkStoreId = user?.store_id;

  const {
    data: dashboardData = {},
    isLoading: dataLoading,
    error,
  } = useQuery({
    queryKey: ["clerk-dashboard-summary", clerkStoreId],
    queryFn: () =>
      apiRequest("GET", `${BASE_URL}/clerk_dashboard/summary`),
    enabled: !userLoading && !!clerkStoreId, // Ensure user and store ID are available
  });

  const isLoading = userLoading || dataLoading;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <p className="text-red-600 text-lg">Error loading data: {error.message}</p>
      </div>
    );
  }

  // Display a loading state if any data is still loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <p className="text-lg text-gray-500">Loading Clerk Dashboard...</p>
      </div>
    );
  }

  const { store_name, low_stock_items = [], out_of_stock_items = [] } = dashboardData;

  const dashboardTitle = store_name ? `Dashboard for ${store_name}` : "Clerk Dashboard";

  return (
    <div className="space-y-6 p-6 font-sans bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{dashboardTitle}</h1>
      </div>
      
      {/* Inventory Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" /> Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low_stock_items.length > 0 ? (
                  low_stock_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.stock_level}</TableCell>
                      <TableCell>{item.threshold}</TableCell>
                      <TableCell>{getBadge(getStockStatus(item.stock_level))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No low stock items for this store
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Out of Stock Items Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> Out of Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {out_of_stock_items.length ? (
              out_of_stock_items.map((item) => (
                <div key={item.id} className="flex text-center text-sm py-2 justify-center">
                  <span className="inline-block border-b border-gray-300 pb-1">
                    {item.name}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center">
                No out-of-stock items for this store
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// The main App component to wrap the ClerkDashboard with the QueryClientProvider.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkDashboard />
    </QueryClientProvider>
  );
}
