// src/pages/SupplyRequestDetailsPage.jsx
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

async function fetchSupplyRequest(id) {
  const res = await fetch(`/api/supply-requests/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function SupplyRequestDetailsPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["supply-request", id],
    queryFn: () => fetchSupplyRequest(id),
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 p-4">Failed to load request.</p>;
  }

  const {
    id: requestId,
    product_name,
    store_name,
    requested_quantity,
    clerk_name,
    status,
    admin_response,
    created_at,
    updated_at,
  } = data;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Supply Request #{requestId}</h1>
        <Button variant="outline" onClick={() => navigate("/inventory/supply-requests")}>
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p><strong>Product:</strong> {product_name}</p>
          <p><strong>Store:</strong> {store_name}</p>
          <p><strong>Requested Quantity:</strong> {requested_quantity}</p>
          <p><strong>Status:</strong> <span className="capitalize">{status}</span></p>
          <p><strong>Clerk:</strong> {clerk_name}</p>
          <p><strong>Submitted:</strong> {new Date(created_at).toLocaleString()}</p>
          <p><strong>Updated:</strong> {new Date(updated_at).toLocaleString()}</p>
          {admin_response && (
            <p className="italic text-muted-foreground">
              Admin Response: {admin_response}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
