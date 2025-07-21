import { useEffect, useMemo, useState } from "react";
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

import { Trash2, Trash } from "lucide-react";

const formSchema = z.object({
  location_id: z.coerce.number().min(1, "Location is required"),
  notes: z.string().optional(),
});

export default function EditStockTransferModal({ isOpen, onClose, transfer }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);

  const isEditable = useMemo(() => {
    if (!transfer?.date) return false;
    const transferDate = new Date(transfer.date);
    const now = new Date();
    const diffInDays = (now - transferDate) / (1000 * 60 * 60 * 24);
    return diffInDays <= 30;
  }, [transfer]);

  const { data: locations = [] } = useQuery({
    queryKey: ["business_locations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/business_locations`);
      if (!res.ok) throw new Error("Failed to fetch locations");
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
      location_id: transfer?.location_id ?? undefined,
      notes: transfer?.notes ?? "",
    },
  });

  useEffect(() => {
    if (transfer) {
      form.reset({
        location_id: transfer.location_id,
        notes: transfer.notes ?? "",
      });
      setItems(
        (transfer.items ?? []).map((item) => ({
          ...item,
          product_id: item.product?.id,
          quantity: item.quantity.toString(), // track as string
        }))
      );
    }
  }, [transfer, form]);

  const handleItemDelete = async (itemId) => {
    try {
      await apiRequest("DELETE", `${BASE_URL}/stock_transfer_items/${itemId}`);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      toast({
        title: "Item removed",
        description: `Item ${itemId} removed successfully`,
      });
    } catch (error) {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await apiRequest("PUT", `${BASE_URL}/stock_transfers/${transfer.id}`, {
        location_id: data.location_id,
        notes: data.notes,
      });

      for (const item of items) {
        const quantity = parseInt(item.quantity, 10);
        if (!isNaN(quantity) && quantity > 0) {
          await apiRequest("PUT", `${BASE_URL}/stock_transfer_items/${item.id}`, {
            product_id: item.product_id,
            quantity,
          });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast({
        title: "Stock transfer updated",
        description: `Transfer #${transfer.id} updated successfully`,
      });
      setTimeout(() => {
        window.location.href = "/stock-transfers";
      }, 1200);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `${BASE_URL}/stock_transfers/${transfer.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_transfers"] });
      toast({
        title: "Deleted",
        description: `Transfer #${transfer.id} deleted`,
      });
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

  const onSubmit = (data) => {
    updateMutation.mutate(data);
  };

  if (!transfer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Edit Stock Transfer #{transfer.id}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    disabled={!isEditable}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Update notes..."
                      {...field}
                      disabled={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <h4 className="text-md font-semibold text-gray-700">Transfer Items</h4>
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <Select
                      value={item.product_id?.toString() ?? ""}
                      onValueChange={(value) => {
                        const newProductId = parseInt(value);
                        const selectedProduct = products.find(
                          (p) => p.id === newProductId
                        );
                        setItems((prev) =>
                          prev.map((itm, i) =>
                            i === index
                              ? {
                                  ...itm,
                                  product_id: newProductId,
                                  product: selectedProduct,
                                }
                              : itm
                          )
                        );
                      }}
                      disabled={!isEditable}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    type="text"
                    className="w-24"
                    value={item.quantity}
                    onChange={(e) => {
                      const input = e.target.value;
                      if (/^\d*$/.test(input)) {
                        setItems((prev) =>
                          prev.map((itm, i) =>
                            i === index ? { ...itm, quantity: input } : itm
                          )
                        );
                      }
                    }}
                    disabled={!isEditable}
                  />

                  {isEditable && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleItemDelete(item.id)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex space-x-3 pt-4">
              {isEditable ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? "Updating..."
                      : "Update Transfer"}
                  </Button>
                </>
              ) : (
                <Button type="button" className="w-full" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
