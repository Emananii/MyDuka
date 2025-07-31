// ClerkSupplyRequest.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "@/utils/axios";
import { useUser } from "@/context/UserContext";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AddSupplyRequest } from "@/components/supply-request/add-supply-request";
import { EditSupplyRequest } from "@/components/supply-request/edit-supply-request";
import { ViewSupplyRequest } from "@/components/supply-request/view-supply-request";

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
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Log the user object to see its structure and ID
  console.log("Clerk User Context:", user);


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [currentlyFetchingId, setCurrentlyFetchingId] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [sortKey, setSortKey] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const {
    data: supplyRequests = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["clerk_supply_requests", user?.id], // Query key includes user.id
    queryFn: async () => {
      if (!user?.id) {
        console.log("Clerk user ID is not available, skipping fetch.");
        return [];
      }
      
      // Send clerk_id as a query parameter to the backend for filtering
      console.log(`Fetching supply requests for clerk_id: ${user.id}`);
      const response = await axios.get(`/api/supply-requests?clerk_id=${user.id}`);
      
      // Log the raw response data from the backend
      console.log("Raw API Response for clerk_supply_requests:", response.data);
      
      // The backend should now return only requests for this clerk, so no further frontend filter needed
      return response.data.data;
    },
    enabled: !!user?.id, // Only run this query if user.id exists
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Error fetching requests.",
        description: err.response?.data?.message || "Could not load supply requests.",
      });
      console.error("Error fetching clerk supply requests:", err);
    },
  });

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortedAndFilteredRequests = useMemo(() => {
    let filtered = supplyRequests;

    // Log requests before filters
    console.log("Clerk requests before status filter:", filtered);

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }
    console.log("Clerk requests after status filter:", filtered);


    filtered = filtered.filter((r) => {
      const date = new Date(r.created_at);
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;
      return (!from || date >= from) && (!to || date <= to);
    });
    console.log("Clerk requests after date filter:", filtered);


    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (sortKey === "created_at" || sortKey === "updated_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sortKey === "product_name") {
        aVal = a.product?.name?.toLowerCase() || "";
        bVal = b.product?.name?.toLowerCase() || "";
      } else if (sortKey === "status") {
        aVal = a.status?.toLowerCase() || "";
        bVal = b.status?.toLowerCase() || "";
      }

      return sortDirection === "asc" ? aVal > bVal ? 1 : -1 : aVal < bVal ? 1 : -1;
    });
  }, [supplyRequests, startDate, endDate, selectedStatus, sortKey, sortDirection]);

  const renderSortArrow = (key) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const fetchRequestDetails = async (id) => {
    setCurrentlyFetchingId(id);
    try {
      const res = await axios.get(`/api/supply-requests/${id}`);
      setViewingRequest(res.data);
      setIsViewModalOpen(true);
    } catch (err) {
      toast({
        title: "Fetch error",
        description: err.response?.data?.message || "Failed to fetch request details.",
        variant: "destructive",
      });
    } finally {
      setCurrentlyFetchingId(null);
    }
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
  };

  const handleRequestActionSuccess = () => {
    if (user?.id) {
      // Invalidate the clerk's specific query key to refetch their requests
      queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests", user.id] });
    }
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsViewModalOpen(false);
    setViewingRequest(null);
    setEditingRequest(null);
    setSelectedStatus("all"); // Reset filter to show all requests after action
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading your supply requests...</div>;
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>{error.message || "An unexpected error occurred."}</p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests", user?.id] })
          }
        >
          Retry
        </Button>
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

      {/* Filter card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm">Start Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm">End Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 text-sm w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm sr-only">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("id")} className="cursor-pointer">ID{renderSortArrow("id")}</TableHead>
                <TableHead onClick={() => handleSort("product_name")} className="cursor-pointer">Product{renderSortArrow("product_name")}</TableHead>
                <TableHead>Requested Qty</TableHead>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer">Status{renderSortArrow("status")}</TableHead>
                <TableHead onClick={() => handleSort("created_at")} className="cursor-pointer">Requested On{renderSortArrow("created_at")}</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedAndFilteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-4">
                    No supply requests found.
                  </TableCell>
                </TableRow>
              ) : (
                getSortedAndFilteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.id}</TableCell>
                    <TableCell>{request.product?.name || "N/A"}</TableCell>
                    <TableCell>{request.requested_quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "success"
                            : request.status === "pending"
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => fetchRequestDetails(request.id)} disabled={currentlyFetchingId === request.id}>
                        View
                      </Button>
                      {/* Edit button only for pending requests */}
                      {request.status === "pending" && (
                        <Button size="sm" variant="ghost" onClick={() => handleEditRequest(request)}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      <AddSupplyRequest isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdded={handleRequestActionSuccess} />
      {editingRequest && isEditModalOpen && (
        <EditSupplyRequest isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingRequest(null); }} request={editingRequest} onUpdated={handleRequestActionSuccess} />
      )}
      {viewingRequest && isViewModalOpen && (
        <ViewSupplyRequest isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setViewingRequest(null); }} request={viewingRequest} />
      )}
    </div>
  );
}
