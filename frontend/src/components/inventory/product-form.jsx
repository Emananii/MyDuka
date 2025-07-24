import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventoryItemSchema } from "@/shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import { useEffect, useState } from "react";

export default function ProductForm({ initialData = null, onSuccess }) {
  const { toast } = useToast();
  const mode = initialData ? "edit" : "create";

  const form = useForm({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: initialData || {
      name: "",
      sku: "",
      unit: "",
      description: "",
      category_id: "",
      image_url: "",
    },
  });

  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const subscription = form.watch((values) => {
      setPreviewUrl(values.image_url);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const { data } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/categories`);
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const categories = Array.isArray(data)
    ? data
    : data?.categories || [];

  const mutation = useMutation({
    mutationFn: async (formData) => {
      const url = initialData
        ? `${BASE_URL}/products/${initialData.id}`
        : `${BASE_URL}/products`;
      const method = initialData ? "PATCH" : "POST";
      return apiRequest(method, url, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Success",
        description: `Product ${mode === "edit" ? "updated" : "created"} successfully`,
      });
      onSuccess?.();
      form.reset();
      setPreviewUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data) => mutation.mutate(data);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* SKU */}
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="Unique code" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit */}
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl>
                <Input placeholder="e.g. pcs, kg, box" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select
                  value={field.value?.toString() ?? ""}
                  onValueChange={(val) => field.onChange(parseInt(val))}
                >
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image URL */}
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormMessage />
              {previewUrl && (
                <div className="mt-2 border rounded-lg p-2 w-40 h-40 flex items-center justify-center">
                  {/* Display only if valid URL */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving..."
              : mode === "edit"
              ? "Update Product"
              : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
