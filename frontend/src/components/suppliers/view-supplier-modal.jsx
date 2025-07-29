import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
import { PencilLine, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient"; // Ensure apiRequest is correctly imported
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import EditSupplierModal from "./edit-supplier-modal";

export default function ViewSupplierModal({ supplier, isOpen, onClose }) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize useQueryClient

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `${BASE_URL}/api/suppliers/${supplier?.id}`),
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: `Supplier #${supplier.id} deleted successfully.`,
      });
      // Invalidate the query to refetch the list
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/api/suppliers/`] });
      onClose(); // Close the modal first

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.href = "/suppliers";
      }, 1200);
    },
    onError: (error) => {
      console.error("Failed to delete supplier:", error); // Log error for debugging
      toast({
        title: "Delete failed",
        description: error.message || "An error occurred during deletion.",
        variant: "destructive",
      });
    },
  });

  if (!supplier) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md" aria-describedby="supplier-description">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Supplier #{supplier.id}
            </DialogTitle>
          </DialogHeader>

          {/* Supplier Summary */}
          <div className="space-y-4 text-sm">
            <div>
              <strong>Name:</strong> {supplier.name}
            </div>
            <div>
              <strong>Contact Person:</strong> {supplier.contact_person || "No contact person provided"}
            </div>
            <div>
              <strong>Phone:</strong> {supplier.phone || "No phone provided"}
            </div>
            <div>
              <strong>Email:</strong> {supplier.email || "No email provided"}
            </div>
            <div>
              <strong>Address:</strong> {supplier.address || "No address provided"}
            </div>
            <div>
              <strong>Notes:</strong> {supplier.notes || "No notes"}
            </div>
            <div>
              <strong>Created At:</strong> {new Date(supplier.created_at).toLocaleString()}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(supplier.updated_at).toLocaleString()}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilLine className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
              <Trash2 className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editing && (
        <EditSupplierModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          supplier={supplier}
        />
      )}
    </>
  );
}
