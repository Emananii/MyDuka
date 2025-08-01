import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertStoreSchema } from "@/shared/schema";
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
import { useEffect } from "react"; // Imported useEffect

export default function EditStoreModal({ store, isOpen, onClose }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertStoreSchema),
    defaultValues: {
      name: store?.name || "",
      address: store?.address || "",
      contact_person: store?.contact_person || "",
      phone: store?.phone || "",
      notes: store?.notes || "",
    },
  });

  // NEW: Add a useEffect to reset the form when the 'store' prop changes.
  // This ensures the form is always populated with the latest data.
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name || "",
        address: store.address || "",
        contact_person: store.contact_person || "",
        phone: store.phone || "",
        notes: store.notes || "",
      });
    }
  }, [store, form]);

  const mutation = useMutation({
    mutationFn: (data) =>
      apiRequest("PATCH", `${BASE_URL}/api/store/${store.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["store_locations"]);
      toast({ title: "Success", description: "Store updated successfully" });
      onClose();
    },
    onError: (error) =>
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Edit Store
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(mutation.mutate)} className="space-y-4">
            {["name", "address", "contact_person", "phone", "notes"].map((fieldName) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    {/* The fix is here: we access field.name, which is a string */}
                    <FormLabel className="capitalize">{field.name.replace("_", " ")}</FormLabel>
                    <FormControl>
                      {/* The placeholder was also corrected to use field.name */}
                      <Input placeholder={`Enter ${field.name.replace("_", " ")}`} {...field} />
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
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Store"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
