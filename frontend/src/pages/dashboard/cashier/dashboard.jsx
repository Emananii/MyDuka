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

// ==============================================================================
// Main ClerkDashboard Component
// ==============================================================================

function ClerkDashboard() {
  const { user, isLoading: userLoading } = useUser();

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <p className="text-lg text-gray-500">Loading Clerk Dashboard...</p>
      </div>
    );
  }

  // Display a welcome message with the user's name
  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 font-sans bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-800">
        Welcome to Myduka {user?.name || ''}
      </h1>
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
