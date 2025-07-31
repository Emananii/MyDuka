import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import axios from "@/utils/axios";
import { useToast } from "@/hooks/use-toast";
import PropTypes from "prop-types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Trash2, Loader2 } from "lucide-react";

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
export function EditSupplyRequest({ isOpen, onClose, request, onUpdated }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if the request is editable (only if status is 'pending')
  const isEditable = useMemo(() => {
    return request?.status === "pending";
  }, [request]);

  // Use react-query to fetch all products to populate the dropdown
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await axios.get("/api/inventory/products");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
    onError: (error) => {
      console.error("Failed to fetch products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: "Could not load product list. Please try again.",
      });
    },
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
      // CORRECTED: Changed the method to PATCH and removed the '/update' from the URL.
      // This matches the RESTful API endpoint expected by your backend.
      return await axios.patch(`/api/supply-requests/${request.id}`, {
        product_id: data.product_id,
        requested_quantity: data.requested_quantity,
      });
    },
    onSuccess: (response) => {
      toast({
        title: "Supply Request Updated",
        description: response.data?.message || `Request #${request.id} updated successfully.`,
      });
      // Invalidate both the list and the individual request cache
      queryClient.invalidateQueries(["supplyRequests"]);
      queryClient.invalidateQueries(["supplyRequest", request.id]);
      if (onUpdated) {
        onUpdated();
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "An error occurred while updating the request.",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  // ---
  // 6. Setup mutation for deleting the supply request
  // ---
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await axios.delete(`/api/supply-requests/${request.id}`);
    },
    onSuccess: (response) => {
      toast({
        title: "Supply Request Deleted",
        description: response.data?.message || `Request #${request.id} has been deleted.`,
      });
      queryClient.invalidateQueries(["supplyRequests"]);
      if (onUpdated) {
        onUpdated();
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.message || "An error occurred while deleting the request.",
        variant: "destructive",
      });
      console.error("Deletion error:", error);
    },
  });

  // ---
  // 7. Handle form submission
  // ---
  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  if (!request) return null;

  const isUpdating = updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
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
                    disabled={!isEditable || isLoadingProducts || isUpdating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingProducts ? (
                        <SelectItem value="loading" disabled>
                          <span className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading products...
                          </span>
                        </SelectItem>
                      ) : products.length > 0 ? (
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
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      min="1"
                      disabled={!isEditable || isUpdating}
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
                    disabled={isUpdating}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Request"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isUpdating || !form.formState.isDirty}
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

// PropTypes for better development experience
EditSupplyRequest.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  request: PropTypes.object,
  onUpdated: PropTypes.func,
};
