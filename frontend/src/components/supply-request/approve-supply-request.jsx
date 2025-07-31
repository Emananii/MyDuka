import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PropTypes from "prop-types"; // Import PropTypes
import { useToast } from "@/hooks/use-toast";
import axios from "@/utils/axios"; // Your configured axios instance

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react"; // Import Loader2 for loading spinner
import { useUser } from "@/context/UserContext"; // Import useUser to get the current user

// Helper function to format dates (re-used for consistency)
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

export function ApproveSupplyRequest({ isOpen, onClose, request }) {
  const [adminResponse, setAdminResponse] = useState("");
  const { toast } = useToast();
  const { user } = useUser(); // Get the current user from context
  const queryClient = useQueryClient();

  // Reset adminResponse when a new request is passed or modal opens
  useEffect(() => {
    if (isOpen && request) {
      // Pre-fill if there's an existing admin_response (e.g., if re-opening a previously declined/approved request for view)
      setAdminResponse(request.admin_response || "");
    }
  }, [isOpen, request]);

  // Determine if the request is still pending
  const isPendingStatus = request?.status === "pending";

  // Mutation for approving/declining the request
  const responseMutation = useMutation({
    mutationFn: async ({ action, comment, adminId }) => { // Added adminId to mutationFn arguments
      // Ensure we have the necessary IDs
      if (!request || !request.id) { // Removed store_id from check as it's no longer in URL path
        throw new Error("Invalid request or missing request ID for response.");
      }
      // CORRECTED BACKEND ROUTE: PATCH /api/supply-requests/<int:request_id>/respond
      return await axios.patch(
        `/api/supply-requests/${request.id}/respond`, // Corrected URL
        {
          action, // 'approve' or 'decline'
          comment,
          admin_id: adminId, // Pass admin_id in the payload as expected by backend
        }
      );
    },
    onSuccess: (data, variables) => {
      toast({
        title: `Supply Request ${variables.action}d`,
        description: data.message || `Request #${request.id} has been ${variables.action}d.`,
      });
      // Invalidate queries to refetch the list of supply requests for both admin and clerk views
      queryClient.invalidateQueries({ queryKey: ["admin_supply_requests"] });
      queryClient.invalidateQueries({ queryKey: ["clerk_supply_requests"] });
      onClose(); // Close the modal
    },
    onError: (error, variables) => {
      console.error(`Failed to ${variables.action} supply request:`, error);
      toast({
        variant: "destructive",
        title: `Failed to ${variables.action} Request`,
        description: error.response?.data?.error || "An unexpected error occurred. Please try again.",
      });
    },
  });

  // Handlers for Approve and Decline buttons
  const handleApprove = () => {
    // Ensure user is defined and has an ID
    if (!user || !user.id) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Admin user ID not found. Please log in again.",
      });
      return;
    }
    responseMutation.mutate({ action: "approve", comment: adminResponse, adminId: user.id });
  };

  const handleDecline = () => {
    // Ensure user is defined and has an ID
    if (!user || !user.id) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Admin user ID not found. Please log in again.",
      });
      return;
    }
    responseMutation.mutate({ action: "decline", comment: adminResponse, adminId: user.id });
  };

  // Do not render the modal content if no request object is provided
  if (!request) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Respond to Supply Request #{request.id}</DialogTitle>
          <DialogDescription>
            Review the request details below and decide to approve or decline.
          </DialogDescription>
        </DialogHeader>

        {/* Request Details Section */}
        <div className="py-4 space-y-3 text-sm">
          <div>
            <Label className="font-semibold">Product:</Label>{" "}
            {request.product?.name || "N/A"} (
            {request.product?.unit || "Unit"})
          </div>
          <div>
            <Label className="font-semibold">Requested Quantity:</Label>{" "}
            {request.requested_quantity}
          </div>
          <div>
            <Label className="font-semibold">Store:</Label>{" "}
            {request.store?.name || "N/A"}
          </div>
          <div>
            <Label className="font-semibold">Requested By Clerk:</Label>{" "}
            {/* Display clerk's email as per backend serialization */}
            {request.clerk?.email || "N/A"}
          </div>
          <div>
            <Label className="font-semibold">Status:</Label>
            <Badge
              className={`capitalize ml-2 ${
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
          <div>
            <Label className="font-semibold">Requested On:</Label>{" "}
            {formatDate(request.created_at)}
          </div>

          {/* Admin Response/Comment Section */}
          {isPendingStatus ? ( // Use isPendingStatus to check if it's pending
            // Show editable textarea if status is pending
            <div>
              <Label htmlFor="adminResponse" className="font-semibold">
                Admin Comment (Optional)
              </Label>
              <Textarea
                id="adminResponse"
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Add a comment regarding your decision..."
                className="mt-1"
                disabled={responseMutation.isPending} // Disable while submitting
              />
            </div>
          ) : (
            // Show read-only admin response if not pending
            <>
              <div>
                <Label className="font-semibold">Admin Response:</Label>{" "}
                {request.admin_response || "No comment provided."}
              </div>
              {request.admin && (
                <div>
                  <Label className="font-semibold">Responded By:</Label>{" "}
                  {/* Display admin's email as per backend serialization */}
                  {request.admin.email || "N/A"}
                </div>
              )}
              <div>
                <Label className="font-semibold">Responded On:</Label>{" "}
                {formatDate(request.updated_at)} {/* Updated_at for response time */}
              </div>
            </>
          )}
        </div>

        {/* Dialog Footer with Action Buttons */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={responseMutation.isPending}
          >
            {isPendingStatus ? "Cancel" : "Close"}
          </Button>
          {isPendingStatus && ( // Only show Approve/Decline buttons if the request is still pending
            <>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={responseMutation.isPending}
              >
                {responseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Declining...
                  </>
                ) : (
                  "Decline"
                )}
              </Button>
              <Button onClick={handleApprove} disabled={responseMutation.isPending}>
                {responseMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

ApproveSupplyRequest.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  request: PropTypes.object.isRequired,
  // onSuccess is removed from propTypes as it's not directly used in this version
  // but the query invalidation handles the refresh.
};
