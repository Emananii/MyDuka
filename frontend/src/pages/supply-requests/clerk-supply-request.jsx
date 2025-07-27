import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Use useQuery for data fetching
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react"; // Plus icon for "New Request" button
import { useToast } from "@/hooks/use-toast";
import axios from "@/utils/axios"; // Your configured axios instance
import { useUser } from "@/context/UserContext"; // To filter requests by clerk_id
import { Badge } from "@/components/ui/badge"; // For status badge

// Import the modals we created
import { AddSupplyRequest } from "@/components/supply-request/add-supply-request";
import { EditSupplyRequest } from "@/components/supply-request/edit-supply-request";
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

export default function ClerkSupplyRequest() {
  const { toast } = useToast();
  const { user } = useUser(); // Get logged-in user details
  const queryClient = useQueryClient(); // Initialize query client for invalidation

  // Modal control states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null); // Data for the View modal
  const [editingRequest, setEditingRequest] = useState(null); // Data for the Edit modal
  const [currentlyFetchingId, setCurrentlyFetchingId] = useState(null); // To show loading state on specific row

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(""); // For filtering by status

  // Sorting states
  const [sortKey, setSortKey] = useState("created_at"); // default sort
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"

  // --- Data Fetching with React Query ---
  // Fetch supply requests specific to the logged-in clerk
  const {
    data: supplyRequests = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clerk_supply_requests", user?.id], // Query key includes user.id for specific clerk data
    queryFn: async () => {
      if (!user?.id) return []; // Don't fetch if user ID isn't available

      // Assuming your backend /api/supply-requests endpoint automatically filters by clerk_id
      // if a clerk token is provided. If not, you might need to adjust the query:
      const response = await axios.get('/api/supply-requests');

      // Filter by current clerk's ID on the frontend if the backend doesn't do it automatically
      // for the /api/supply-requests endpoint and you only want *this clerk's* requests.
      const filteredByUser = response.data.filter(req => req.clerk_id === user.id);
      return filteredByUser;
    },
    enabled: !!user?.id, // Only run this query if user.id exists
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Error fetching requests.",
        description: err.response?.data?.message || "Could not load supply requests.",
      });
    },
  });

  // --- Filtering & Sorting Logic ---
  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortedAndFilteredRequests = useMemo(() => {
    let filtered = supplyRequests.filter((request) => {
      const requestDate = new Date(request.created_at);
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;

      const matchesDateRange =
        (!from || requestDate >= from) && (!to || requestDate <= to);

      const matchesStatus =
        !selectedStatus || request.status === selectedStatus;

      return matchesDateRange && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];

      if (sortKey === "created_at" || sortKey === "updated_at") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortKey === "product_name") {
        aValue = a.product?.name?.toLowerCase() || "";
        bValue = b.product?.name?.toLowerCase() || "";
      } else if (sortKey === "status") {
        aValue = a.status?.toLowerCase() || "";
        bValue = b.status?.toLowerCase() || "";
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [supplyRequests, startDate, endDate, selectedStatus, sortKey, sortDirection]);

  const renderSortArrow = (key) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  // --- Modal Interaction Handlers ---
  const fetchRequestDetails = async (id) => {
    setCurrentlyFetchingId(id);
    try {
      const res = await axios.get(`/api/supply-requests/${id}`); // Assuming a GET /api/supply-requests/:id endpoint
      setViewingRequest(res.data);
      setCurrentlyFetchingId(null);
      setIsViewModalOpen(true); // Open view modal after fetching
    } catch (err) {
      toast({
        title: "Fetch error",
        description: err.response?.data?.message || "Failed to fetch request details.",
        variant: "destructive",
      });
      setCurrentlyFetchingId(null);
    }
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
  };

  const handleRequestActionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests"] }); // Invalidate and refetch
    // Optionally, close any open modal here if not handled by the modal itself
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setViewingRequest(null);
    setEditingRequest(null);
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p>Loading your supply requests...</p>
        {/* Consider adding a proper spinner component */}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error.message || "An unexpected error occurred."}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests"] })}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">My Supply Requests</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Request
        </Button>
      </div>

      {/* --- Filter Controls --- */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Filter Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="startDate" className="text-sm text-gray-600">Start Date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="endDate" className="text-sm text-gray-600">End Date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="statusFilter" className="text-sm text-gray-600">Status</label>
              <select
                id="statusFilter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Supply Requests Table --- */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead onClick={() => handleSort("id")} className="cursor-pointer">
                  ID{renderSortArrow("id")}
                </TableHead>
                <TableHead onClick={() => handleSort("product_name")} className="cursor-pointer">
                  Product{renderSortArrow("product_name")}
                </TableHead>
                <TableHead>Requested Quantity</TableHead>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
                  Status{renderSortArrow("status")}
                </TableHead>
                <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer">
                  Requested On{renderSortArrow("created_at")}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedAndFilteredRequests.length > 0 ? (
                getSortedAndFilteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="hover:bg-gray-100" // Removed cursor-pointer from row to avoid accidental clicks when row actions exist
                  >
                    <TableCell>{request.id}</TableCell>
                    <TableCell>{request.product?.name || 'N/A'}</TableCell>
                    <TableCell>{request.requested_quantity}</TableCell>
                    <TableCell>
                      <Badge
                        className={`capitalize ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'declined' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchRequestDetails(request.id)}
                          disabled={currentlyFetchingId === request.id}
                        >
                          {currentlyFetchingId === request.id ? "Loading..." : "View"}
                        </Button>
                        {request.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRequest(request)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No supply requests found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* --- Modals --- */}
      <AddSupplyRequest
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSupplyRequestAdded={handleRequestActionSuccess}
      />

      {editingRequest && (
        <EditSupplyRequest
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
          request={editingRequest}
          onUpdated={handleRequestActionSuccess}
        />
      )}

      {viewingRequest && (
        <ViewSupplyRequest
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          request={viewingRequest}
          // The ViewSupplyRequest component has its own internal logic for edit/delete
          // which will trigger handleRequestActionSuccess indirectly via queryClient.invalidateQueries
        />
      )}
    </div>
  );
}