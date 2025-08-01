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
// The schema remains the same, but the form's logic will
// only allow the admin to set specific roles.
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

export default function AdminEditUserModal({ user, isOpen, onClose, editUserMutation, currentUser }) {
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

  // For Admin user, we don't need to fetch all stores,
  // since they are fixed to their own store.
  // The useQuery hook is intentionally removed here to prevent unnecessary calls.

  const onSubmit = (data) => {
    // Ensure we send only defined values, excluding undefined fields
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    // For Admin, the store_id is always the currentUser's store_id
    payload.store_id = currentUser.store_id;

    if (payload.role) {
      payload.role = payload.role.toLowerCase();
    }

    editUserMutation.mutate({ id: user.id, ...payload });
  };

  const getAssignableRoles = () => {
    // A store admin can only assign clerk and cashier roles.
    if (!currentUser) return [];
    if (currentUser.role === "admin") {
      return ["clerk", "cashier"];
    }
    return [];
  };

  const assignableRoles = getAssignableRoles();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Edit User: {user?.name}
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

            {/* Role Selection */}
            {/* The conditional logic is now safely inside the FormField's render prop */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    {/* The Select is shown only if the user is editable by the admin */}
                    {user?.role !== "admin" && user?.role !== "merchant" ? (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                        disabled
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Store ID selection */}
            {/* The FormField wrapper is always present, and the content inside
            the render prop is conditional. This fixes the useFormField error. */}
            <FormField
              control={form.control}
              name="store_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store</FormLabel>
                  <FormControl>
                    <Input
                      value={user?.store?.name || (user?.store_id ? `Store ID: ${user.store_id}` : 'No Store')}
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Active Toggle */}
            {currentUser?.id !== user?.id && user?.role !== "merchant" && (
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
                            (currentUser?.role === "admin" && user?.role === "admin")
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
