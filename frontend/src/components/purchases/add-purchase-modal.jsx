import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { Trash2 } from "lucide-react";

// ------------------ Validation Schema ------------------
const formSchema = z.object({
  supplier_id: z.coerce.number().min(1, "Supplier is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().min(1, "Item is required"),
        quantity: z.coerce.number().min(1, "Minimum quantity is 1"),
        unit_cost: z.coerce.number().min(0, "Unit cost required"),
      })
    )
    .min(1, "At least one item is required"),
});

// ------------------ Component ------------------
export default function AddPurchaseModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/suppliers`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: undefined,
      notes: "",
      items: [],
    },
  });

  const addItem = (product) => {
    const updated = [
      ...items,
      {
        product_id: product.id,
        quantity: 1,
        unit_cost: parseFloat(product.unit_cost ?? "0"),
      },
    ];
    setItems(updated);
    form.setValue("items", updated);
    setSearchQuery("");
  };

  const removeItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    form.setValue("items", updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
    form.setValue("items", updated);
  };

  const calculateTotal = (list = []) => {
    return list.reduce((sum, item) => {
      const q = parseInt(item.quantity) || 0;
      const u = parseFloat(item.unit_cost) || 0;
      return sum + q * u;
    }, 0);
  };

  const createPurchaseMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.items || data.items.length === 0) {
        throw new Error("At least one purchase item is required.");
      }

      const purchase = await apiRequest("POST", `${BASE_URL}/purchases`, {
        supplier_id: data.supplier_id,
        total_cost: calculateTotal(data.items).toFixed(2),
        notes: data.notes,
        items: data.items, // ✅ Now included in the payload
      });

      return purchase;
    },
    onSuccess: () => {
      toast({
        title: "Purchase recorded",
        description: "The new purchase has been added successfully.",
      });

      setTimeout(() => {
        form.reset();
        setItems([]);
        setSearchQuery("");
        onClose();
        window.location.reload();
      }, 1500);

      queryClient.invalidateQueries({ queryKey: ["/purchases"] });
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Could not create purchase",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    createPurchaseMutation.mutate({ ...data, items });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Add New Purchase
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Supplier Select */}
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select
                    value={(field.value ?? "").toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Search and Add */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Products
              </label>
              <Input
                type="text"
                placeholder="Type to search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="mt-2 border rounded shadow bg-white max-h-48 overflow-auto">
                  {filteredProducts.length === 0 && (
                    <div className="p-2 text-sm text-gray-500">No products found</div>
                  )}
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => addItem(product)}
                    >
                      {product.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-700">Selected Items</h4>
              {items.map((item, index) => {
                const subtotal = (item.quantity * item.unit_cost).toFixed(2);
                const product = products.find((p) => p.id === item.product_id);

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-6 items-center gap-4 p-4 border rounded-lg shadow-sm"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Product</label>
                      <Input readOnly value={product?.name ?? ""} className="bg-gray-100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Qty</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity.toString()}
                        onChange={(e) =>
                          handleItemChange(index, "quantity", parseInt(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost.toString()}
                        onChange={(e) =>
                          handleItemChange(index, "unit_cost", parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                      <Input readOnly value={`KSH ${subtotal}`} className="bg-gray-100" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeItem(index)}>
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Cost</label>
              <Input
                type="text"
                readOnly
                value={`KSH ${calculateTotal(items).toFixed(2)}`}
                className="bg-gray-100"
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Footer Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createPurchaseMutation.isPending}
              >
                {createPurchaseMutation.isPending ? "Adding..." : "Add Purchase"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
