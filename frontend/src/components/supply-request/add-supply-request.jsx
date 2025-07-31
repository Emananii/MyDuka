// ClerkSupplyRequest.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
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
import { Loader2 } from "lucide-react";
import axios from "@/utils/axios";
import { useUser } from "@/context/UserContext";

// Custom hook for form management
const useSupplyRequestForm = () => {
  const [formData, setFormData] = useState({
    selectedProductId: "",
    requestedQuantity: "",
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      selectedProductId: "",
      requestedQuantity: "",
    });
  };

  const validateForm = (products, user) => {
    const errors = [];
    
    if (!formData.selectedProductId) {
      errors.push("Please select a product");
    } else if (!products.some(p => p.id === parseInt(formData.selectedProductId))) {
      errors.push("Selected product is not valid");
    }
    
    const quantity = parseInt(formData.requestedQuantity);
    if (!formData.requestedQuantity || isNaN(quantity) || quantity <= 0) {
      errors.push("Please enter a valid quantity greater than 0");
    } else if (quantity > 10000) {
      errors.push("Quantity cannot exceed 10,000");
    }
    
    // Ensure user and store_id are present for the API call
    if (!user?.store_id) {
      errors.push("Your associated store could not be determined. Please log in again.");
    }
    if (!user?.id) {
      errors.push("Your user ID could not be determined. Please log in again.");
    }
    
    return errors;
  };

  return {
    formData,
    updateField,
    resetForm,
    validateForm,
  };
};

// Error handling utility
const handleApiError = (error, toast, context = "operation") => {
  console.error(`Failed ${context}:`, error);
  
  const message = 
    error.response?.data?.message || 
    error.response?.data?.error || 
    `An unexpected error occurred during ${context}. Please try again.`;
  
  toast({
    variant: "destructive",
    title: `${context.charAt(0).toUpperCase() + context.slice(1)} Failed`,
    description: message,
  });
};

export function AddSupplyRequest({ isOpen, onClose, onSupplyRequestAdded }) {
  const { toast } = useToast();
  const { user } = useUser(); // Access the current user from UserContext
  const { formData, updateField, resetForm, validateForm } = useSupplyRequestForm();
  
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await axios.get("/api/inventory/products");
      setProducts(response.data || []);
    } catch (error) {
      handleApiError(error, toast, "product loading");
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm(products, user);
    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationErrors[0], // Show first error
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      product_id: parseInt(formData.selectedProductId),
      store_id: user.store_id, // Send store_id in payload as per new backend
      requested_quantity: parseInt(formData.requestedQuantity),
      clerk_id: user.id, // Send clerk_id in payload as per new backend
    };

    try {
      // CORRECTED API ENDPOINT:
      // Now targeting the new /api/supply-requests/create endpoint
      const response = await axios.post("/api/supply-requests/create", payload);

      toast({
        title: "Supply Request Submitted",
        description: response.data?.message || "Your request has been sent for approval.",
      });

      // Safe callback execution
      if (onSupplyRequestAdded && typeof onSupplyRequestAdded === 'function') {
        onSupplyRequestAdded(); // This triggers the parent to refetch data
      }

      handleClose(); // Close modal and reset form
    } catch (error) {
      handleApiError(error, toast, "supply request submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isFormDisabled = isLoadingProducts || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make a Supply Request</DialogTitle>
          <DialogDescription>
            Request products needed for your store.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Product selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="product" className="text-right">
              Product
            </Label>
            <Select onValueChange={(value) => updateField("selectedProductId", value)} value={formData.selectedProductId} disabled={isFormDisabled}>
              <SelectTrigger id="product" className="col-span-3">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingProducts ? (
                  <SelectItem value="loading" disabled>Loading products...</SelectItem>
                ) : products.length > 0 ? (
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

          {/* Quantity input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={formData.requestedQuantity}
              onChange={(e) => updateField("requestedQuantity", e.target.value)}
              className="col-span-3"
              min="1"
              placeholder="e.g., 50"
              disabled={isFormDisabled}
            />
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isFormDisabled || !formData.selectedProductId || !formData.requestedQuantity}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// PropTypes for better development experience
AddSupplyRequest.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSupplyRequestAdded: PropTypes.func, // Optional with safe handling
};

// Default props to prevent errors
AddSupplyRequest.defaultProps = {
  onSupplyRequestAdded: null, // Will be safely checked before calling
};
