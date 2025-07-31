import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, ArrowUpDown } from "lucide-react";

import AddItemModal from "@/components/inventory/add-item-modal";
import EditItemModal from "@/components/inventory/edit-item-modal";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";

// API endpoints for inventory and store management
const API_PREFIX = "/api/inventory";
const STORE_API_PREFIX = "/api/store";

export default function MerchantInventory() {
  // State for modal visibility and selected items
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteItemType, setConfirmDeleteItemType] = useState(null);

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const { toast } = useToast();

  // --- Data Fetching Queries ---

  // Fetch all available categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", API_PREFIX],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", `${BASE_URL}${API_PREFIX}/categories`);
        return Array.isArray(data) ? data : data.categories || [];
      } catch (error) {
        throw new Error(error.message || "Failed to fetch categories");
      }
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Fetch all stores to populate the store filter dropdown
  const { data: stores = [], isLoading: isLoadingStores, isError: isStoreError } = useQuery({
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

  // Fetch inventory items based on selected filters
  const {
    data: items = [],
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError
  } = useQuery({
    queryKey: ["inventoryItems", storeFilter, categoryFilter, searchTerm],
    queryFn: async ({ queryKey }) => {
      const [_key, currentStoreFilter, currentCategoryFilter, currentSearchTerm] = queryKey;

      if (currentStoreFilter === "all") {
        // Fetch all products when "All Stores" is selected
        const productsUrl = `${BASE_URL}${API_PREFIX}/products`;
        const products = await apiRequest("GET", productsUrl);

        return Array.isArray(products) ? products.map(item => ({
          ...item,
          quantity_in_stock: null,
          low_stock_threshold: null,
          price: null,
          store_product_id: null,
          product_name: item.name,
          category_name: categories.find(cat => cat.id === item.category_id)?.name || 'N/A'
        })) : [];
      } else {
        // Fetch inventory for a specific store
        const params = new URLSearchParams();
        if (currentSearchTerm) {
            params.append('search', currentSearchTerm);
        }
        if (currentCategoryFilter !== 'all') {
            params.append('category_id', currentCategoryFilter);
        }

        const storeProductsUrl = `${BASE_URL}${API_PREFIX}/stock/${currentStoreFilter}?${params.toString()}`;
        const storeProducts = await apiRequest("GET", storeProductsUrl);
        return Array.isArray(storeProducts) ? storeProducts : [];
      }
    },
    // Only run the query when stores are loaded or when the filter is "all"
    enabled: !!stores.length || storeFilter === "all",
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Show a toast notification if there's an error fetching items
  useEffect(() => {
    if (isItemsError) {
      toast({
        title: "Error fetching inventory",
        description: itemsError.message || "Could not load inventory for the selected store.",
        variant: "destructive",
      });
    }
  }, [isItemsError, itemsError, toast]);

  // --- Mutations ---

  // Mutation for deleting an item
  const deleteItemMutation = useMutation({
    mutationFn: async ({ id, type }) => {
      if (type === "product") {
        // Delete a product from all stores
        return apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/products/${id}`);
      } else if (type === "store_product") {
        // Delete a product from a specific store's inventory
        return apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/store_products/${id}`);
      }
      throw new Error("Invalid item type for deletion.");
    },
    onSuccess: () => {
      // Invalidate queries to refetch data after a successful deletion
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Success", description: "Item deleted successfully" });
      setConfirmDeleteId(null);
      setConfirmDeleteItemType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  // --- Helper Functions ---

  // Function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Determine the stock status of an item
  const getStockStatus = useCallback((item) => {
    if (storeFilter === "all" || item.quantity_in_stock === null || item.quantity_in_stock === undefined) {
      return "not-applicable";
    }
    if (item.quantity_in_stock === 0) return "out-of-stock";
    if (item.low_stock_threshold !== null && item.low_stock_threshold !== undefined && item.quantity_in_stock <= item.low_stock_threshold) return "low-stock";
    return "in-stock";
  }, [storeFilter]);

  // Return the appropriate badge for the stock status
  const getStockBadge = (status) => {
    switch (status) {
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "low-stock":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case "in-stock":
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
      case "not-applicable":
        return <Badge variant="secondary">N/A</Badge>;
      default:
        return null;
    }
  };

  // Filter and sort the items based on the current state
  const filteredAndSortedItems = useMemo(() => {
    let currentItems = items;

    // Apply search filter
    if (searchTerm) {
      currentItems = currentItems.filter((item) => {
        const itemName = item.product_name || item.name || "";
        const itemSku = item.sku || "";
        return (
          itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          itemSku.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      currentItems = currentItems.filter((item) => {
        const itemCategoryName = item.category_name || categories.find(cat => cat.id === item.category_id)?.name;
        const filterCategoryName = categories.find(cat => cat.id.toString() === categoryFilter)?.name;
        return itemCategoryName === filterCategoryName;
      });
    }

    // Apply stock filter
    if (stockFilter !== "all") {
      currentItems = currentItems.filter((item) => {
        const stockStatus = getStockStatus(item);
        return stockStatus === stockFilter;
      });
    }

    // Sort the filtered items
    const sortedItems = [...currentItems].sort((a, b) => {
      let aValue;
      let bValue;

      if (sortField === "name") {
        aValue = a.product_name || a.name;
        bValue = b.product_name || b.name;
      } else if (sortField === "sku") {
        aValue = a.sku;
        bValue = b.sku;
      } else if (sortField === "stock_level") {
        aValue = a.quantity_in_stock;
        bValue = b.quantity_in_stock;
        if (aValue === null || aValue === undefined) return sortOrder === "asc" ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortOrder === "asc" ? -1 : 1;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

    return sortedItems;
  }, [items, searchTerm, categoryFilter, stockFilter, sortField, sortOrder, categories, getStockStatus]);

  // --- Component JSX ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Merchant Inventory</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {isLoadingStores ? (
                    <SelectItem disabled value="loading">
                      Loading...
                    </SelectItem>
                  ) : isStoreError ? (
                    <SelectItem disabled value="error">
                      Error loading stores
                    </SelectItem>
                  ) : (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id.toString()}>
                        {store.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead onClick={() => handleSort("sku")} className="cursor-pointer">
                  <div className="flex items-center">SKU <ArrowUpDown className="ml-1 h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                  <div className="flex items-center">Name <ArrowUpDown className="ml-1 h-3 w-3" /></div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead onClick={() => handleSort("stock_level")} className="cursor-pointer">
                  <div className="flex items-center">Stock Level <ArrowUpDown className="ml-1 h-3 w-3" /></div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingItems ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedItems.length ? (
                filteredAndSortedItems.map((item) => (
                  <TableRow key={item.store_product_id || item.id}>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell className="flex items-center gap-3">
                      <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.image_url || "/placeholder.png"}
                          alt={item.product_name || item.name}
                          className="w-10 h-10 rounded object-cover border"
                        />
                      </a>
                      {item.product_name || item.name}
                    </TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell>
                      {item.quantity_in_stock !== null && item.quantity_in_stock !== undefined ?
                        `${item.quantity_in_stock} ${item.unit || ''}` : <span className="text-gray-500">N/A</span>
                      }
                    </TableCell>
                    <TableCell>{getStockBadge(getStockStatus(item))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedItem(item);
                          setIsEditModalOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setConfirmDeleteId(storeFilter === "all" ? item.id : item.store_product_id);
                            setConfirmDeleteItemType(storeFilter === "all" ? "product" : "store_product");
                          }}
                          disabled={deleteItemMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={selectedItem}
        currentStoreId={storeFilter !== "all" ? parseInt(storeFilter) : null}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <p className="text-sm text-gray-800 mb-4">
              Are you sure you want to delete this {confirmDeleteItemType === 'product' ? 'product permanently from all stores' : 'item from this store\'s inventory'}?
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="ghost" onClick={() => {
                setConfirmDeleteId(null);
                setConfirmDeleteItemType(null);
              }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteItemMutation.mutate({ id: confirmDeleteId, type: confirmDeleteItemType });
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
