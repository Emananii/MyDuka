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
import { useUser } from '@/context/UserContext'; // ⭐ FIX: Import the user context

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

const API_PREFIX = "/api/inventory";
const STORE_API_PREFIX = "/api/store";

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
  const { user: currentUser } = useUser(); // ⭐ FIX: Get the current user
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
    queryKey: ['categories', API_PREFIX],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", `${BASE_URL}${API_PREFIX}/categories`);
        // Ensure the data is always an array of categories
        return Array.isArray(data) ? data : data.categories || [];
      } catch (error) {
        throw new Error(error.message || "Failed to fetch categories");
      }
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // --- Tanstack Query: Fetch Stores ---
  const { data: stores = [] } = useQuery({
    queryKey: ["stores", STORE_API_PREFIX],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", `${BASE_URL}${STORE_API_PREFIX}/`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        throw new Error(error.message || "Failed to fetch stores");
      }
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // --- Tanstack Query: Fetch Products for the Selected Store (Updated Logic) ---
  const {
    data: productsData = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    error: productsError,
  } = useQuery({
    queryKey: ['posProducts', selectedStoreId, debouncedSearchTerm, sortOrder, selectedCategory],
    queryFn: async ({ queryKey }) => {
      const [_key, currentStoreId, currentSearchTerm, currentSortOrder, currentCategory] = queryKey;
      
      console.log('Fetching products with:', {
        currentStoreId,
        currentSearchTerm,
        currentSortOrder,
        currentCategory,
      });

      if (!currentStoreId || currentStoreId <= 0) {
        return [];
      }

      try {
        // Build the URL with parameters similar to inventory page
        const params = new URLSearchParams();
        if (currentSearchTerm) {
          params.append('search', currentSearchTerm);
        }
        if (currentCategory && currentCategory !== 'all') {
          params.append('category_id', currentCategory);
        }
        if (currentSortOrder) {
          params.append('sort_order', currentSortOrder);
        }

        const storeProductsUrl = `${BASE_URL}${API_PREFIX}/stock/${currentStoreId}?${params.toString()}`;
        console.log('Fetching from URL:', storeProductsUrl);
        
        const storeProducts = await apiRequest("GET", storeProductsUrl);
        const products = Array.isArray(storeProducts) ? storeProducts : [];
        
        console.log('Received products:', products);
        
        // Transform the data to match what your POS components expect
        return products.map(item => ({
          ...item,
          // Ensure consistent naming for POS components
          product_name: item.product_name || item.name,
          // Add any other transformations needed
        }));
        
      } catch (error) {
        console.error("Failed to fetch products for store:", error);
        throw new Error(error.message || "Failed to fetch products");
      }
    },
    // The query is only enabled if the selectedStoreId is a number greater than 0
    enabled: selectedStoreId > 0 && stores.length > 0,
    // Set staleTime for better performance
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  // Ensure 'products' is always an array
  const products = productsData || [];

  // --- Tanstack Query: Create Sale Mutation ---
  const createSaleMutation = useMutation({
    mutationFn: (saleData) => apiRequest("POST", `${BASE_URL}/sales`, saleData),
    onSuccess: async (data) => {
      // Invalidate relevant queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['cashierSales'] }); // ⭐ FIX: Invalidate cashier sales query
      // Invalidate products in stock for the current store to reflect quantity changes
      queryClient.invalidateQueries({ queryKey: ['posProducts', selectedStoreId] });

      const createdSaleId = data.sale_id;
      const saleTotal = parseFloat(data.total);

      const nowIsoString = new Date().toISOString();

      // --- START: Frontend reconstruction of saleDetails to match schema (WORKAROUND) ---
      const mappedSaleItemsForModal = cartItems.map((cartItem, index) => {
        const fullProductDetails = products.find(p => p.store_product_id === cartItem.store_product_id);

        // Define a function to validate and format dates
        const getValidDatetimeString = (dateInput) => {
          if (!dateInput) return nowIsoString;
          try {
            const date = new Date(dateInput);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            // Ignore parsing errors, fall through to default
          }
          return nowIsoString;
        };

        // Default/placeholder values for nested objects if product details are not found
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
          description: null,
          category_id: null,
          image_url: fullProductDetails.image_url || null,
          is_deleted: false,
          created_at: getValidDatetimeString(fullProductDetails.created_at),
          updated_at: getValidDatetimeString(fullProductDetails.updated_at),
        } : defaultProductBase;

        // Construct the full store_product object
        const storeProductForSaleItem = fullProductDetails ? {
          id: fullProductDetails.store_product_id,
          store_id: fullProductDetails.store_id || selectedStoreId,
          product_id: fullProductDetails.product_id,
          quantity_in_stock: fullProductDetails.quantity_in_stock,
          quantity_spoilt: 0,
          low_stock_threshold: fullProductDetails.low_stock_threshold,
          price: fullProductDetails.price,
          last_updated: getValidDatetimeString(fullProductDetails.last_updated),
          is_deleted: false,
          created_at: getValidDatetimeString(fullProductDetails.created_at),
          updated_at: getValidDatetimeString(fullProductDetails.updated_at),
          product: productForStoreProduct,
        } : { ...defaultStoreProductBase, product: productForStoreProduct };

        return {
          id: index + 1,
          sale_id: createdSaleId,
          store_product_id: cartItem.store_product_id,
          quantity: cartItem.quantity,
          price_at_sale: cartItem.price,
          is_deleted: false,
          created_at: nowIsoString,
          updated_at: nowIsoString,
          store_product: storeProductForSaleItem,
        };
      });

      // ⭐ FIX: Use the actual currentUser details for the modal
      const detailsForModal = {
        id: createdSaleId,
        total: saleTotal,
        store_id: selectedStoreId,
        cashier_id: currentUser.id,
        sale_items: mappedSaleItemsForModal,
        payment_status: 'paid',
        is_deleted: false,
        created_at: nowIsoString,
        updated_at: nowIsoString,
        cashier: {
          id: currentUser.id,
          name: currentUser.name || 'POS Cashier',
          email: currentUser.email || 'cashier@example.com',
          role: 'cashier',
          is_active: true,
          created_by: null,
          store_id: selectedStoreId,
          created_at: nowIsoString,
          updated_at: nowIsoString,
          is_deleted: false,
        },
        store: {
          id: selectedStoreId, name: `Store ${selectedStoreId}`, address: '123 Retail St',
          created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false,
        },
      };

      try {
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
        setLastSaleDetails({
          id: createdSaleId, total: saleTotal, sale_items: [], payment_status: 'paid',
          created_at: nowIsoString, updated_at: nowIsoString, is_deleted: false,
          store_id: selectedStoreId, cashier_id: currentUser.id, // ⭐ FIX: Use currentUser.id
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
    const currentCashierId = currentUser?.id; // ⭐ FIX: Use the logged-in user's ID

    if (!currentUser || !currentCashierId) {
      toast({
        title: "User Not Logged In",
        description: "Please log in as a cashier to process sales.",
        variant: "destructive",
        duration: 2500,
      });
      return;
    }
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
  }, [cartItems, toast, createSaleMutation, selectedStoreId, currentUser]); // ⭐ FIX: Add currentUser to dependencies

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

  // Display error message if products failed to load
  useEffect(() => {
    if (isErrorProducts) {
      toast({
        title: "Error loading products",
        description: productsError?.message || "Could not load products for the selected store.",
        variant: "destructive",
      });
    }
  }, [isErrorProducts, productsError, toast]);

  // --- Access Control: Render a message if not a cashier ---
  if (!currentUser || currentUser.role !== 'cashier') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="p-8 text-center bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You must be logged in as a cashier to access the POS interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-interface-container flex h-screen overflow-hidden bg-gray-100">
      {/* Left Panel: Cart and Checkout Summary */}
      <div className="flex flex-col w-full md:w-2/5 p-4 bg-gray-50 border-r border-gray-200">
        <div className="mb-4">
          <Label htmlFor="store-id-select" className="block text-sm font-medium text-gray-700 mb-1">
            Selected Store
          </Label>
          <Select 
            value={selectedStoreId.toString()} 
            onValueChange={(value) => setSelectedStoreId(parseInt(value, 10))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(!selectedStoreId || selectedStoreId === 0) && (
            <p className="text-red-500 text-xs mt-1">Please select a store to see products.</p>
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
