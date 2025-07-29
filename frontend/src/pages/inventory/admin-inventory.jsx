// src/pages/inventory/admin-inventory.jsx
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";

export default function AdminInventory() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [responding, setResponding] = useState({}); // Track comment per request

  useEffect(() => {
    fetch("/api/supply-requests", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((r) => r.json())
      .then(setRequests)
      .catch((err) => console.error(err));
  }, []);

  const handleResponse = (req, action) => {
    fetch(`/api/stores/${req.store_id}/supply-requests/${req.id}/respond`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        action,
        comment: responding[req.id] || "",
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to respond");
        return r.json();
      })
      .then((data) => {
        toast({ title: `Request ${action}ed` });
        setRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: data.status } : r))
        );
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Action failed" });
      });
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {requests.map((req) => (
        <Card key={req.id}>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-lg font-semibold">{req.product_name}</h3>
            <p><strong>Store:</strong> {req.store_name}</p>
            <p><strong>Requested Quantity:</strong> {req.requested_quantity}</p>
            <p><strong>Status:</strong> <span className="capitalize">{req.status}</span></p>
            <p><strong>Clerk:</strong> {req.clerk_name}</p>
            {req.status === "pending" && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add comment (optional)"
                  value={responding[req.id] || ""}
                  onChange={(e) =>
                    setResponding((prev) => ({ ...prev, [req.id]: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleResponse(req, "approve")}>Approve</Button>
                  <Button variant="destructive" onClick={() => handleResponse(req, "decline")}>Decline</Button>
                </div>
              </div>
            )}
            {req.admin_response && <p className="text-sm text-muted-foreground">Note: {req.admin_response}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
