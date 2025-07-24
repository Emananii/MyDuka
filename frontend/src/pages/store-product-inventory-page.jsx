// import { useQuery, useMutation } from "@tanstack/react-query";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { stockAdjustmentSchema } from "@/shared/schema";
// import { BASE_URL } from "@/lib/constants";
// import { apiRequest, queryClient } from "@/lib/queryClient";
// import { useToast } from "@/hooks/use-toast";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";

// export default function StoreProductInventoryPage() {
//   const { toast } = useToast();

//   // Fetch inventory
//   const { data: inventory = [], isLoading, isError } = useQuery({
//     queryKey: [`${BASE_URL}/store-products`],
//     queryFn: async () => {
//       const res = await fetch(`${BASE_URL}/store-products`);
//       if (!res.ok) throw new Error("Failed to fetch store inventory");
//       return await res.json();
//     },
//   });

//   // Stock adjustment form setup
//   const form = useForm({
//     resolver: zodResolver(stockAdjustmentSchema),
//     defaultValues: {
//       store_product_id: "",
//       adjustment: "",
//       reason: "",
//     },
//   });

//   const mutation = useMutation({
//     mutationFn: (data) =>
//       apiRequest("POST", `${BASE_URL}/stock-adjustments`, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/store-products`] });
//       toast({ title: "Success", description: "Stock adjusted successfully." });
//       form.reset();
//     },
//     onError: (error) => {
//       toast({
//         title: "Error",
//         description: error.message || "Stock adjustment failed",
//         variant: "destructive",
//       });
//     },
//   });

//   const onSubmit = (data) => {
//     mutation.mutate(data);
//   };

//   if (isError) {
//     toast({
//       title: "Error",
//       description: "Could not load store inventory.",
//       variant: "destructive",
//     });
//   }

//   return (
//     <div className="p-6 space-y-8">
//       <h1 className="text-2xl font-bold mb-4">Store Product Inventory</h1>

//       <div className="overflow-x-auto">
//         <table className="min-w-full border">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="px-4 py-2 text-left">Store</th>
//               <th className="px-4 py-2 text-left">Product</th>
//               <th className="px-4 py-2 text-left">SKU</th>
//               <th className="px-4 py-2 text-left">Unit</th>
//               <th className="px-4 py-2 text-left">Category</th>
//               <th className="px-4 py-2 text-left">Quantity</th>
//             </tr>
//           </thead>
//           <tbody>
//             {isLoading ? (
//               <tr>
//                 <td colSpan="6" className="px-4 py-2 text-center">Loading...</td>
//               </tr>
//             ) : inventory.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="px-4 py-2 text-center">No inventory data available.</td>
//               </tr>
//             ) : (
//               inventory.map((item) => (
//                 <tr key={item.id} className="border-t">
//                   <td className="px-4 py-2">{item.store?.name}</td>
//                   <td className="px-4 py-2">{item.product?.name}</td>
//                   <td className="px-4 py-2">{item.product?.sku}</td>
//                   <td className="px-4 py-2">{item.product?.unit}</td>
//                   <td className="px-4 py-2">{item.product?.category?.name}</td>
//                   <td className="px-4 py-2">{item.quantity}</td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="mt-8">
//         <h2 className="text-lg font-semibold mb-2">Adjust Stock</h2>
//         <Form {...form}>
//           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
//             <FormField
//               control={form.control}
//               name="store_product_id"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Store Product ID</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter store_product_id" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <FormField
//               control={form.control}
//               name="adjustment"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Adjustment Quantity</FormLabel>
//                   <FormControl>
//                     <Input type="number" placeholder="Enter adjustment amount" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <FormField
//               control={form.control}
//               name="reason"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Reason</FormLabel>
//                   <FormControl>
//                     <Input placeholder="Enter reason for adjustment" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             <Button
//               type="submit"
//               className="bg-blue-600 hover:bg-blue-700"
//               disabled={mutation.isPending}
//             >
//               {mutation.isPending ? "Submitting..." : "Submit Adjustment"}
//             </Button>
//           </form>
//         </Form>
//       </div>
//     </div>
//   );
// }
