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

export default function AddStoreModal({ isOpen, onClose }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertStoreSchema),
    defaultValues: {
      name: "",
      address: "",
      contact_person: "",
      phone: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      apiRequest("POST", `${BASE_URL}/api/Store`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["store_locations"]);
      toast({ title: "Success", description: "Store added successfully" });
      form.reset();
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
            Add New Store
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(mutation.mutate)} className="space-y-4">
            {["name", "address", "contact_person", "phone", "notes"].map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="capitalize">{field.replace("_", " ")}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter ${field.replace("_", " ")}`} {...field} />
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
                {mutation.isPending ? "Adding..." : "Add Store"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
