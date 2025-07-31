import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { userRoleEnum } from "@/shared/schema";


// --- Zod Schema for Add User Form ---
const addUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: userRoleEnum.refine( // Use shared enum and refine for AddUserModal scope
    // ⭐ FIX: Removed 'user' from allowed creation roles for Store Admin/Clerk ⭐
    (role) => ["admin", "clerk", "cashier"].includes(role), // 'admin' is for Merchant to create. 'clerk','cashier' for Admin/Clerk
    { message: "Invalid role selected for creation." }
  ),
  store_id: z.union([z.number().int().positive(), z.literal(null)]).nullable().optional(), 
});

export default function AddUserModal({ isOpen, onClose, createUserMutation, currentUser }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "", 
      store_id: currentUser?.role === "admin" || currentUser?.role === "clerk" 
                  ? currentUser?.store_id || null 
                  : null,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: "",
        email: "",
        password: "",
        role: "",
        store_id: currentUser?.role === "admin" || currentUser?.role === "clerk" 
                    ? currentUser?.store_id || null 
                    : null,
      });
    }
  }, [isOpen, form, currentUser]);


  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores-list"], 
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `${BASE_URL}/api/stores/`); 
        return Array.isArray(response) ? response : []; 
      } catch (error) {
        console.error("Failed to fetch stores:", error);
        toast({
          title: "Error fetching stores",
          description: error.message || "Could not load store list.",
          variant: "destructive",
        });
        return []; 
      }
    },
    enabled: currentUser?.role === "merchant" && isOpen, 
  });


  const onSubmit = (data) => {
    const payload = {
      ...data,
      store_id: currentUser?.role === "admin" || currentUser?.role === "clerk"
                  ? currentUser.store_id 
                  : (data.store_id === "null" ? null : parseInt(data.store_id, 10)),
      password: data.password || undefined,
    };
    createUserMutation.mutate(payload); 
  };

  const getAllowedRoles = () => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "merchant":
        // ⭐ FIX: Removed 'user' from allowed creation roles for merchant ⭐
        return ["admin", "clerk", "cashier"];
      case "admin": 
        // ⭐ FIX: Removed 'user' from allowed creation roles for admin ⭐
        return ["clerk", "cashier"];
      case "clerk": 
        // ⭐ FIX: Removed 'user' from allowed creation roles for clerk ⭐
        return ["cashier"];
      default:
        return [];
    }
  };

  const allowedRoles = getAllowedRoles();
  const selectedRole = form.watch("role"); 

  const showStoreSelect = currentUser?.role === "merchant";

  const isStoreSelectDisabled = isLoadingStores || currentUser?.role === "admin" || currentUser?.role === "clerk";


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Add New User
            </DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* User Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter user's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter user's email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""} 
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedRoles.length > 0 ? (
                        allowedRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No roles available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Store ID selection (Conditional for Merchant, hidden for Admin/Clerk) */}
            {showStoreSelect && (
              <FormField
                control={form.control}
                name="store_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "null" ? null : parseInt(value, 10))
                      }
                      value={field.value !== null ? String(field.value) : "null"}
                      disabled={isStoreSelectDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingStores ? (
                          <SelectItem value="null" disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading stores...
                          </SelectItem>
                        ) : stores && stores.length > 0 ? (
                          <>
                            {/* Option to unassign store only for Merchant */}
                            {currentUser?.role === "merchant" && (
                              <SelectItem value="null">No Store Assigned</SelectItem>
                            )}
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={String(store.id)}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          <SelectItem value="null" disabled>
                            No stores available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Adding..." : "Add User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
