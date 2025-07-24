import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { Trash2, PencilLine, Printer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

import EditStockTransferModal from "@/components/stock-transfers/edit-stock-transfer-modal";

const formatDate = (rawDate) => {
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function ViewStockTransferModal({
  isOpen,
  onClose,
  transfer,
  onPrint,
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const isEditable = useMemo(() => {
    if (!transfer?.date) return false;
    const transferDate = new Date(transfer.date);
    const now = new Date();
    const diffInDays = (now - transferDate) / (1000 * 60 * 60 * 24);
    return diffInDays <= 30;
  }, [transfer]);

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `${BASE_URL}/stock_transfers/${transfer?.id}`),
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: `Stock transfer #${transfer.id} deleted`,
      });
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
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

  if (!transfer) return null;

  return (
    <>
      {/* View Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl" aria-describedby="stock-transfer-description">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Stock Transfer #{transfer.id}
            </DialogTitle>
          </DialogHeader>

          {/* Stock Transfer Details */}
          <div className="space-y-4 text-sm">
            <div>
              <strong>Type:</strong>{" "}
              {transfer.transfer_type === "IN" ? "Stock In" : "Stock Out"}
            </div>

            <div>
              <strong>Date:</strong> {formatDate(transfer.date)}
            </div>

            <div>
              <strong>Location:</strong>{" "}
              {transfer.location?.name || "Unknown Location"}
            </div>

            <div>
              <strong>Notes:</strong> {transfer.notes || "None"}
            </div>

            {Array.isArray(transfer.items) && transfer.items.length > 0 && (
              <div>
                <strong className="block mb-2">Items:</strong>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-200">
                    <thead className="bg-gray-100 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfer.items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200">
                          <td className="px-3 py-2">
                            {item.product?.name || "Unknown Product"}
                          </td>
                          <td className="px-3 py-2">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={onPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

            {/* Only show edit and delete if editable */}
            {isEditable && (
              <>
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editing && (
        <EditStockTransferModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          transfer={transfer}
          onUpdated={() => {
            setEditing(false);
            onClose();
            queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
          }}
        />
      )}
    </>
  );
}
