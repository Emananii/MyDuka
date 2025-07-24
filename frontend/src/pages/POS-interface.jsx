import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import {
  posProductListSchema,
  insertSaleSchema,
  saleDetailsSchema
} from "@/shared/schema";

import { Link } from "wouter"; // Import Link for the Home button
import { Home } from "lucide-react"; // Import Home icon

// POS Specific Components
import ProductSearchInput from "@/components/pos/product-search-input";
import ProductList from "@/components/pos/product-list";
import CartDisplay from "@/components/pos/cart-display";
import CheckoutSummary from "@/components/pos/checkout-summary";
import TransactionSuccessModal from "@/components/pos/transactional-success-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Custom Hook for Debouncing ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
// --- End Debounce Hook ---

export default function POSInterfacePage() {
  // --- State Management ---
  const [cartItems, setCartItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleDetails, setLastSaleDetails] = useState(null);

  const [selectedStoreId, setSelectedStoreId] = useState(1);

  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- Tanstack Query: Fetch Products for the Selected Store ---
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: productsError,
  } = useQuery({
    queryKey: ['posProducts', selectedStoreId, debouncedSearchTerm],
    queryFn: async () => {
      if (!selectedStoreId) {
        return [];
      }
      const url = new URL(`${BASE_URL}/api/inventory/stock/${selectedStoreId}`);
      if (debouncedSearchTerm) {
        url.searchParams.append('search', debouncedSearchTerm);
      }
      const res = await apiRequest("GET", url.toString());
      return posProductListSchema.parse(res);
    },
    enabled: !!selectedStoreId,
    staleTime: 60 * 1000,
  });

  // --- Tanstack Query: Create Sale Mutation ---
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => apiRequest("POST", `${BASE_URL}/sales`, saleData),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: [`${BASE_URL}/sales`] });
      queryClient.invalidateQueries({ queryKey: ['posProducts', selectedStoreId] });

      const createdSaleId = data.sale_id;
      try {
        const fullSaleDetails = await apiRequest("GET", `${BASE_URL}/sales/${createdSaleId}`);
        setLastSaleDetails(saleDetailsSchema.parse(fullSaleDetails));
        setShowSuccessModal(true);
        setCartItems([]);
        toast({
          title: "Sale Completed!",
          description: `Sale #${createdSaleId} successfully processed.`,
          duration: 3000,
        });
      } catch (fetchError) {
        console.error("Error fetching full sale details after creation:", fetchError);
        setLastSaleDetails({
          id: createdSaleId,
          total: data.total,
          sale_items: [],
          payment_status: 'paid',
          cashier: { name: 'Unknown' },
          store: { name: 'Unknown' }
        });
        setShowSuccessModal(true);
        setCartItems([]);
        toast({
          title: "Sale Completed (Details Error)",
          description: `Sale #${createdSaleId} processed, but failed to load full details.`,
          variant: "warning",
          duration: 4000,
        });
      }
    },
    onError: (error) => {
      console.error("Sale creation error:", error);
      let errorMessage = "Failed to complete sale. Please try again.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `API Error: ${error.response.data.message}`;
      } else if (error.message.includes("400") || error.message.includes("422")) {
        errorMessage = `Input Error: ${error.message.split(':').pop()}`;
      } else if (error.message.includes("500")) {
        errorMessage = "Server error. Please contact support.";
      }
      toast({
        title: "Sale Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // --- Cart Management Callbacks ---
  const handleAddToCart = useCallback((product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.store_product_id === product.store_product_id);

      if (product.quantity_in_stock !== undefined && (existingItem ? existingItem.quantity + 1 : 1) > product.quantity_in_stock) {
        toast({
          title: "Insufficient Stock!",
          description: `Cannot add more "${product.product_name}". Only ${product.quantity_in_stock} in stock.`,
          variant: "destructive",
          duration: 2000,
        });
        return prevItems;
      }
      if (existingItem) {
        return prevItems.map(item =>
          item.store_product_id === product.store_product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, {
          store_product_id: product.store_product_id,
          product_id: product.product_id,
          name: product.product_name,
          price: product.price,
          quantity: 1,
          unit: product.unit,
          sku: product.sku,
        }];
      }
    });
  }, [toast]);

  const handleUpdateCartItem = useCallback((storeProductId, newQuantity) => {
    setCartItems(prevItems => {
      const productInStock = products.find(p => p.store_product_id === storeProductId);

      if (productInStock && newQuantity > productInStock.quantity_in_stock) {
        toast({
          title: "Stock Limit Reached!",
          description: `Cannot set quantity to ${newQuantity} for "${productInStock.product_name}". Only ${productInStock.quantity_in_stock} in stock.`,
          variant: "destructive",
          duration: 2500,
        });
        newQuantity = productInStock.quantity_in_stock;
      }
      const updatedItems = prevItems.map(item =>
        item.store_product_id === storeProductId
          ? { ...item, quantity: newQuantity }
          : item
      );
      return updatedItems.filter(item => item.quantity > 0);
    });
  }, [products, toast]);

  const handleRemoveFromCart = useCallback((storeProductId) => {
    setCartItems(prevItems => prevItems.filter(item => item.store_product_id !== storeProductId));
  }, []);

  // --- Sale Processing Function ---
  const handleProcessSale = useCallback(() => {
    const currentStoreId = selectedStoreId;
    const currentCashierId = 1;

    if (!currentStoreId) {
      toast({
        title: "Store Not Selected",
        description: "Please enter a valid Store ID to process sales.",
        variant: "destructive",
        duration: 2500,
      });
      return;
    }
    if (cartItems.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Please add items to the cart before processing a sale.",
        variant: "destructive",
        duration: 2500,
      });
      return;
    }
    const saleItemsPayload = cartItems.map(item => ({
      store_product_id: item.store_product_id,
      quantity: item.quantity,
      price_at_sale: item.price,
    }));
    const salePayload = {
      store_id: currentStoreId,
      cashier_id: currentCashierId,
      payment_status: 'paid',
      sale_items: saleItemsPayload,
    };
    try {
      insertSaleSchema.parse(salePayload);
      createSaleMutation.mutate(salePayload);
    } catch (validationError) {
      console.error("Sale payload validation error:", validationError);
      toast({
        title: "Validation Error",
        description: validationError.errors ? validationError.errors.map(e => e.message).join(', ') : "Invalid sale data provided.",
        variant: "destructive",
      });
    }
  }, [cartItems, toast, createSaleMutation, selectedStoreId]);

  // --- Close Transaction Success Modal ---
  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setLastSaleDetails(null);
  }, []);

  // --- Print Receipt Handler (Placeholder) ---
  const handlePrintReceipt = useCallback(() => {
    toast({
      title: "Print Receipt",
      description: "Printing functionality is pending integration. Please handle manually.",
      duration: 3000,
    });
  }, [toast]);

  return (
    <div className="pos-interface-container flex h-screen overflow-hidden bg-gray-100">
      {/* Left Panel: Cart and Checkout Summary */}
      <div className="flex flex-col w-full md:w-1/3 p-4 bg-gray-50 border-r border-gray-200">
        <div className="mb-4">
          <Label htmlFor="store-id-select" className="block text-sm font-medium text-gray-700 mb-1">
            Selected Store ID (for demo)
          </Label>
          <Input
            id="store-id-select"
            type="number"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(parseInt(e.target.value) || 0)}
            placeholder="Enter Store ID"
            className="w-full"
            min="1"
          />
          {!selectedStoreId && (
            <p className="text-red-500 text-xs mt-1">Please enter a valid Store ID to see products.</p>
          )}
        </div>
        <div className="flex-grow">
          <CartDisplay
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartItem}
            onRemoveItem={handleRemoveFromCart}
          />
        </div>
        <div className="flex-shrink-0 mt-4">
          <CheckoutSummary
            cartItems={cartItems}
            onProcessSale={handleProcessSale}
            isProcessing={createSaleMutation.isPending}
          />
        </div>
      </div>

      {/* Right Panel: Product Search and List */}
      <div className="flex flex-col flex-grow p-4 bg-white">
        {/* Header for the right panel */}
        <div className="flex-shrink-0">
          {/* Home Button aligned to the top-right */}
          <div className="flex justify-end mb-4">
            <Link href="/">
              <a className="flex items-center justify-center h-10 w-10 rounded-full shadow-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                <Home className="h-5 w-5" />
              </a>
            </Link>
          </div>
          {/* Search bar below the home button */}
          <ProductSearchInput
            value={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
        {/* End of header */}
        
        <div className="flex-grow mt-4">
          <ProductList
            products={products}
            isLoading={isLoadingProducts}
            isError={isErrorProducts}
            error={productsError}
            onAddToCart={handleAddToCart}
            searchTerm={searchTerm}
          />
        </div>
      </div>

      {/* Transaction Success Modal */}
      {showSuccessModal && (
        <TransactionSuccessModal
          isOpen={showSuccessModal}
          onClose={closeSuccessModal}
          saleDetails={lastSaleDetails}
          onPrintReceipt={handlePrintReceipt}
        />
      )}
    </div>
  );
}