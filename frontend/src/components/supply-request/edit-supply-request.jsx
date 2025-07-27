import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Changed to useQueryClient as apiRequest and BASE_URL are not in provided context
import axios from "@/utils/axios"; // Assuming axios is used for API calls
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added for better UX
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

// ---
// 1. Define the Zod schema for form validation
// ---
const formSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required"),
  requested_quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

// ---
// 2. EditSupplyRequest Component
// ---
export function EditSupplyRequest({ isOpen, onClose, request }) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize query client

  // Determine if the request is editable (only if status is 'pending')
  const isEditable = useMemo(() => {
    return request?.status === "pending";
  }, [request]);

  // Fetch all products to populate the dropdown
  const { data: products = [] } = axios.get('/api/products') // Removed useQuery to simplify for this example, assuming direct axios.get
    .then(response => response.data)
    .catch(error => {
      console.error("Failed to fetch products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: "Could not load product list. Please try again.",
      });
      return []; // Return empty array on error
    });

  // ---
  // 3. Initialize react-hook-form
  // ---
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: request?.product_id ?? undefined,
      requested_quantity: request?.requested_quantity ?? 1,
    },
  });

  // ---
  // 4. Update form fields when 'request' prop changes
  // ---
  useEffect(() => {
    if (request) {
      form.reset({
        product_id: request.product_id,
        requested_quantity: request.requested_quantity,
      });
    }
  }, [request, form]);

  // ---
  // 5. Setup mutation for updating the supply request
  // ---
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Use PATCH to update specific fields on the request
      // Note: Your backend route for PATCH is `/api/stores/<int:store_id>/supply-requests/<int:request_id>/respond`
      // but that's for admin response. For clerk-initiated edits, a PATCH to `/api/supply-requests/<id>` (or similar)
      // that allows updating product_id and requested_quantity is assumed.
      // If your backend doesn't have a direct PATCH for clerks to edit, you'll need to create one.
      return await axios.patch(
        `/api/supply-requests/${request.id}`, // Assuming this route for clerk edits
        {
          product_id: data.product_id,
          requested_quantity: data.requested_quantity,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply_requests"] }); // Invalidate cache for supply requests
      toast({
        title: "Supply Request Updated",
        description: `Request #${request.id} updated successfully.`,
      });
      onClose(); // Close the modal on success
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.error || "An error occurred while updating the request.",
        variant: "destructive",
      });
    },
  });

  // ---
  // 6. Setup mutation for deleting the supply request
  // ---
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Assuming a DELETE route for supply requests
      return await axios.delete(`/api/supply-requests/${request.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply_requests"] }); // Invalidate cache
      toast({
        title: "Supply Request Deleted",
        description: `Request #${request.id} has been deleted.`,
      });
      onClose(); // Close the modal on success
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.error || "An error occurred while deleting the request.",
        variant: "destructive",
      });
    },
  });

  // ---
  // 7. Handle form submission
  // ---
  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  // Do not render if no request object is passed
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"> {/* Adjusted max-width for simpler form */}
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Edit Supply Request #{request.id}
          </DialogTitle>
          <DialogDescription>
            {isEditable
              ? "Adjust the product or quantity for this pending request."
              : "This request cannot be edited as its status is not 'pending'."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Product Selection */}
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString() ?? ""}
                    disabled={!isEditable}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.length > 0 ? (
                        products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} ({product.unit})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-products" disabled>
                          No products available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Requested Quantity Input */}
            <FormField
              control={form.control}
              name="requested_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 50"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))} // Ensure number type
                      min="1"
                      disabled={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons (Update/Delete or Close) */}
            <div className="flex space-x-3 pt-4">
              {isEditable ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Request"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={updateMutation.isPending || !form.formState.isDirty} // Disable if no changes
                  >
                    {updateMutation.isPending ? "Updating..." : "Update Request"}
                  </Button>
                </>
              ) : (
                <Button type="button" className="w-full" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}