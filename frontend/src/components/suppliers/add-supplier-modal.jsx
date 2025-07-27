import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { insertSupplierSchema } from "@/shared/schema"; // This schema will need to be updated by you
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
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; // Removed queryClient from here as it's a separate import
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants"; // Assuming BASE_URL is "http://127.0.0.1:8000"

export default function AddSupplierModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  // Update defaultValues to match backend Supplier model
  const form = useForm({
    resolver: zodResolver(insertSupplierSchema), // You'll need to update this schema
    defaultValues: {
      name: "",
      contact_person: "", // New field
      phone: "",           // New field
      email: "",           // New field
      address: "",
      notes: "",           // New field
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data) => {
      // Manually prepend /api/ since BASE_URL doesn't include it based on your description
      return apiRequest("POST", `${BASE_URL}/api/suppliers/`, data);
    },
    onSuccess: () => {
      // Manually prepend /api/ for invalidation as well
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/api/suppliers/`] });
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
      form.reset();
      onClose();
      // Re-added setTimeout redirect as requested
      setTimeout(() => {
        window.location.href = "/suppliers"; // Redirect to suppliers list after update
      }, 1200);
    },
    onError: (error) => {
      console.error("Failed to add supplier:", error); // Log error for debugging
      toast({
        title: "Error",
        description: error.message || "Failed to add supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    createSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Add New Supplier
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Person */}
            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., John Doe"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., +254712345678"
                      {...field}
                      value={field.value || ""}
                    />
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
                    <Input
                      type="email"
                      placeholder="e.g., supplier@example.com"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter supplier address"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Any additional notes about the supplier"
                      {...field}
                      value={field.value || ""}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" // Tailwind classes for textarea
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createSupplierMutation.isPending}
              >
                {createSupplierMutation.isPending
                  ? "Adding..."
                  : "Add Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
