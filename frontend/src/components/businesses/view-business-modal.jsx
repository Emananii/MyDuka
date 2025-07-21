import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { PencilLine, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import EditBusinessModal from "./edit-business-modal";

export default function ViewBusinessModal({ business, isOpen, onClose }) {
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();

  const toggleActiveMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `${BASE_URL}/business_locations/${business.id}/toggle_active`),
    onSuccess: (data) => {
      toast({
        title: data.is_active ? "Business Activated" : "Business Deactivated",
        description: `Business #${business.id} is now ${data.is_active ? "active" : "inactive"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["business_locations"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBusinessMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `${BASE_URL}/business_locations/${business.id}/delete`),
    onSuccess: () => {
      toast({
        title: "Business Deleted",
        description: `Business #${business.id} has been marked as deleted.`,
      });
      queryClient.invalidateQueries({ queryKey: ["business_locations"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!business) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md" aria-describedby="business-description">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Business #{business.id}
            </DialogTitle>
          </DialogHeader>

          {/* Business Summary */}
          <div className="space-y-4 text-sm">
            <div>
              <strong>Name:</strong> {business.name}
            </div>
            <div>
              <strong>Address:</strong> {business.address || "No address provided"}
            </div>
            <div>
              <strong>Contact Person:</strong> {business.contact_person || "N/A"}
            </div>
            <div>
              <strong>Phone:</strong> {business.phone || "N/A"}
            </div>
            <div>
              <strong>Notes:</strong> {business.notes || "None"}
            </div>
            <div>
              <strong>Status:</strong>{" "}
              <span
                className={`font-medium ${
                  business.is_active ? "text-green-600" : "text-gray-500"
                }`}
              >
                {business.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilLine className="w-4 h-4 mr-2" />
              Edit
            </Button>

            <Button
              className={
                business.is_active ? "bg-red-600 text-white" : "bg-green-600 text-white"
              }
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending
                ? business.is_active
                  ? "Deactivating..."
                  : "Activating..."
                : business.is_active
                ? "Deactivate"
                : "Activate"}
            </Button>

            {!business.is_active && !business.is_deleted && (
              <Button
                variant="destructive"
                onClick={() => deleteBusinessMutation.mutate()}
                disabled={deleteBusinessMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteBusinessMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editing && (
        <EditBusinessModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          business={business}
        />
      )}
    </>
  );
}
