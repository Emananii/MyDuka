import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RespondToSupplyRequestModal from "@/components/inventory/response-to-supply-request";
import { Link } from "wouter";

export default function SupplyRequestListPage() {
  const { user } = useUser();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["supply-requests"],
    queryFn: () => apiRequest("GET", `${BASE_URL}/api/supply-requests`),
  });

  useEffect(() => {
    if (!user) return;
    refetch();
  }, [user, refetch]);

  if (isLoading) return <p className="p-4 text-sm">Loading...</p>;
  if (error) return <p className="p-4 text-sm text-red-500">Failed to load requests.</p>;

  const handleRespond = (request) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const requests = Array.isArray(data) ? data : [];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Supply Requests</h2>

      <div className="space-y-4">
        {requests.length === 0 && (
          <p className="text-sm text-muted-foreground">No supply requests found.</p>
        )}

        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-4 space-y-1">
              <div><strong>Store:</strong> {req.store?.name || "—"}</div>
              <div><strong>Product:</strong> {req.product?.name || "—"}</div>
              <div><strong>Quantity:</strong> {req.quantity}</div>
              <div><strong>Status:</strong> <span className="capitalize">{req.status}</span></div>

              {req.status !== "pending" && (
                <div><strong>Admin:</strong> {req.admin?.name || "—"}</div>
              )}

              {req.admin_response && (
                <div><strong>Comment:</strong> {req.admin_response}</div>
              )}

              <div className="pt-2 flex gap-2">
                <Link href={`/inventory/supply-requests/${req.id}`}>
                  <Button variant="outline">View</Button>
                </Link>

                {user?.role === "admin" && req.status === "pending" && (
                  <Button onClick={() => handleRespond(req)}>Respond</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRequest && (
        <RespondToSupplyRequestModal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          storeId={selectedRequest.store.id}
          request={{
            id: selectedRequest.id,
            store_name: selectedRequest.store.name,
            product_name: selectedRequest.product.name,
            requested_quantity: selectedRequest.quantity, // ✅ Match backend
          }}
        />
      )}
    </div>
  );
}
