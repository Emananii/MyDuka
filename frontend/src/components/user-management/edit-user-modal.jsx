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
import { Switch } from "@/components/ui/switch"; 
import { X, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; 
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { userRoleEnum } from "@/shared/schema";


// --- Zod Schema for Edit User Form ---
const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  role: userRoleEnum.refine(
    (role) => ["merchant", "admin", "clerk", "cashier"].includes(role),
    { message: "Invalid role selected." }
  ).optional(), 
  store_id: z.union([z.number().int().positive(), z.literal(null)]).nullable().optional(),
  is_active: z.boolean().optional(),
});

export default function EditUserModal({ user, isOpen, onClose, editUserMutation, currentUser }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "", 
      store_id: null,
      is_active: true,
    },
  });

  useEffect(() => {
    if (user && isOpen) { 
      form.reset({
        name: user.name || "",
        email: user.email || "",
        role: user.role ? user.role.toLowerCase() : "", 
        store_id: user.store_id || null, 
        is_active: user.is_active ?? true, 
      });
    }
  }, [user, isOpen, form]); 

  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores-list"], 
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `${BASE_URL}/api/store/`); 
        return Array.isArray(response) ? response : []; 
      } catch (error) {
        console.error("Failed to fetch stores in EditUserModal:", error);
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
    // Ensure we send only defined values, excluding undefined fields
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // Ensure store_id is handled correctly: for admin, it's fixed; otherwise parse string or null
    payload.store_id = currentUser?.role === "admin"
                      ? currentUser.store_id // Admin's store_id is fixed
                      : (payload.store_id === "null" ? null : parseInt(payload.store_id, 10)); // Merchant can set null or specific ID

    if (payload.role) {
      payload.role = payload.role.toLowerCase();
    }
    
    editUserMutation.mutate({ id: user.id, ...payload });
  };

  const getAssignableRoles = () => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "merchant":
        return ["admin", "clerk", "cashier"];
      case "admin": 
        return ["clerk", "cashier"];
      default:
        return [];
    }
  };

  const assignableRoles = getAssignableRoles();

  // Determine if the store select should be shown at all
  const showStoreSelect = currentUser?.role === "merchant";

  // Determine if the store select should be disabled (e.g., while loading, or for admin users)
  const isStoreSelectDisabled = isLoadingStores || currentUser?.role === "admin";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Edit User: {user?.name}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
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

            {/* Role Selection (Conditional based on currentUser and userToUpdate roles) */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  {/* Logic for when the role is editable (can change) */}
                  {(currentUser?.role === "merchant" && user?.role !== "merchant") || 
                   (currentUser?.role === "admin" && user?.role !== "admin" && user?.role !== "merchant")
                  ? ( 
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
                          {assignableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  ) : ( // Render disabled Input if not editable
                      <FormControl> 
                        <Input value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)} disabled />
                      </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Store ID selection (Conditional for Merchant, hidden/disabled for Admin) */}
            {showStoreSelect ? (
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
                            {/* Option for "No Store Assigned" only if currentUser is Merchant */}
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
            ) : ( // If Store Admin, display current store as disabled input
              <FormItem>
                <FormLabel>Store</FormLabel>
                <FormControl>
                  <Input value={user?.store?.name || (user?.store_id ? `Store ID: ${user.store_id}` : 'No Store')} disabled />
                </FormControl>
              </FormItem>
            )}

            {/* Is Active Toggle */}
            {currentUser?.id !== user?.id && 
             user?.role !== "merchant" && 
             currentUser?.role !== "clerk" && currentUser?.role !== "cashier" && ( 
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={
                            (currentUser?.role === "admin" && user?.role === "admin") // ⭐ FIXED SYNTAX HERE ⭐
                        }
                      />
                    </FormControl>
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
                disabled={editUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={editUserMutation.isPending}
              >
                {editUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}