import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "@/utils/axios"; // Assuming your axios instance is set up for auth
import { useUser } from "@/context/UserContext"; // To get the clerk's store_id

export function AddSupplyRequest({ isOpen, onClose, onSupplyRequestAdded }) {
  const { toast } = useToast();
  const { user } = useUser(); // Access the current user from UserContext
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch list of products when the modal opens
  useEffect(() => {
    if (isOpen) {
      axios.get('/api/products') // Adjust this endpoint if clerks should only see certain products
        .then(response => {
          setProducts(response.data);
        })
        .catch(error => {
          toast({
            variant: "destructive",
            title: "Error fetching products.",
            description: error.response?.data?.message || "Could not load products.",
          });
        });
    }
  }, [isOpen, toast]); // Re-fetch products only when the modal opens

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedProductId || !requestedQuantity || parseInt(requestedQuantity) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a product and enter a valid quantity.",
      });
      setIsSubmitting(false);
      return;
    }

    // Ensure the clerk's store_id is available
    if (!user || !user.store_id) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not determine your associated store. Please log in again.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
      const payload = {
        product_id: parseInt(selectedProductId),
        store_id: user.store_id, // Get the store_id from the clerk's user context
        requested_quantity: parseInt(requestedQuantity),
      };

      const response = await axios.post('/api/supply-requests', payload);

      toast({
        title: "Supply Request Submitted!",
        description: response.data.message || "Your request has been sent for approval.",
      });
      onSupplyRequestAdded(); // Call parent to refresh list
      onClose(); // Close the modal
      
      // Reset form fields after successful submission
      setSelectedProductId("");
      setRequestedQuantity("");

    } catch (error) {
      console.error("Failed to submit supply request:", error);
      toast({
        variant: "destructive",
        title: "Failed to Submit Request",
        description: error.response?.data?.error || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make a Supply Request</DialogTitle>
          <DialogDescription>
            Request products needed for your store. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Product Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="product" className="text-right">
              Product
            </Label>
            <Select onValueChange={setSelectedProductId} value={selectedProductId}>
              <SelectTrigger id="product" className="col-span-3">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.length > 0 ? (
                  products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name} ({product.unit})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-products" disabled>
                    No products available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(e.target.value)}
              className="col-span-3"
              min="1" // Ensure only positive quantities can be requested
              placeholder="e.g., 50"
            />
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}