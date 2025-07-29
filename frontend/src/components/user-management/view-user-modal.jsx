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
import { useUser } from "@/context/UserContext";

export default function ViewUserModal({
  user,
  isOpen,
  onClose,
  onEdit,
  onDeactivate,
  onDelete,
}) {
  const { user: currentUser } = useUser();

  if (!user) {
    return null;
  }

  const canEdit =
    (currentUser?.role === "merchant" && user.role !== "merchant") ||
    (currentUser?.role === "admin" && user.role !== "admin" && user.role !== "merchant");

  const canDeactivate =
    user.is_active &&
    currentUser?.id !== user.id &&
    user.role !== "merchant" &&
    (currentUser?.role === "merchant" || currentUser?.role === "admin");

  const canDelete =
    currentUser?.id !== user.id &&
    user.role !== "merchant" &&
    (currentUser?.role === "merchant" || currentUser?.role === "admin");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              User Details: {user.name}
            </DialogTitle>
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
          {/* ⭐ MODIFIED: Display store name using user.store_name ⭐ */}
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Store:</span>
            <span>{user.store_name || 'No Store Assigned'}</span>
          </div>
          {/* END MODIFIED */}
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-medium text-gray-700">Created By:</span>
            <span>{user.created_by || "N/A"}</span>
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