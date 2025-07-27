// merchant-user-management.jsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Search, Plus, Edit, Trash2, ArrowUpDown, Eye } from "lucide-react"; // Added Eye icon for view button

import AddUserModal from "@/components/user-management/add-user-modal";
import EditUserModal from "@/components/user-management/edit-user-modal";
import { ConfirmUserDeleteDialog } from "@/components/user-management/confirm-user-delete-dialog";
import { ConfirmUserDeactivateDialog } from "@/components/user-management/confirm-user-deactivate-dialog";
import ViewUserModal from "@/components/user-management/view-user-modal";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext"; // Import useUser

// Define the base API prefix for user operations (no trailing slash here)
const API_PREFIX = "/api/users";

export default function MerchantUserManagement() {
  const { user: currentUser } = useUser(); // Get current user for permissions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // For Edit Modal

  // State for View User Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiRequest("GET", `${BASE_URL}${API_PREFIX}/`);
      // Frontend filtering for `is_deleted` users (backend should also filter or provide options)
      return res.filter(user => !user.is_deleted);
    },
  });

  // Mutation for deleting a user
  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deleted successfully" });
      setConfirmDeleteId(null);
      setSelectedUser(null); // Clear selected user after action
      setSelectedUserForView(null); // Clear selected user for view modal
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  // Mutation for deactivating a user
  const deactivateMutation = useMutation({
    mutationFn: (id) => apiRequest("PATCH", `${BASE_URL}${API_PREFIX}/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "User deactivated successfully" });
      setConfirmDeactivateId(null);
      setSelectedUser(null); // Clear selected user after action
      setSelectedUserForView(null); // Clear selected user for view modal
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  const handleSort = (field) => {
    // Optional: implement sort handling if needed
  };

  const filteredUsers = users.filter((user) => {
    const nameMatches = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const emailMatches = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;

    const matchesSearch = nameMatches || emailMatches;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const userBeingDeactivated = users.find((u) => u.id === confirmDeactivateId);
  const userBeingDeleted = users.find((u) => u.id === confirmDeleteId);

  // Helper function to determine if the current user can perform actions on target user
  const canPerformActions = (targetUser) => {
    if (!currentUser || !targetUser) return false;
    if (currentUser.id === targetUser.id) return false; // Cannot modify self

    if (currentUser.role === "merchant") {
      // Merchant can manage any user except other merchants
      return targetUser.role !== "merchant";
    }
    if (currentUser.role === "admin") {
      // Admin can manage cashier, clerk, user within their own store, but not other admins or merchants
      return (
        targetUser.role !== "admin" &&
        targetUser.role !== "merchant" &&
        currentUser.store_id === targetUser.store_id
      );
    }
    return false;
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">User Management</h1>
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
                <SelectItem value="admin">Store Admin</SelectItem>
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
                <TableHead className="text-right">Actions</TableHead> {/* Actions column */}
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
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    // ⭐ Keep row click to open ViewUserModal ⭐
                    onClick={() => {
                      setSelectedUserForView(user);
                      setIsViewModalOpen(true);
                    }}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    {/* ⭐ RE-ADDED individual action buttons to table row ⭐ */}
                    <TableCell className="text-right space-x-2">
                        {/* View Button (optional, as row click already does this) */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { // Stop propagation for button click
                                e.stopPropagation();
                                setSelectedUserForView(user);
                                setIsViewModalOpen(true);
                            }}
                            title="View Details"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        {/* Edit Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { // Stop propagation for button click
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsEditModalOpen(true);
                            }}
                            disabled={!canPerformActions(user)} // Disable based on permission
                            title={canPerformActions(user) ? "Edit User" : "Unauthorized to edit"}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>

                        {/* Deactivate Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { // Stop propagation for button click
                                e.stopPropagation();
                                setConfirmDeactivateId(user.id);
                            }}
                            disabled={!user.is_active || !canPerformActions(user)} // Disable if inactive or unauthorized
                            title={!user.is_active ? "Already inactive" : (canPerformActions(user) ? "Deactivate User" : "Unauthorized to deactivate")}
                        >
                            <ArrowUpDown className="h-4 w-4" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => { // Stop propagation for button click
                                e.stopPropagation();
                                setConfirmDeleteId(user.id);
                            }}
                            disabled={user.is_deleted || !canPerformActions(user)} // Disable if deleted or unauthorized
                            title={user.is_deleted ? "Already deleted" : (canPerformActions(user) ? "Delete User" : "Unauthorized to delete")}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- MODAL CALLS --- */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
      />

      {/* View User Modal: Still exists, opened by row click */}
      <ViewUserModal
        user={selectedUserForView}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUserForView(null);
        }}
        // Removed onEdit/onDeactivate/onDelete props from here, as actions are now on table row
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
