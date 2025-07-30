import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
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
import { insertSupplierSchema } from "@/shared/schema"; // This schema will need to be updated by you
import { apiRequest } from "@/lib/queryClient"; // Ensure apiRequest is correctly imported
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants"; // Assuming BASE_URL is "http://127.0.0.1:8000"

// The schema for editing should be the same as adding, but ensure it allows optionals for partial updates
const editSchema = insertSupplierSchema; // Ensure your insertSupplierSchema is updated for all fields

export default function EditSupplierModal({ supplier, isOpen, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      contact_person: "", // New field
      phone: "",           // New field
      email: "",           // New field
      address: "",
      notes: "",           // New field
    },
  });

  // Populate form fields when the supplier prop changes
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
      });
    }
  }, [supplier, form]);

  const updateSupplierMutation = useMutation({
    mutationFn: async (data) => {
      // Manually prepend /api/ since BASE_URL doesn't include it
      // Ensure the endpoint includes the supplier.id correctly
      return apiRequest("PUT", `${BASE_URL}/api/suppliers/${supplier.id}`, data);
    },
    onSuccess: () => {
      // Manually prepend /api/ for invalidation as well, and ensure it's the list query key
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/api/suppliers/`] });
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      // Re-added setTimeout redirect as requested
      setTimeout(() => {
        window.location.href = "/suppliers"; // Redirect to suppliers list after update
      }, 1200);
      onClose();
    },
    onError: (error) => {
      console.error("Failed to update supplier:", error); // Log error for debugging
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    updateSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Edit Supplier
            </DialogTitle>
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
                      placeholder="e.g., Jane Smith"
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
                disabled={updateSupplierMutation.isPending}
              >
                {updateSupplierMutation.isPending
                  ? "Updating..."
                  : "Update Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
