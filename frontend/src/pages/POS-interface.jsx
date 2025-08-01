// src/components/POS/POSInterfacePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import {
  posProductListSchema,
  insertSaleSchema,
  saleDetailsSchema,
} from "@/shared/schema";

// Re-import Link and Home icon
import { Link } from "wouter";
import { Home, ArrowDownAZ, ArrowUpAZ } from "lucide-react";

// shadcn/ui components for styling
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// POS Specific Components
import ProductSearchInput from "@/components/pos/product-search-input";
import ProductList from "@/components/pos/product-list";
import CartDisplay from "@/components/pos/cart-display";
import CheckoutSummary from "@/components/pos/checkout-summary";
import TransactionSuccessModal from "@/components/pos/transactional-success-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

  // Default to store 1, but handle invalid input gracefully
  const [selectedStoreId, setSelectedStoreId] = useState(1);

  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { toast } = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // --- Tanstack Query: Fetch Categories ---
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiRequest("GET", `${BASE_URL}/api/inventory/categories`);
      return res;
    },
    staleTime: Infinity,
  });

  // --- Tanstack Query: Fetch Products for the Selected Store ---
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: productsError,
  } = useQuery({
    queryKey: ['posProducts', selectedStoreId, debouncedSearchTerm, sortOrder, selectedCategory],
    queryFn: async () => {
      // Log the parameters to debug when the query is triggered
      console.log('Fetching products with:', {
        selectedStoreId,
        debouncedSearchTerm,
        sortOrder,
        selectedCategory,
      });

      const url = new URL(`${BASE_URL}/api/inventory/stock/${selectedStoreId}`);
      if (debouncedSearchTerm) {
        url.searchParams.append('search', debouncedSearchTerm);
      }
      if (sortOrder) {
        url.searchParams.append('sort_order', sortOrder);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        url.searchParams.append('category_id', selectedCategory);
      }
      const res = await apiRequest("GET", url.toString());
      return posProductListSchema.parse(res);
    },
    // The query is only enabled if the selectedStoreId is a number greater than 0
    enabled: selectedStoreId > 0,
    // Set staleTime to 0 to force a network request every time the queryKey changes.
    // This is useful for debugging to see all network calls.
    staleTime: 0,
  });

  // Ensure 'products' is always an array, even when productsData is undefined
  const products = productsData || [];

  // --- Tanstack Query: Create Sale Mutation ---
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => apiRequest("POST", `${BASE_URL}/sales`, saleData),
    onSuccess: async (data) => {
      // Invalidate relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['sales'] }); // Invalidate general sales list
      // Invalidate products in stock for the current store to reflect quantity changes
      queryClient.invalidateQueries({ queryKey: ['posProducts', selectedStoreId, debouncedSearchTerm, sortOrder, selectedCategory] });

      const createdSaleId = data.sale_id;
      const saleTotal = parseFloat(data.total); // Ensure total is a number

      const nowIsoString = new Date().toISOString();

      // --- START: Frontend reconstruction of saleDetails to match schema (WORKAROUND) ---
      const mappedSaleItemsForModal = cartItems.map((cartItem, index) => {
        const fullProductDetails = products.find(p => p.store_product_id === cartItem.store_product_id);

        // Define a function to validate and format dates
        const getValidDatetimeString = (dateInput) => {
          if (!dateInput) return nowIsoString; // If null/undefined, use current time
          try {
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) { // Check if date is valid
              return date.toISOString();
            }
          } catch (e) {
            // Ignore parsing errors, fall through to default
          }
          return nowIsoString; // If invalid or error, use current time
        };

        // Default/placeholder values for nested objects if product details are not found
        // These base objects include all fields from baseModelSchema and specific schema
        const defaultProductBase = {
          id: 0, name: 'Unknown Product', sku: 'N/A', unit: 'N/A',
          description: null, category_id: null, image_url: null,
          is_deleted: false, created_at: nowIsoString, updated_at: nowIsoString,
        };

        const defaultStoreProductBase = {
          id: cartItem.store_product_id, store_id: selectedStoreId, product_id: 0,
          quantity_in_stock: 0, quantity_spoilt: 0, low_stock_threshold: 0,
          price: cartItem.price, last_updated: nowIsoString,
          is_deleted: false, created_at: nowIsoString, updated_at: nowIsoString,
        };


        // Construct the nested product object for store_product.product
        const productForStoreProduct = fullProductDetails ? {
          id: fullProductDetails.product_id,
          name: fullProductDetails.product_name,
          sku: fullProductDetails.sku || null,
          unit: fullProductDetails.unit,
          description: null, // Assuming this is not in posProductDisplaySchema
          category_id: null, // Assuming this is not in posProductDisplaySchema
          image_url: fullProductDetails.image_url || null,
          is_deleted: false,
          created_at: getValidDatetimeString(fullProductDetails.created_at), // Use helper
          updated_at: getValidDatetimeString(fullProductDetails.updated_at), // Use helper
        } : defaultProductBase;

        // Construct the full store_product object
        const storeProductForSaleItem = fullProductDetails ? {
          id: fullProductDetails.store_product_id,
          store_id: fullProductDetails.store_id || selectedStoreId,
          product_id: fullProductDetails.product_id,
          quantity_in_stock: fullProductDetails.quantity_in_stock,
          quantity_spoilt: 0, // Assuming new sales don't immediately affect spoilt quantity
          low_stock_threshold: fullProductDetails.low_stock_threshold,
          price: fullProductDetails.price, // Use price from fetched stock list
          last_updated: getValidDatetimeString(fullProductDetails.last_updated), // Use helper
          is_deleted: false,
          created_at: getValidDatetimeString(fullProductDetails.created_at), // Use helper
          updated_at: getValidDatetimeString(fullProductDetails.updated_at), // Use helper
          product: productForStoreProduct, // Nested product object
        } : { ...defaultStoreProductBase, product: productForStoreProduct }; // Ensure product is nested for default

        return {
          id: index + 1, // Temporary ID for the sale item
          sale_id: createdSaleId,
          store_product_id: cartItem.store_product_id,
          quantity: cartItem.quantity,
          price_at_sale: cartItem.price,
          is_deleted: false,
          created_at: nowIsoString,
          updated_at: nowIsoString,
          store_product: storeProductForSaleItem, // FULLY NESTED store_product
        };
      });

      const detailsForModal = {
        id: createdSaleId,
        total: saleTotal,
        // --- FIXED: Add top-level store_id and cashier_id ---
        store_id: selectedStoreId,
        cashier_id: 1, // Placeholder: Replace with actual logged-in cashier ID
        // --- END FIXED ---
        sale_items: mappedSaleItemsForModal,
        payment_status: 'paid', // Assuming 'paid' on successful creation
        is_deleted: false,
        created_at: nowIsoString,
        updated_at: nowIsoString,
        // These can be replaced with actual user/store data if available from auth context
        cashier: {
          id: 1, name: 'POS Cashier', email: 'cashier@example.com', role: 'cashier',
          is_active: true, created_by: null, store_id: selectedStoreId,
          created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false,
        },
        store: {
          id: selectedStoreId, name: `Store ${selectedStoreId}`, address: '123 Retail St',
          created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false,
        },
      };

      try {
        // Validate the constructed object against the schema
        saleDetailsSchema.parse(detailsForModal);
        setLastSaleDetails(detailsForModal);
        setShowSuccessModal(true);
        setCartItems([]);
        toast({
          title: "Sale Completed!",
          description: `Sale #${createdSaleId} successfully processed.`,
          duration: 3000,
        });
      } catch (validationError) {
        console.error("Error constructing or parsing sale details for modal:", validationError);
        // Fallback for modal display if local validation fails
        setLastSaleDetails({
          id: createdSaleId, total: saleTotal, sale_items: [], payment_status: 'paid',
          // Ensure these are present even in fallback for minimal schema adherence
          created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false,
          store_id: selectedStoreId, cashier_id: 1,
          cashier: { name: 'Unknown', id: 0, email: 'unknown@example.com', role: 'cashier', is_active: true, created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false },
          store: { name: 'Unknown', id: 0, address: '', created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false }
        });
        setShowSuccessModal(true);
        setCartItems([]);
        toast({
          title: "Sale Completed (Display Issue)",
          description: `Sale #${createdSaleId} processed, but failed to prepare display details due to schema mismatch. Check console.`,
          variant: "destructive",
          duration: 5000,
        });
      }
    }, // --- END: Frontend reconstruction of saleDetails ---
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
          image_url: product.image_url,
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
    const currentCashierId = 1; // Placeholder: Replace with actual logged-in cashier ID

    if (!currentStoreId || currentStoreId <= 0) {
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
      payment_status: 'paid', // Assuming all POS sales are marked as 'paid' immediately
      sale_items: saleItemsPayload,
    };
    try {
      insertSaleSchema.parse(salePayload); // Validate payload before sending
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

  // Toggle sort order between 'asc' and 'desc'
  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="pos-interface-container flex h-screen overflow-hidden bg-gray-100">
      {/* Left Panel: Cart and Checkout Summary */}
      <div className="flex flex-col w-full md:w-2/5 p-4 bg-gray-50 border-r border-gray-200">
        <div className="mb-4">
          <Label htmlFor="store-id-select" className="block text-sm font-medium text-gray-700 mb-1">
            Selected Store ID (for demo)
          </Label>
          <Input
            id="store-id-select"
            type="number"
            value={selectedStoreId || ''} // Use empty string for better UX with null
            onChange={(e) => {
              // Update selectedStoreId, ensuring it's a valid number.
              // Set to 0 for invalid input to keep the query disabled.
              const value = e.target.value;
              const numericValue = parseInt(value, 10);
              setSelectedStoreId(isNaN(numericValue) ? 0 : numericValue);
            }}
            placeholder="Enter Store ID"
            className="w-full"
            min="1"
          />
          {selectedStoreId === 0 && (
            <p className="text-red-500 text-xs mt-1">Please enter a valid Store ID to see products.</p>
          )}
        </div>
        <div className="flex-grow overflow-y-auto pr-2">
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
          {/* Top row with Home button and reduced margin */}
          <div className="flex justify-end mb-2">
            <Link href="/sales/cashier">
              <a className="flex items-center justify-center h-10 w-10 rounded-full shadow-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
                <Home className="h-5 w-5" />
              </a>
            </Link>
          </div>
          {/* Search, Sort, and Filter row with reduced top margin */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2 mb-4 items-center">
            <div className="flex-grow">
              <ProductSearchInput
                value={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            {/* Sort Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              className="flex-shrink-0"
              aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortOrder === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
            </Button>

            {/* Category Filter */}
            <Select onValueChange={setSelectedCategory} value={selectedCategory}>
              <SelectTrigger className="w-[180px] flex-shrink-0">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* End of header */}

        {/* Make this section scrollable */}
        <div className="flex-grow mt-4 overflow-y-auto">
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
