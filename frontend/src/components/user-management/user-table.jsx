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
} from "@/components/ui/table"; // <--- UPDATED IMPORT PATH
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
import { ArrowUpDown, MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import AddUserModal from "./add-user-modal"; // Adjust path if needed
import EditUserModal from "./edit-user-modal"; // Assume you'll create this

// Assuming you'll also create these confirm dialogs
import ConfirmDeactivateUserDialog from './confirm-user-deactivate-dialog';
import ConfirmUserDeleteDialog from './confirm-user-delete-dialog';


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

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // States for confirmation dialogs
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToActOn, setUserToActOn] = useState(null);


  // Fetch users data
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [`${BASE_URL}/users`, pagination, sorting, columnFilters, globalFilter],
    queryFn: async () => {
      // In a real application with many users, you'd pass pagination, sorting,
      // and filter parameters to your backend API for server-side processing.
      const response = await apiRequest("GET", `${BASE_URL}/users`);
      return response;
    },
    select: (data) => {
      // Filter out deleted users for display
      return data.filter(user => !user.is_deleted);
    }
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
      setIsDeactivateConfirmOpen(false); // Close dialog on success
      setUserToActOn(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
      setIsDeactivateConfirmOpen(false); // Close dialog on error
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
      setIsDeleteConfirmOpen(false); // Close dialog on success
      setUserToActOn(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
      setIsDeleteConfirmOpen(false); // Close dialog on error
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
          // You might fetch store names separately and map them here
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

          // Determine if the current user can perform actions on the target user
          const canPerformActions = () => {
            if (isCurrentUser) return false; // Cannot modify self via this table
            if (currentUser?.role === "merchant") {
              // Merchant can deactivate/delete all non-merchant users
              return user.role !== "merchant";
            }
            if (currentUser?.role === "admin") {
              // Admin can deactivate/delete cashier, clerk, user within their store
              return (
                user.role !== "admin" && // Cannot deactivate/delete another admin
                user.role !== "merchant" && // Cannot deactivate/delete a merchant
                currentUser.store_id && // Current admin must be assigned to a store
                user.store_id === currentUser.store_id // Target user must be in the same store
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
                {/* View User (if you have a view modal/page) */}
                <DropdownMenuItem onClick={() => console.log("View user", user.id)}>
                  View User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canPerformActions() ? (
                  <>
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      Edit User
                    </DropdownMenuItem>
                    {user.is_active ? ( // Show deactivate if active
                      <DropdownMenuItem onClick={() => handleDeactivateClick(user)}>
                        Deactivate User
                      </DropdownMenuItem>
                    ) : ( // Show activate if inactive
                      <DropdownMenuItem
                         onClick={() => {
                             // Implement activation logic here if needed
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
    [currentUser, toast] // Dependencies: currentUser and toast
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
    return <div className="text-center py-8">Loading users...</div>;
  }

  if (isError) {
    return <div className="text-center py-8 text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4 justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search users..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => setGlobalFilter("")} variant="outline" className={globalFilter ? "" : "hidden"}>
            Clear Search
          </Button>
        </div>
        <Button onClick={() => setIsAddUserModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
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

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
      />
      {/* Assuming you will implement EditUserModal */}
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      {/* Confirmation Dialogs */}
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