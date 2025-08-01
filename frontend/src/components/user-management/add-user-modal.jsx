import React, { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, Mail, UserPlus, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { userRoleEnum } from "@/shared/schema";

// --- Zod Schema for Add User Form (Direct Creation) ---
const addUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: userRoleEnum.refine(
    // Removed 'admin' from direct creation - admins must be invited
    (role) => ["clerk", "cashier"].includes(role),
    { message: "Invalid role selected for creation." }
  ),
  store_id: z.union([z.number().int().positive(), z.literal(null)]).nullable().optional(), 
});

// --- Zod Schema for Invitation Form ---
const inviteAdminSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  store_id: z.union([z.number().int().positive(), z.literal(null)]).nullable().optional(),
});

export default function AddUserModal({ isOpen, onClose, createUserMutation, currentUser }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");

  // Form for direct user creation
  const createForm = useForm({
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

  // Form for admin invitation
  const inviteForm = useForm({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: {
      email: "",
      store_id: currentUser?.role === "merchant" && currentUser?.store_id 
                  ? currentUser.store_id 
                  : null,
    },
  });

  // Reset forms when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      createForm.reset({
        name: "",
        email: "",
        password: "",
        role: "",
        store_id: currentUser?.role === "admin" || currentUser?.role === "clerk" 
                    ? currentUser?.store_id || null 
                    : null,
      });
      inviteForm.reset({
        email: "",
        store_id: currentUser?.role === "merchant" && currentUser?.store_id 
                    ? currentUser.store_id 
                    : null,
      });
      setActiveTab("create");
    }
  }, [isOpen, createForm, inviteForm, currentUser]);

  // Fetch stores for merchant role
  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores-list"], 
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `${BASE_URL}/api/store/`); 
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

  // Mutation for sending admin invitation
  const sendInvitationMutation = useMutation({
    mutationFn: async (data) => {
      return apiRequest("POST", `${BASE_URL}/api/invitations/send`, data);
    },
    onSuccess: (response) => {
      toast({
        title: "Invitation sent successfully",
        description: `Admin invitation has been sent to ${inviteForm.getValues("email")}`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["pending-invitations"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Could not send admin invitation",
        variant: "destructive",
      });
    },
  });

  // Handle direct user creation
  const onCreateUser = (data) => {
    const payload = {
      ...data,
      store_id: currentUser?.role === "admin" || currentUser?.role === "clerk"
                  ? currentUser.store_id 
                  : (data.store_id === "null" ? null : parseInt(data.store_id, 10)),
      password: data.password || undefined,
    };
    createUserMutation.mutate(payload); 
  };

  // Handle admin invitation
  const onSendInvitation = (data) => {
    const payload = {
      email: data.email,
      role: "admin",
      store_id: data.store_id === "null" ? null : parseInt(data.store_id, 10),
    };
    sendInvitationMutation.mutate(payload);
  };

  const getAllowedRoles = () => {
    if (!currentUser) return [];
    switch (currentUser.role) {
      case "merchant":
        // Removed 'admin' from direct creation - use invitation system
        return ["clerk", "cashier"];
      case "admin": 
        return ["clerk", "cashier"];
      case "clerk": 
        return ["cashier"];
      default:
        return [];
    }
  };

  const allowedRoles = getAllowedRoles();
  const showStoreSelect = currentUser?.role === "merchant";
  const isStoreSelectDisabled = isLoadingStores || currentUser?.role === "admin" || currentUser?.role === "clerk";
  const canInviteAdmin = currentUser?.role === "merchant";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Add New User
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </TabsTrigger>
            {canInviteAdmin && (
              <TabsTrigger value="invite" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invite Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Direct User Creation Tab */}
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Create User Directly</CardTitle>
                <CardDescription>
                  Create cashier and clerk accounts with immediate access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
                    {/* User Name */}
                    <FormField
                      control={createForm.control}
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
                      control={createForm.control}
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
                      control={createForm.control}
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
                      control={createForm.control}
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

                    {/* Store ID selection (Conditional for Merchant) */}
                    {showStoreSelect && (
                      <FormField
                        control={createForm.control}
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
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Invitation Tab */}
          {canInviteAdmin && (
            <TabsContent value="invite" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Invite Admin</CardTitle>
                  <CardDescription>
                    Send a secure invitation link to create an admin account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(onSendInvitation)} className="space-y-4">
                      {/* Email */}
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter admin's email address" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Store Selection for Merchant */}
                      <FormField
                        control={inviteForm.control}
                        name="store_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store Assignment</FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === "null" ? null : parseInt(value, 10))
                              }
                              value={field.value !== null ? String(field.value) : "null"}
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
                                    <SelectItem value="null">No Store Assignment</SelectItem>
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

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">
                              How invitation works:
                            </h4>
                            <ul className="text-xs text-blue-700 mt-1 space-y-1">
                              <li>• A secure link will be sent to the email address</li>
                              <li>• The invitation expires in 24 hours</li>
                              <li>• The invitee can set their own password</li>
                              <li>• Account is activated immediately upon registration</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={onClose}
                          disabled={sendInvitationMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={sendInvitationMutation.isPending}
                        >
                          {sendInvitationMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}