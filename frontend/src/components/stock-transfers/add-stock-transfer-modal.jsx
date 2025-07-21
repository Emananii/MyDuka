import { useState, useEffect } from "react";
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

// --- Zod Schema ---
const formSchema = z.object({
  transfer_type: z.enum(["IN", "OUT"], {
    required_error: "Transfer type is required",
    invalid_type_error: "Transfer type must be 'IN' or 'OUT'",
  }),
  location_id: z.coerce.number().min(1, "Location is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().min(1, "Item is required"),
        quantity: z.coerce.number().min(1, "Minimum quantity is 1"),
      })
    )
    .min(1, "At least one item is required"),
});

export default function AddStockTransferModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: locations = [] } = useQuery({
    queryKey: ["business_locations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/business_locations`);
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  const activeLocations = locations.filter((loc) => loc.is_active && !loc.is_deleted);

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
      transfer_type: "IN",
      location_id: undefined,
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    const selectedId = form.getValues("location_id");
    const stillValid = activeLocations.some((loc) => loc.id === selectedId);
    if (!stillValid) {
      form.setValue("location_id", undefined);
    }
  }, [locations]);

  const addItem = (product) => {
    const updated = [
      ...items,
      {
        product_id: product.id,
        quantity: 1,
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

  const createTransferMutation = useMutation({
    mutationFn: async (data) => {
      const transfer = await apiRequest("POST", `${BASE_URL}/stock_transfers`, {
        transfer_type: data.transfer_type,
        location_id: data.location_id,
        notes: data.notes,
        items: data.items,
      });
      return transfer;
    },
    onSuccess: () => {
      toast({
        title: "Transfer created",
        description: "The stock transfer has been added successfully.",
      });

      setTimeout(() => {
        form.reset();
        setItems([]);
        setSearchQuery("");
        onClose();
        window.location.reload();
      }, 1500);

      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Could not create transfer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => {
    createTransferMutation.mutate(data);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Create Stock Transfer
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Transfer Type */}
            <FormField
              control={form.control}
              name="transfer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="IN">IN (Stock In)</SelectItem>
                      <SelectItem value="OUT">OUT (Stock Out)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Select */}
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    value={(field.value ?? "").toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Search */}
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
                const product = products.find((p) => p.id === item.product_id);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 p-4 border rounded-lg shadow-sm"
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
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => removeItem(index)}>
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                disabled={createTransferMutation.isPending}
              >
                {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
