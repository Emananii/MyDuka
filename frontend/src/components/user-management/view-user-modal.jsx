// src/components/user-management/ViewUserModal.jsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Edit, Trash2, ArrowUpDown } from "lucide-react";
import { useUser } from "@/context/UserContext"; // Assuming you have a UserContext for current user info

export default function ViewUserModal({
  user, // The user object to display
  isOpen, // Controls modal visibility
  onClose, // Callback to close the modal
  onEdit, // Callback to trigger edit modal (from parent)
  onDeactivate, // Callback to trigger deactivate dialog (from parent)
  onDelete, // Callback to trigger delete dialog (from parent)
  // isLoadingEdit, // Optional: if you want to show loading state for edit button
  // isLoadingDeactivate, // Optional: if you want to show loading state for deactivate button
  // isLoadingDelete, // Optional: if you want to show loading state for delete button
}) {
  const { user: currentUser } = useUser(); // Get the currently logged-in user

  if (!user) {
    return null; // Don't render if no user data is provided
  }

  // Determine if the current user can perform actions on the target user
  // These conditions should mirror the backend authorization logic for consistency
  const canEdit = 
    (currentUser?.role === "merchant" && user.role !== "merchant") ||
    (currentUser?.role === "admin" && user.role !== "admin" && user.role !== "merchant");

  const canDeactivate = 
    user.is_active && // Can only deactivate if active
    currentUser?.id !== user.id && // Cannot deactivate self
    user.role !== "merchant" && // Merchants cannot be deactivated via this flow
    (currentUser?.role === "merchant" || currentUser?.role === "admin"); // Only merchant/admin can deactivate

  const canDelete = 
    currentUser?.id !== user.id && // Cannot delete self
    user.role !== "merchant" && // Merchants cannot be deleted via this flow
    (currentUser?.role === "merchant" || currentUser?.role === "admin"); // Only merchant/admin can delete


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              User Details: {user.name}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription>
            Detailed information about the user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Name:</span>
            <span>{user.name}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Email:</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Role:</span>
            <span>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Status:</span>
            <span>
              {user.is_active ? (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </span>
          </div>
          {user.store_id && (
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium text-gray-700">Store ID:</span>
              <span>{user.store_id}</span> {/* You might want to display store name here */}
            </div>
          )}
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Created By:</span>
            <span>{user.created_by || "N/A"}</span> {/* Display actual creator name if available */}
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Created At:</span>
            <span>{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
          {canDeactivate && (
            <Button variant="outline" size="sm" onClick={onDeactivate}>
              <ArrowUpDown className="h-4 w-4 mr-2" /> Deactivate
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}