// src/components/user-management/merchant-user-management.jsx
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
import { Search, Plus, Edit, Trash2, ArrowUpDown, Eye } from "lucide-react";

import AddUserModal from "@/components/user-management/add-user-modal";
import EditUserModal from "@/components/user-management/edit-user-modal";
import { ConfirmUserDeleteDialog } from "@/components/user-management/confirm-user-delete-dialog";
import { ConfirmUserDeactivateDialog } from "@/components/user-management/confirm-user-deactivate-dialog";
import ViewUserModal from "@/components/user-management/view-user-modal";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext";

const API_PREFIX = "/api/users";

export default function MerchantUserManagement() {
  const { user: currentUser } = useUser();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Corrected typo: setIsEditModal -> setIsEditModalOpen
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { toast } = useToast();

  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `${BASE_URL}/api/stores/`);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Failed to fetch stores in MerchantUserManagement:", error);
        toast({
          title: "Error fetching stores",
          description: error.message || "Could not load store list.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: currentUser?.role === "merchant" || currentUser?.role === "admin",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const usersRes = await apiRequest("GET", `${BASE_URL}${API_PREFIX}/`);
      const activeUsers = usersRes.filter(user => !user.is_deleted);

      // Ensure stores are loaded and not empty before attempting to map
      if (!isLoadingStores && stores.length > 0) {
        return activeUsers.map(user => {
          const userStore = stores.find(store => store.id === user.store_id);
          return {
            ...user,
            store_name: userStore ? userStore.name : (user.store_id ? `ID: ${user.store_id}` : 'No Store Assigned')
          };
        });
      }
      // If stores are still loading or empty, return users without enriched store_name
      // They will update once stores are loaded.
      return activeUsers.map(user => ({
        ...user,
        store_name: user.store_id ? `ID: ${user.store_id}` : 'Loading Store...'
      }));
    },
    enabled: !isLoadingStores, // Query for users is enabled once stores are no longer loading
  });


  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      // Corrected API endpoint for creating a user
      const response = await apiRequest("POST", `${BASE_URL}${API_PREFIX}/create`, userData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["stores-list"] }); // Invalidate stores too if a new user might affect store data (e.g., if a user is tied to a new store that wasn't previously fetched)
      toast({
        title: "User added successfully!",
        // Correctly access nested user data from the API response
        description: `${data.user.name} (${data.user.role}) has been created.`,
        variant: "success",
      });
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add user",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }) => {
      const response = await apiRequest("PATCH", `${BASE_URL}${API_PREFIX}/${id}`, userData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["stores-list"] });
      toast({
        title: "User updated successfully!",
        description: `${data.name}'s details have been updated.`,
        variant: "success",
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setIsViewModalOpen(false);
      setSelectedUserForView(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update user",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["stores-list"] });
      toast({ title: "User deleted successfully" });
      setConfirmDeleteId(null);
      setSelectedUser(null);
      setSelectedUserForView(null);
      setIsViewModalOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => apiRequest("PATCH", `${BASE_URL}${API_PREFIX}/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["stores-list"] });
      toast({ title: "User deactivated successfully" });
      setConfirmDeactivateId(null);
      setSelectedUser(null);
      setSelectedUserForView(null);
      setIsViewModalOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate user", variant: "destructive" });
    },
  });

  const handleEditFromView = () => {
    setIsViewModalOpen(false);
    setSelectedUser(selectedUserForView);
    setIsEditModalOpen(true);
  };

  const handleDeleteFromView = () => {
    setIsViewModalOpen(false);
    setConfirmDeleteId(selectedUserForView.id);
  };

  const handleDeactivateFromView = () => {
    setIsViewModalOpen(false);
    setConfirmDeactivateId(selectedUserForView.id);
  };

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

  const canPerformActions = (targetUser) => {
    if (!currentUser || !targetUser) return false;
    if (currentUser.id === targetUser.id) return false;

    if (currentUser.role === "merchant") {
      return targetUser.role !== "merchant";
    }
    if (currentUser.role === "admin") {
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isLoadingStores ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading users and stores...
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
                                setSelectedUser(user);
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

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        createUserMutation={createUserMutation}
        currentUser={currentUser}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        editUserMutation={editUserMutation}
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