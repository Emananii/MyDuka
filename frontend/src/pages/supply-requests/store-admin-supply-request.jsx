import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react"; // Replaced Truck with ChevronRight for review action
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import axios from "@/utils/axios"; // Your configured axios instance
import { useUser } from "@/context/UserContext"; // To filter requests by store_id

// Import the supply request modals
import { ApproveSupplyRequest } from "@/components/supply-request/approve-supply-request";
import { ViewSupplyRequest } from "@/components/supply-request/view-supply-request";

// Helper function to format dates
const formatDate = (rawDate) => {
  if (!rawDate) return "N/A";
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function StoreAdminSupplyRequest() {
  const { toast } = useToast();
  const { user } = useUser(); // Get logged-in user details (admin/merchant)
  const queryClient = useQueryClient();

  // Log the user object to see its structure and store_id
  console.log("Admin User Context:", user);

  // Modal control states
  const [viewingRequest, setViewingRequest] = useState(null); // Data for the View modal
  const [approvingRequest, setApprovingRequest] = useState(null); // Data for the Approve modal
  const [currentlyFetchingId, setCurrentlyFetchingId] = useState(null); // To show loading state on specific card

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending"); // Default to 'pending' for admin review

  // --- Data Fetching with React Query ---
  // Fetch supply requests relevant to the admin's store(s)
  const {
    data: supplyRequests = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin_supply_requests", user?.store_id], // Query key includes store_id
    queryFn: async () => {
      // Temporarily hardcode store_id to 2 for testing, as clerk is submitting to store_id 2
      const targetStoreId = 2; // user?.store_id; // Change this back to user?.store_id for production

      if (!targetStoreId) {
        console.log("Admin targetStoreId is not available, skipping fetch.");
        return []; // Don't fetch if store ID isn't available
      }

      console.log(`Fetching supply requests for store_id: ${targetStoreId}`);
      const response = await axios.get(`/api/supply-requests?store_id=${targetStoreId}`);
      
      // Log the raw response data from the backend
      console.log("Raw API Response for admin_supply_requests:", response.data);
      
      // Access the 'data' array from the response object
      return response.data.data;
    },
    enabled: !!user?.store_id, // Only run this query if user.store_id exists
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Error fetching requests.",
        description: err.response?.data?.message || "Could not load supply requests.",
      });
      console.error("Error fetching admin supply requests:", err);
    },
  });

  // --- Filtering Logic ---
  const filteredRequests = useMemo(() => {
    let filtered = supplyRequests;

    // Log the requests before filtering to see what's available
    console.log("Requests before status filter:", filtered);

    // Filter by status
    if (selectedStatus && selectedStatus !== "all") {
      filtered = filtered.filter(request => request.status === selectedStatus);
    }
    console.log("Requests after status filter:", filtered);


    // Filter by search term (product name, clerk name, request ID)
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.product?.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
          // IMPORTANT: Changed clerk.name to clerk.email to match backend serialization
          request.clerk?.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
          String(request.id).includes(lowerCaseSearchTerm)
      );
    }
    console.log("Requests after search filter:", filtered);


    // Sort by created_at in descending order (most recent first) by default
    return [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [supplyRequests, selectedStatus, searchTerm]);

  // --- Modal Interaction Handlers ---
  const handleReviewClick = (request) => {
    setApprovingRequest(request);
  };

  const handleViewClick = (request) => {
    // Optionally fetch full details if the list item is truncated
    setCurrentlyFetchingId(request.id);
    axios.get(`/api/supply-requests/${request.id}`)
      .then(response => {
        setViewingRequest(response.data);
        setCurrentlyFetchingId(null);
      })
      .catch(err => {
        toast({
          title: "Fetch error",
          description: err.response?.data?.message || "Failed to fetch request details.",
          variant: "destructive",
        });
        setCurrentlyFetchingId(null);
      });
  };

  // Callback to refresh list after approve/decline
  const handleRequestActionSuccess = () => {
    // Invalidate and refetch all relevant queries
    queryClient.invalidateQueries({ queryKey: ["admin_supply_requests", user?.store_id] });
    queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests", user?.id] }); // Also invalidate clerk's view if needed
    setApprovingRequest(null); // Close approve modal
    setViewingRequest(null); // Close view modal if open
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-10 w-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="h-48 bg-gray-100 rounded-xl"></Card>
            <Card className="h-48 bg-gray-100 rounded-xl"></Card>
            <Card className="h-48 bg-gray-100 rounded-xl"></Card>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error.message || "An unexpected error occurred while loading requests."}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin_supply_requests", user?.store_id] })}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Supply Requests for Review</h1>
        {/* Admins don't 'add' supply requests directly from here, they manage existing ones */}
      </div>

      {/* --- Filter & Search Controls --- */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Filter Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by product, clerk email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="statusFilter" className="text-sm text-gray-600 sr-only">Status</label>
              <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                <SelectTrigger id="statusFilter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Supply Request Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <Card
              key={request.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      {/* Icon representing a supply request, e.g., an outgoing box or list */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v11h18V10M3 10l9-7 9 7M3 10a2 2 0 012-2h14a2 2 0 012 2M7 15h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {request.product?.name || "Unknown Product"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Request #{request.id}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`capitalize ${
                      request.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : request.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : request.status === "declined"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {request.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Store</p>
                    <p className="text-sm text-gray-600">
                      {request.store?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Requested By
                    </p>
                    <p className="text-sm text-gray-600">
                      {/* Display clerk.email */}
                      {request.clerk?.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Quantity
                    </p>
                    <p className="text-sm text-gray-600">
                      {request.requested_quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Requested On
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {request.status === "pending" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleReviewClick(request)}
                      disabled={currentlyFetchingId === request.id}
                    >
                      {currentlyFetchingId === request.id ? "Loading..." : "Review Request"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewClick(request)}
                    disabled={currentlyFetchingId === request.id}
                  >
                    {currentlyFetchingId === request.id ? "Loading..." : "View Details"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v11h18V10M3 10l9-7 9 7M3 10a2 2 0 012-2h14a2 2 0 012 2M7 15h10" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No supply requests found
                </h3>
                <p className="text-gray-500">
                  There are no supply requests to review matching your criteria.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      {approvingRequest && (
        <ApproveSupplyRequest
          isOpen={!!approvingRequest}
          onClose={() => setApprovingRequest(null)}
          request={approvingRequest}
          onSuccess={handleRequestActionSuccess} // Pass the refresh handler
        />
      )}

      {viewingRequest && (
        <ViewSupplyRequest
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          request={viewingRequest}
          // ViewSupplyRequest's internal edit/delete logic will invalidate queries
          // which will trigger this component's data fetch via React Query.
        />
      )}
    </div>
  );
}
