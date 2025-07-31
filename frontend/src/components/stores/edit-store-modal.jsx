import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertStoreSchema } from "@/shared/schema"; // Assuming this is for new store, adjust if you have an update schema
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";

export default function EditStoreModal({ store, isOpen, onClose }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertStoreSchema), // Ensure this schema matches update requirements if different from insert
    defaultValues: {
      name: "",
      address: "",
      contact_person: "",
      phone: "",
      notes: "",
    },
  });

  // Use useEffect to reset form values whenever the 'store' prop changes
  useEffect(() => {
    if (store && isOpen) { // Only reset if a store is provided and the modal is open
      form.reset({
        name: store.name || "",
        address: store.address || "",
        contact_person: store.contact_person || "",
        phone: store.phone || "",
        notes: store.notes || "",
      });
    } else if (!isOpen) {
      // Optionally reset the form to empty when the modal closes
      // This prevents old data from flashing before new data loads if opened again
      form.reset();
    }
  }, [store, isOpen, form]); // Depend on 'store', 'isOpen', and 'form' instance

  const mutation = useMutation({
    mutationFn: (data) =>
      // **** CORRECTED URL: Added '/api/' before 'stores' ****
      apiRequest("PATCH", `${BASE_URL}/api/stores/${store?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["stores"]); // Invalidate 'stores' query key to refresh the list
      toast({ title: "Success", description: "Store updated successfully" });
      onClose();
    },
    onError: (error) =>
      toast({
        title: "Error",
        description: error.message || "Failed to update store.",
        variant: "destructive",
      }),
  });

  // Ensure mutation.mutate is not called if store.id is missing
  const onSubmit = (data) => {
    if (!store?.id) {
      toast({
        title: "Error",
        description: "Store ID is missing. Cannot update.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Edit Store
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {["name", "address", "contact_person", "phone", "notes"].map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">
                      {typeof fieldName === "string"
                        ? fieldName.replace(/_/g, " ")
                        : ""}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter ${fieldName.replace(/_/g, " ")}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Updating..." : "Update Store"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}