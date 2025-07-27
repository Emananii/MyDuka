// src/pages/user-management/store-admin-user-management.jsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query"; // Removed useQueryClient as it's not directly needed here for invalidateQueries
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";

// Import all necessary modals and dialogs
import AddUserModal from "@/components/user-management/add-user-modal";
import EditUserModal from "@/components/user-management/edit-user-modal";
import { ConfirmUserDeleteDialog } from "@/components/user-management/confirm-user-delete-dialog";
import { ConfirmUserDeactivateDialog } from "@/components/user-management/confirm-user-deactivate-dialog";
import ViewUserModal from "@/components/user-management/view-user-modal";

import { apiRequest, queryClient } from "@/lib/queryClient"; // Ensure queryClient is imported
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext"; // Assuming currentUser comes from context

// Import userRoleEnum from your shared schema for consistency
import { userRoleEnum } from "@/shared/schema";

// --- Zod Schema for User Forms (adjusted for Admin's scope) ---
// Note: Store Admin can only create/edit Cashier, Clerk, User roles
const storeAdminUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(), // Optional for edit
  role: userRoleEnum.refine(
    (role) => ["cashier", "clerk", "user"].includes(role),
    { message: "Store Admin can only assign Cashier, Clerk, or User roles." }
  ),
  store_id: z.number().int().positive().nullable().optional(), // Store Admin's users are tied to their store
  is_active: z.boolean().optional(), // For editing status
});


export default function StoreAdminUserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useUser(); // Get current logged-in user (Store Admin)

  // State for modal visibility and selected users
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // User object for View and Edit modals
  const [selectedUserForView, setSelectedUserForView] = useState(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  // IDs for confirmation dialogs
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch users for the current store admin's store
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["store-users", currentUser?.store_id], // Query key includes store_id
    queryFn: async () => {
      if (!currentUser?.store_id) {
        // If admin is not assigned to a store, they shouldn't see users
        return [];
      }
      // Assuming backend endpoint for store-specific users is /api/stores/{store_id}/users
      const res = await apiRequest("GET", `${BASE_URL}/api/stores/${currentUser.store_id}/users`);
      // Backend should return an array of users directly
      return Array.isArray(res) ? res : [];
    },
    enabled: !!currentUser?.store_id, // Only enable query if currentUser and store_id exist
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        // Ensure store_id is correctly set for users created by this admin
        store_id: currentUser.store_id,
        // Backend should handle created_by based on JWT
      };
      // Endpoint for creating users (used by AddUserModal)
      return apiRequest("POST", `${BASE_URL}/api/users/create`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User added successfully" });
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to add user", variant: "destructive" });
    },
  });

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        // Ensure store_id is correctly parsed if it's coming from a select
        store_id: data.store_id === "null" ? null : parseInt(data.store_id, 10),
      };
      // Endpoint for updating users (used by EditUserModal)
      return apiRequest("PUT", `${BASE_URL}/api/users/${selectedUserForEdit.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User updated successfully" });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User deleted successfully" });
      setConfirmDeleteId(null);
      setIsViewModalOpen(false); // Close view modal after delete
      setSelectedUserForView(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  // Deactivate User Mutation
  const deactivateMutation = useMutation({
    mutationFn: (id) => apiRequest("PATCH", `${BASE_URL}/api/users/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User deactivated successfully" });
      setConfirmDeactivateId(null);
      setIsViewModalOpen(false); // Close view modal after deactivate
      setSelectedUserForView(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  // Filter users based on search term and role filter
  const filteredUsers = users.filter((user) => {
    const nameMatches = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const emailMatches = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;

    const matchesSearch = nameMatches || emailMatches;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    // ⭐ IMPORTANT: Store Admin should not see other Store Admins or Merchants in their list
    // This is a frontend filtering, backend should also enforce this.
    const isAllowedRole = user.role !== "merchant" && user.role !== "admin";

    return matchesSearch && matchesRole && isAllowedRole;
  });

  // Find user for confirmation dialogs
  const userBeingDeactivated = users.find((u) => u.id === confirmDeactivateId);
  const userBeingDeleted = users.find((u) => u.id === confirmDeleteId);

  // Handlers for actions from ViewUserModal
  const handleEditFromView = () => {
    if (selectedUserForView) {
      setSelectedUserForEdit(selectedUserForView); // Set user for Edit Modal
      setIsEditModalOpen(true); // Open Edit Modal
      setIsViewModalOpen(false); // Close View Modal
    }
  };

  const handleDeactivateFromView = () => {
    if (selectedUserForView) {
      setConfirmDeactivateId(selectedUserForView.id); // Set ID for Deactivate Dialog
      setIsViewModalOpen(false); // Close View Modal
    }
  };

  const handleDeleteFromView = () => {
    if (selectedUserForView) {
      setConfirmDeleteId(selectedUserForView.id); // Set ID for Delete Dialog
      setIsViewModalOpen(false); // Close View Modal
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Store Users</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="clerk">Clerk</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No users found for this store.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    onClick={() => {
                      setSelectedUserForView(user);
                      setIsViewModalOpen(true);
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-gray-500 text-sm">Click to view actions</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals and Dialogs */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        // Pass the mutation function for creating users
        createUserMutation={createUserMutation}
        // Pass the current user to help with default store_id and allowed roles
        currentUser={currentUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUserForEdit} // Pass the user selected for editing
        // Pass the mutation function for updating users
        updateUserMutation={updateUserMutation}
        // Pass the current user to help with allowed roles and store_id logic
        currentUser={currentUser}
      />

      <ViewUserModal
        user={selectedUserForView}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUserForView(null);
        }}
        onEdit={handleEditFromView}
        onDeactivate={handleDeactivateFromView}
        onDelete={handleDeleteFromView}
        // Pass current user to ViewUserModal for authorization logic within it
        currentUser={currentUser}
      />

      <ConfirmUserDeleteDialog
        isOpen={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(confirmDeleteId)}
        userName={userBeingDeleted?.name || "this user"}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmUserDeactivateDialog
        isOpen={Boolean(confirmDeactivateId)}
        onClose={() => setConfirmDeactivateId(null)}
        onConfirm={() => deactivateMutation.mutate(confirmDeactivateId)}
        userName={userBeingDeactivated?.name || "this user"}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
