// components/inventory/SupplyRequestForm.jsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/use-user";

const schema = z.object({
  product_id: z.string().min(1, "Select a product"),
  requested_quantity: z.coerce.number().int().positive("Must be a positive number"),
});

export default function SupplyRequestForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      product_id: "",
      requested_quantity: 1,
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest("GET", `${BASE_URL}/api/products`),
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      apiRequest("POST", `${BASE_URL}/api/supply-requests`, data),
    onSuccess: () => {
      toast({ title: "Supply request submitted." });
      queryClient.invalidateQueries(["supply-requests"]);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  const onSubmit = (values) => {
    mutation.mutate({
      product_id: parseInt(values.product_id),
      requested_quantity: values.requested_quantity,
      store_id: user?.store_id, // ✅ pass store ID
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6 max-w-md">
      <h2 className="text-lg font-semibold">New Supply Request</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Product</label>
        <Select
          value={form.watch("product_id")}
          onValueChange={(value) => form.setValue("product_id", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {(products || []).map((prod) => (
              <SelectItem key={prod.id} value={String(prod.id)}>
                {prod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.product_id && (
          <p className="text-sm text-red-500">{form.formState.errors.product_id.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Requested Quantity</label>
        <Input
          type="number"
          {...form.register("requested_quantity")}
          min={1}
        />
        {form.formState.errors.requested_quantity && (
          <p className="text-sm text-red-500">{form.formState.errors.requested_quantity.message}</p>
        )}
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
