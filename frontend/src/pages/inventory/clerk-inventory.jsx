import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table, TableHeader, TableHead, TableRow,
  TableBody, TableCell
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BASE_URL } from "@/lib/constants";

export default function ClerkInventoryDashboard() {
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["clerk-products"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/products`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.products || [];
    },
  });

  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "unpaid":
        return <Badge className="bg-yellow-100 text-yellow-800">Unpaid</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Inventory Dashboard (Clerk)</h1>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100 text-sm text-gray-600">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>In Stock</TableHead>
                <TableHead>Spoilt</TableHead>
                <TableHead>Buying Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category?.name || "N/A"}</TableCell>
                    <TableCell>{item.quantity_received}</TableCell>
                    <TableCell>{item.stock_level}</TableCell>
                    <TableCell>{item.spoilt_quantity || 0}</TableCell>
                    <TableCell>{item.buying_price}</TableCell>
                    <TableCell>{item.selling_price}</TableCell>
                    <TableCell>{getStatusBadge(item.payment_status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Request Supply Section */}
      <div className="mt-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Request for Product Supply</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: trigger supply request mutation
                alert("Supply request sent (mock)");
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Input placeholder="Product Name" required />
              <Input placeholder="Quantity Needed" type="number" required />
              <div className="md:col-span-2">
                <Button type="submit" className="w-full">
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
