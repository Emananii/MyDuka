// src/pages/user-management/store-admin-user-management.jsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Search, Plus, Edit, Trash2, ArrowUpDown, Eye } from "lucide-react";

import AddUserModal from "@/components/user-management/add-user-modal";
import EditUserModal from "@/components/user-management/edit-user-modal";
import { ConfirmUserDeleteDialog } from "@/components/user-management/confirm-user-delete-dialog";
import { ConfirmUserDeactivateDialog } from "@/components/user-management/confirm-user-deactivate-dialog";
import ViewUserModal from "@/components/user-management/view-user-modal";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext";

// Import userRoleEnum from your shared schema for consistency
import { userRoleEnum } from "@/shared/schema";

// --- Zod Schema for User Forms (adjusted for Admin's scope) ---
// Note: Store Admin can only create/edit Cashier, Clerk roles
const storeAdminManagedUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long").optional(),
  role: userRoleEnum.refine( // Use shared enum but refine allowed values
    // ⭐ FIX: Removed 'user' from allowed roles for Store Admin to manage ⭐
    (role) => ["cashier", "clerk"].includes(role),
    { message: "Store Admin can only assign Cashier or Clerk roles." }
  ),
  store_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});


export default function StoreAdminUserManagement() {
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedUserForView, setSelectedUserForView] = useState(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["store-users", currentUser?.store_id],
    queryFn: async () => {
      if (!currentUser?.store_id) {
        return [];
      }
      const res = await apiRequest("GET", `${BASE_URL}/api/users/stores/${currentUser.store_id}/users`);
      return Array.isArray(res) ? res : [];
    },
    enabled: !!currentUser?.store_id,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        store_id: currentUser.store_id,
      };
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

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      payload.store_id = currentUser.store_id;
      
      return apiRequest("PUT", `${BASE_URL}/api/users/${selectedUserForEdit.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User updated successfully" });
      setIsEditModalOpen(false);
      setSelectedUserForEdit(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User deleted successfully" });
      setConfirmDeleteId(null);
      setIsViewModalOpen(false);
      setSelectedUserForView(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiRequest("PATCH", `${BASE_URL}/api/users/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-users", currentUser.store_id] });
      toast({ title: "Success", description: "User deactivated successfully" });
      setConfirmDeactivateId(null);
      setIsViewModalOpen(false);
      setSelectedUserForView(null);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  const canPerformActions = (targetUser) => {
    if (!currentUser || !targetUser) return false;
    if (currentUser.id === targetUser.id) return false;

    if (currentUser.role === "admin") {
      if (currentUser.store_id !== targetUser.store_id) {
        return false;
      }
      if (targetUser.role === "merchant" || targetUser.role === "admin") {
        return false;
      }
      // ⭐ FIX: Only allow actions on 'cashier' and 'clerk' roles ⭐
      if (targetUser.role === "cashier" || targetUser.role === "clerk") {
        return true;
      }
    }
    return false;
  };


  const filteredUsers = users.filter((user) => {
    const nameMatches = user.name ? user.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const emailMatches = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;

    const matchesSearch = nameMatches || emailMatches;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    // ⭐ FIX: Exclude 'user' role from display if it's no longer managed ⭐
    const isAllowedRoleForDisplay = user.role !== "merchant" && user.role !== "admin" && user.role !== "user";

    return matchesSearch && matchesRole && isAllowedRoleForDisplay;
  });

  const userBeingDeactivated = users.find((u) => u.id === confirmDeactivateId);
  const userBeingDeleted = users.find((u) => u.id === confirmDeleteId);

  const handleEditFromView = () => {
    if (selectedUserForView) {
      setSelectedUserForEdit(selectedUserForView);
      setIsEditModalOpen(true);
      setIsViewModalOpen(false);
    }
  };

  const handleDeactivateFromView = () => {
    if (selectedUserForView) {
      setConfirmDeactivateId(selectedUserForView.id);
      setIsViewModalOpen(false);
    }
  };

  const handleDeleteFromView = () => {
    if (selectedUserForView) {
      setConfirmDeleteId(selectedUserForView.id);
      setIsViewModalOpen(false);
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
                {/* Removed 'user' from role filter options */}
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
                    <TableCell className="text-right space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserForView(user);
                                setIsViewModalOpen(true);
                            }}
                            title="View Details"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserForEdit(user);
                                setIsEditModalOpen(true);
                            }}
                            disabled={!canPerformActions(user)}
                            title={canPerformActions(user) ? "Edit User" : "Unauthorized to edit"}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeactivateId(user.id);
                            }}
                            disabled={!user.is_active || !canPerformActions(user)}
                            title={!user.is_active ? "Already inactive" : (canPerformActions(user) ? "Deactivate User" : "Unauthorized to deactivate")}
                        >
                            <ArrowUpDown className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(user.id);
                            }}
                            disabled={user.is_deleted || !canPerformActions(user)}
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

      {/* Modals and Dialogs */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        createUserMutation={createUserMutation}
        currentUser={currentUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUserForEdit}
        editUserMutation={updateUserMutation}
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