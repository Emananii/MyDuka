import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { PencilLine, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import EditSupplierModal from "./edit-supplier-modal";

export default function ViewSupplierModal({ supplier, isOpen, onClose }) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `${BASE_URL}/suppliers/${supplier?.id}`),
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: `Supplier #${supplier.id} deleted`,
      });
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/suppliers`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
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
              <strong>Contact:</strong> {supplier.contact || "No contact provided"}
            </div>
            <div>
              <strong>Address:</strong> {supplier.address || "No address provided"}
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
