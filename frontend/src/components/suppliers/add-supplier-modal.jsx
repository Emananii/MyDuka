import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertSupplierSchema } from "@/shared/schema";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

export default function AddSupplierModal({ isOpen, onClose }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertSupplierSchema),
    defaultValues: {
      name: "",
      contact: "",
      address: "",
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data) => {
      return apiRequest("POST", `${BASE_URL}/suppliers`, data); // ✅ Updated endpoint
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/suppliers`] }); // ✅ Ensure this matches useQuery key
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
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

            {/* Contact */}
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Info</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Email, phone, or contact name"
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
