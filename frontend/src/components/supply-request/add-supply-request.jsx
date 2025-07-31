import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import axios from "@/utils/axios";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext"; // Import the useUser hook
import PropTypes from "prop-types";

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

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// ---
// 1. Define the Zod schema for form validation
// ---
const formSchema = z.object({
  product_id: z.coerce.number().min(1, "Product is required"),
  requested_quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

// ---
// 2. AddSupplyRequest Component
// ---
export function AddSupplyRequest({ isOpen, onClose, onCreated }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser(); // Access the current user from UserContext

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
      product_id: undefined,
      requested_quantity: 1,
    },
  });

  // ---
  // 4. Setup mutation for creating the supply request
  // ---
  const createMutation = useMutation({
    mutationFn: async (formData) => {
      // Ensure user data is available before proceeding
      if (!user?.id || !user?.store_id) {
        throw new Error("User or store ID is missing.");
      }
      
      // CORRECTION: Including clerk_id and store_id in the payload
      const payload = {
        product_id: formData.product_id,
        requested_quantity: formData.requested_quantity,
        clerk_id: user.id,
        store_id: user.store_id,
      };

      return await axios.post(`/api/supply-requests/`, payload);
    },
    onSuccess: (response) => {
      toast({
        title: "Supply Request Created",
        description: response.data?.message || "A new supply request has been submitted.",
      });
      // Invalidate the supply requests list to show the new request
      queryClient.invalidateQueries(["supplyRequests"]);
      form.reset();
      if (onCreated) {
        onCreated();
      }
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || "An error occurred while creating the request.",
        variant: "destructive",
      });
      console.error("Submission error:", error);
    },
  });

  // ---
  // 5. Handle form submission
  // ---
  const onSubmit = (data) => {
    createMutation.mutate(data);
  };

  const isSubmitting = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Create New Supply Request
          </DialogTitle>
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
                    disabled={isLoadingProducts || isSubmitting}
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
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// PropTypes for better development experience
AddSupplyRequest.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
};
