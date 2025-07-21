import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { editCategorySchema } from "@/shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

export default function EditCategoryModal({ isOpen, onClose, category }) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(editCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name || "",
        description: category.description || "",
      });
    }
  }, [category, form]);

  const editCategoryMutation = useMutation({
    mutationFn: async (data) => {
      return await apiRequest("PUT", `${BASE_URL}/categories/${category.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] }); 
      toast({
        title: "Success!",
        description: "Category updated successfully.",
        duration: 3000,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
        duration: 4000,
      });
    },
  });

  const onSubmit = (data) => {
    if (data.name.trim()) {
      editCategoryMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={editCategoryMutation.isPending}
              >
                {editCategoryMutation.isPending
                  ? "Updating..."
                  : "Update Category"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
