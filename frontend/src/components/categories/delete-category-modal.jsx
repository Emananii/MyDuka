import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

export default function DeleteCategoryModal({ category, isOpen, onClose }) {
  const { toast } = useToast();

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Deleted",
        description: "Category deleted successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (category?.id) {
      deleteCategoryMutation.mutate(category.id);
    } else {
      toast({
        title: "Error",
        description: "Invalid category ID.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            Are you sure you want to delete the category{" "}
            <strong>{category?.name || "Unnamed"}</strong>?
          </p>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={deleteCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteConfirm}
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
