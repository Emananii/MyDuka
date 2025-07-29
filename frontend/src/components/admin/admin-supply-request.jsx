// components/admin/AdminSupplyInventory.jsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function AdminSupplyInventory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fulfillQty, setFulfillQty] = useState({}); // key: requestId, value: quantity

  const { data: requests, isLoading } = useQuery({
    queryKey: ["approved-supply-requests"],
    queryFn: () =>
      apiRequest("GET", `${BASE_URL}/api/supply-requests?status=approved`),
  });

  const mutation = useMutation({
    mutationFn: ({ reqId, quantity }) =>
      apiRequest("PATCH", `${BASE_URL}/api/supply-requests/${reqId}/fulfill`, {
        quantity,
      }),
    onSuccess: () => {
      toast({ title: "Inventory updated and request fulfilled" });
      queryClient.invalidateQueries(["approved-supply-requests"]);
    },
    onError: () => {
      toast({ title: "Failed to fulfill request", variant: "destructive" });
    },
  });

  const handleSubmit = (reqId) => {
    const qty = fulfillQty[reqId];
    if (!qty || qty < 1) {
      toast({ title: "Enter a valid quantity", variant: "destructive" });
      return;
    }
    mutation.mutate({ reqId, quantity: qty });
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Approved Supply Requests</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          {(requests || []).map((req) => (
            <div
              key={req.id}
              className="border rounded-xl p-4 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="font-medium">{req.product.name}</p>
                <p className="text-sm text-gray-500">
                  Store: {req.store.name}
                </p>
                <p className="text-sm text-gray-500">
                  Requested: {req.requested_quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Qty to deliver"
                  value={fulfillQty[req.id] || ""}
                  onChange={(e) =>
                    setFulfillQty({ ...fulfillQty, [req.id]: e.target.value })
                  }
                  className="w-32"
                />
                <Button
                  onClick={() => handleSubmit(req.id)}
                  disabled={mutation.isPending}
                >
                  Deliver
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
