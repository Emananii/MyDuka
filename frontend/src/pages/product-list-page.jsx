import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import EditItemModal from "../../components/inventory/EditItemModal";
import AddItemModal from "../../components/inventory/AddItemModal";
import { Button } from "../../components/ui/button";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { BASE_URL } from "../../lib/constants";
import { useToast } from "../../hooks/use-toast";

export default function ProductListPage() {
  const { toast } = useToast();
  const [editItem, setEditItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: [`${BASE_URL}/api/inventory/products`],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/inventory/products`);
      return await res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest("DELETE", `${BASE_URL}/api/inventory/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/api/inventory/products`] });
      toast({ title: "Success", description: "Item deleted successfully." });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventory Products</h1>
        <Button onClick={() => setShowAddModal(true)}>Add Product</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">SKU</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Stock Level</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" className="px-4 py-2 text-center">
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-2 text-center">
                  No products available.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-2">{product.sku}</td>
                  <td className="px-4 py-2">{product.name}</td>
                  <td className="px-4 py-2">{product.category?.name}</td>
                  <td className="px-4 py-2">{product.unit}</td>
                  <td className="px-4 py-2">In Stock</td>
                  <td className="px-4 py-2 flex gap-2">
                    <Button size="sm" onClick={() => setEditItem(product)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(product.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editItem && (
        <EditItemModal
          isOpen={!!editItem}
          onClose={() => setEditItem(null)}
          item={editItem}
        />
      )}
    </div>
  );
}
