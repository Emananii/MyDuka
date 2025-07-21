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
import EditPurchaseModal from "./edit-purchase-modal";
import { BASE_URL } from "@/lib/constants";

const formatDate = (rawDate) => {
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return "ksh0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
  }).format(parsed);
};

export default function ViewPurchaseModal({ isOpen, onClose, purchase, onPrint }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const isEditable = useMemo(() => {
    if (!purchase?.purchase_date) return false;
    const purchaseDate = new Date(purchase.purchase_date);
    const now = new Date();
    const diffInDays = (now - purchaseDate) / (1000 * 60 * 60 * 24);
    return diffInDays <= 30;
  }, [purchase]);

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `${BASE_URL}/purchases/${purchase?.id}`),
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: `Purchase #${purchase.id} deleted`,
      });
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/purchases`] });
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

  const computedTotal =
    Array.isArray(purchase?.items) && purchase.items.length > 0
      ? purchase.items.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const unitCost = Number(item.unit_cost) || 0;
          return sum + qty * unitCost;
        }, 0)
      : 0;

  const totalCostToDisplay =
    purchase.total_cost && purchase.total_cost > 0
      ? purchase.total_cost
      : computedTotal;

  if (!purchase) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl" aria-describedby="purchase-description">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Purchase #{purchase.id}
            </DialogTitle>
          </DialogHeader>

          {/* Purchase Summary Info */}
          <div className="space-y-4 text-sm">
            <div>
              <strong>Supplier:</strong>{" "}
              {purchase.supplier?.name || "Unknown Supplier"}
            </div>

            <div>
              <strong>Date:</strong> {formatDate(purchase.purchase_date)}
            </div>

            <div>
              <strong>Total Cost:</strong> {formatCurrency(totalCostToDisplay)}
            </div>

            <div>
              <strong>Notes:</strong> {purchase.notes || "None"}
            </div>

            {purchase.items && purchase.items.length > 0 && (
              <div>
                <strong className="block mb-2">Items:</strong>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border border-gray-200">
                    <thead className="bg-gray-100 text-xs uppercase">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Quantity</th>
                        <th className="px-3 py-2">Unit Cost</th>
                        <th className="px-3 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.items.map((item) => {
                        const qty = Number(item.quantity) || 0;
                        const cost = Number(item.unit_cost) || 0;
                        const subtotal = qty * cost;

                        return (
                          <tr key={item.id} className="border-t border-gray-200">
                            <td className="px-3 py-2">
                              {item.product?.name || "Unknown Product"}
                            </td>
                            <td className="px-3 py-2">{item.product?.sku || "-"}</td>
                            <td className="px-3 py-2">{qty}</td>
                            <td className="px-3 py-2">{formatCurrency(cost)}</td>
                            <td className="px-3 py-2 font-semibold">
                              {formatCurrency(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button variant="outline" onClick={onPrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

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

      {editing && (
        <EditPurchaseModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          purchase={purchase}
          onUpdated={() => {
            window.location.href = "/purchases";
          }}
        />
      )}
    </>
  );
}
