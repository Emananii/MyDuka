// components/user-management/UserTable.jsx
import React, { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  PlusCircle, 
  Search, 
  Mail, 
  Users,
  UserPlus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import AddUserModal from "./add-user-modal";
import EditUserModal from "./edit-user-modal";
import ConfirmDeactivateUserDialog from './confirm-user-deactivate-dialog';
import ConfirmUserDeleteDialog from './confirm-user-delete-dialog';
import PendingInvitationsTable from './pending-invitations-table';

export default function UserTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useUser();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // States for confirmation dialogs
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToActOn, setUserToActOn] = useState(null);

  // Check if current user can send invitations (only merchants can)
  const canSendInvitations = currentUser?.role === "merchant";

  // Fetch users data
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [`${BASE_URL}/users`, pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      const response = await apiRequest("GET", `${BASE_URL}/users`);
      return response;
    },
    select: (data) => {
      // Filter out deleted users for display
      return data.filter(user => !user.is_deleted);
    }
  });

  // Fetch pending invitations count for tab badge
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ["pendingInvitations"],
    queryFn: async () => {
      if (!canSendInvitations) return [];
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/invitations/pending", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) return [];
        return response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: canSendInvitations,
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId) => {
      return apiRequest("PATCH", `${BASE_URL}/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/users`] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
      setIsDeactivateConfirmOpen(false);
      setUserToActOn(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
      setIsDeactivateConfirmOpen(false);
      setUserToActOn(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return apiRequest("DELETE", `${BASE_URL}/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/users`] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setIsDeleteConfirmOpen(false);
      setUserToActOn(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
      setIsDeleteConfirmOpen(false);
      setUserToActOn(null);
    },
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleDeactivateClick = (user) => {
    setUserToActOn(user);
    setIsDeactivateConfirmOpen(true);
  };

  const handleDeleteClick = (user) => {
    setUserToActOn(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleInviteAdmin = () => {
    setIsAddUserModalOpen(true);
    // The modal will handle switching to the invite tab
  };

  // Column Definitions for TanStack Table
  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
      },
      {
        accessorKey: "role",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Role
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <div className="capitalize">{row.getValue("role")}</div>,
      },
      {
        accessorKey: "store_id",
        header: "Store ID",
        cell: ({ row }) => {
          const storeId = row.getValue("store_id");
          return <div>{storeId || "N/A"}</div>;
        },
      },
      {
        accessorKey: "is_active",
        header: "Active",
        cell: ({ row }) => (
          <div>{row.getValue("is_active") ? "Yes" : "No"}</div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const user = row.original;
          const isCurrentUser = currentUser?.id === user.id;

          const canPerformActions = () => {
            if (isCurrentUser) return false;
            if (currentUser?.role === "merchant") {
              return user.role !== "merchant";
            }
            if (currentUser?.role === "admin") {
              return (
                user.role !== "admin" &&
                user.role !== "merchant" &&
                currentUser.store_id &&
                user.store_id === currentUser.store_id
              );
            }
            return false;
          };

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => console.log("View user", user.id)}>
                  View User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canPerformActions() ? (
                  <>
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      Edit User
                    </DropdownMenuItem>
                    {user.is_active ? (
                      <DropdownMenuItem onClick={() => handleDeactivateClick(user)}>
                        Deactivate User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                         onClick={() => {
                             toast({
                                 title: "Info",
                                 description: "User activation functionality not yet implemented.",
                             });
                             console.log("Activate user", user.id);
                         }}
                      >
                         Activate User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(user)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Delete User (Soft)
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled>
                    {isCurrentUser ? "Cannot modify your own account" : "Unauthorized to perform actions"}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currentUser, toast]
  );

  const table = useReactTable({
    data: users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onPaginationChange: setPagination,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading users...</span>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-red-600">
            <p className="text-lg font-semibold mb-2">Error Loading Users</p>
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage users and admin invitations for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canSendInvitations && (
            <Button variant="outline" onClick={handleInviteAdmin}>
              <Mail className="mr-2 h-4 w-4" />
              Invite Admin
            </Button>
          )}
          <Button onClick={() => setIsAddUserModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Users
            {users && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                {users.length}
              </span>
            )}
          </TabsTrigger>
          {canSendInvitations && (
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
              {pendingInvitations.length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-xs">
                  {pendingInvitations.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Users Tab Content */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Users
              </CardTitle>
              <CardDescription>
                View and manage all active users in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search and Controls */}
              <div className="flex items-center py-4 justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={globalFilter ?? ""}
                      onChange={(event) => setGlobalFilter(event.target.value)}
                      className="pl-8 max-w-sm"
                    />
                  </div>
                  {globalFilter && (
                    <Button onClick={() => setGlobalFilter("")} variant="outline" size="sm">
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No users found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {table.getRowModel().rows.length} of {users?.length || 0} users
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invitations Tab Content */}
        {canSendInvitations && (
          <TabsContent value="invitations" className="space-y-4">
            <PendingInvitationsTable />
          </TabsContent>
        )}
      </Tabs>

      {/* Modals and Dialogs */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
      />
      
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <ConfirmDeactivateUserDialog
        isOpen={isDeactivateConfirmOpen}
        onClose={() => {
          setIsDeactivateConfirmOpen(false);
          setUserToActOn(null);
        }}
        onConfirm={() => deactivateUserMutation.mutate(userToActOn.id)}
        user={userToActOn}
        isPending={deactivateUserMutation.isPending}
      />

      <ConfirmUserDeleteDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setUserToActOn(null);
        }}
        onConfirm={() => deleteUserMutation.mutate(userToActOn.id)}
        user={userToActOn}
        isPending={deleteUserMutation.isPending}
      />
    </div>
  );
}