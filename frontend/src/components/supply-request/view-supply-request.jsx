import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Good for accessibility/context
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, PencilLine, Printer } from "lucide-react";
import axios from "@/utils/axios"; // Assuming axios for API calls
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext"; // To determine user role

import { EditSupplyRequest } from "@/components/supply-request/edit-supply-request";

// Helper function to format dates
const formatDate = (rawDate) => {
  if (!rawDate) return "N/A";
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function ViewSupplyRequest({ isOpen, onClose, request }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser(); // Get current user to check role for permissions
  const [editing, setEditing] = useState(false);

  // Determine if the request is editable by the clerk (only if status is 'pending' AND user is clerk)
  const isEditableByClerk = useMemo(() => {
    return user?.role === 'clerk' && request?.status === "pending";
  }, [request, user]);

  // Determine if the request is deletable by the clerk (only if status is 'pending' AND user is clerk)
  const isDeletableByClerk = useMemo(() => {
    return user?.role === 'clerk' && request?.status === "pending";
  }, [request, user]);

  // Determine if the user is an admin for potential admin actions (not implemented in this specific view but useful context)
  const isAdmin = useMemo(() => {
    return user?.role === 'admin'; // Or 'merchant' if merchants also approve
  }, [user]);


  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Assuming a DELETE route for supply requests
      return await axios.delete(`/api/supply-requests/${request?.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Supply Request Deleted",
        description: `Request #${request.id} has been deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["supply_requests"] });
      onClose(); // Close the view modal after deletion
    },
    onError: (error) => {
      console.error("Failed to delete supply request:", error);
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.error || "An error occurred while deleting the request.",
        variant: "destructive",
      });
    },
  });

  // Handle print functionality (placeholder)
  const handlePrint = () => {
    // Implement print logic here, e.g., using a print-friendly component
    // or triggering browser print.
    toast({
      title: "Printing Request",
      description: "Preparing the supply request for printing...",
    });
    console.log("Printing Supply Request:", request);
    // window.print(); // This would print the whole page, consider a dedicated print layout
  };


  // Do not render if no request object is passed
  if (!request) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-xl" aria-describedby="supply-request-description">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Supply Request #{request.id}
            </DialogTitle>
            <DialogDescription id="supply-request-description">
              Details of the requested product and its status.
            </DialogDescription>
          </DialogHeader>

          {/* Supply Request Details */}
          <div className="space-y-3 text-sm py-4">
            <div>
              <strong>Product:</strong>{" "}
              {request.product?.name || "N/A"} ({request.product?.unit || "Unit"})
            </div>
            <div>
              <strong>Requested Quantity:</strong> {request.requested_quantity}
            </div>
            <div>
              <strong>Store:</strong> {request.store?.name || "N/A"}
            </div>
            <div>
              <strong>Requested By:</strong> {request.clerk?.name || "N/A"}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              <span className={`capitalize font-medium
                ${request.status === 'pending' ? 'text-yellow-600' :
                  request.status === 'approved' ? 'text-green-600' :
                  request.status === 'declined' ? 'text-red-600' : 'text-gray-600'}`}
              >
                {request.status}
              </span>
            </div>
            {request.admin && ( // Only show if an admin has responded
              <div>
                <strong>Admin:</strong> {request.admin?.name || "N/A"}
              </div>
            )}
            {request.admin_response && ( // Only show if admin added a comment
              <div>
                <strong>Admin Response:</strong> {request.admin_response}
              </div>
            )}
            <div>
              <strong>Created At:</strong> {formatDate(request.created_at)}
            </div>
            <div>
              <strong>Last Updated:</strong> {formatDate(request.updated_at)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            {/* Only show edit and delete if editable by clerk */}
            {isEditableByClerk && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <PencilLine className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}

            {isDeletableByClerk && (
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Request"}
                <Trash2 className="w-4 h-4 ml-2" />
              </Button>
            )}

            {/* If not editable/deletable, or for admin view, show a simple close button */}
            {!isEditableByClerk && !isDeletableByClerk && (
                <Button onClick={onClose}>
                    Close
                </Button>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Supply Request Modal (conditionally rendered) */}
      {editing && (
        <EditSupplyRequest
          isOpen={editing}
          onClose={() => setEditing(false)}
          request={request} // Pass the current request to the edit modal
          onUpdated={() => { // Assuming EditSupplyRequest has an onUpdated prop
            setEditing(false); // Close edit modal
            onClose(); // Close view modal
            queryClient.invalidateQueries({ queryKey: ["supply_requests"] }); // Refresh data
          }}
        />
      )}
    </>
  );
}