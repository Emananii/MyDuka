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
import { Search, Plus, Edit, Trash2, ArrowUpDown, Loader2 } from "lucide-react";

import AddItemModal from "@/components/inventory/add-item-modal";
import EditItemModal from "@/components/inventory/edit-item-modal";

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext"; // Import the useUser hook

// API prefixes are now defined locally for clarity in this component
const API_PREFIX = "/api/inventory";
const STORE_API_PREFIX = "/api/store";

export default function AdminInventory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteItemType, setConfirmDeleteItemType] = useState(null);

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const { toast } = useToast();
  // Use the user context to get the current user and loading state
  const { user, isLoading: userLoading } = useUser();

  // Fetch categories using a dedicated query
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", `${BASE_URL}${API_PREFIX}/categories`);
        return Array.isArray(data) ? data : data.categories || [];
      } catch (error) {
        throw new Error(error.message || "Failed to fetch categories");
      }
    },
    // Ensure this query is also enabled only when the user is not loading
    enabled: !userLoading,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // Fetch the specific admin's store details to display the name
  const { data: adminStore, isLoading: isLoadingStore, isError: isStoreError } = useQuery({
    queryKey: ["adminStore"], // The query key no longer needs the store ID
    queryFn: async () => {
      try {
        // Fetch the user's assigned store using the new endpoint
        const data = await apiRequest("GET", `${BASE_URL}${STORE_API_PREFIX}/my-store`);
        return data;
      } catch (error) {
        throw new Error(error.message || "Failed to fetch admin's store details");
      }
    },
    // The query is only enabled when we have a user and they are not loading
    enabled: !userLoading && !!user,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // --- START of refactored data fetching logic ---
  // Main query for fetching inventory items for the admin's store
  const {
    data: items = [],
    isLoading: isLoadingItems,
    isError: isItemsError,
    error: itemsError,
  } = useQuery({
    queryKey: ["adminInventoryItems", { adminStoreId: adminStore?.id, categoryFilter, searchTerm }],
    queryFn: async ({ queryKey }) => {
      // Destructure parameters from the queryKey
      const { adminStoreId, categoryFilter, searchTerm } = queryKey[1];

      // If no store ID is available, return an empty array
      if (!adminStoreId) return [];

      // Build the URL with search and category filters
      const params = new URLSearchParams();
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (categoryFilter !== "all") {
        params.append("category_id", categoryFilter);
      }

      const storeProductsUrl = `${BASE_URL}${API_PREFIX}/stock/${adminStoreId}?${params.toString()}`;
      
      try {
        const storeProducts = await apiRequest("GET", storeProductsUrl);
        return Array.isArray(storeProducts) ? storeProducts : [];
      } catch (error) {
        console.error("Failed to fetch store inventory:", error);
        throw new Error("Failed to fetch store inventory.");
      }
    },
    // The query is only enabled when we have an admin store ID, which now depends on the user being loaded
    enabled: !!adminStore?.id,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
  // --- END of refactored data fetching logic ---

  useEffect(() => {
    if (isItemsError) {
      toast({
        title: "Error fetching inventory",
        description: itemsError.message || "Could not load inventory for the selected store.",
        variant: "destructive",
      });
    }
    if (isStoreError) {
      toast({
        title: "Error fetching store",
        description: "Could not load details for the admin's store.",
        variant: "destructive",
      });
    }
  }, [isItemsError, itemsError, isStoreError, toast]);

  const deleteItemMutation = useMutation({
    mutationFn: async ({ id }) => {
      // Since we are only viewing a single store's inventory,
      // we are always deleting a store_product, not a global product.
      return apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/store_products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminInventoryItems"] });
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getStockStatus = useCallback((item) => {
    if (item.quantity_in_stock === null || item.quantity_in_stock === undefined) {
      return "not-applicable";
    }
    if (item.quantity_in_stock === 0) return "out-of-stock";
    if (item.low_stock_threshold !== null && item.low_stock_threshold !== undefined && item.quantity_in_stock <= item.low_stock_threshold) return "low-stock";
    return "in-stock";
  }, []);

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

  const filteredAndSortedItems = useMemo(() => {
    let currentItems = items;

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

    if (categoryFilter !== "all") {
      currentItems = currentItems.filter((item) => {
        const itemCategoryName = item.category_name || categories.find(cat => cat.id === item.category_id)?.name;
        const filterCategoryName = categories.find(cat => cat.id.toString() === categoryFilter)?.name;
        return itemCategoryName === filterCategoryName;
      });
    }

    if (stockFilter !== "all") {
      currentItems = currentItems.filter((item) => {
        const stockStatus = getStockStatus(item);
        return stockStatus === stockFilter;
      });
    }

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


  // Display a loading state while user or store data is being fetched
  if (userLoading || isLoadingStore) {
    return (
      <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen text-center flex items-center justify-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading Inventory...
        </h1>
      </div>
    );
  }

  // Handle case where user is not an admin or is not logged in
  if (!user) {
    return (
        <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen text-center flex items-center justify-center">
            <h1 className="text-2xl font-bold text-red-600">You must be logged in to view this page.</h1>
        </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        {adminStore ? (
          <h1 className="text-3xl font-bold text-gray-800">{adminStore.name} Inventory</h1>
        ) : (
          <h1 className="text-3xl font-bold text-gray-800">Admin Inventory</h1>
        )}
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
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
                <TableHead onClick={() => handleSort("stock_level")} className="cursor-pointer text-right">
                  <div className="flex items-center justify-end">Stock Level <ArrowUpDown className="ml-1 h-3 w-3" /></div>
                </TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingItems ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedItems.length ? (
                filteredAndSortedItems.map((item) => (
                  <TableRow key={item.store_product_id}>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell className="font-medium flex items-center gap-3">
                      <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.image_url || "https://placehold.co/40x40/f7f7f7/333?text=Product"}
                          alt={item.product_name || item.name}
                          className="w-10 h-10 rounded object-cover border"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/f7f7f7/333?text=Product" }}
                        />
                      </a>
                      {item.product_name || item.name}
                    </TableCell>
                    <TableCell>
                      {item.category_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity_in_stock !== null && item.quantity_in_stock !== undefined ?
                        `${item.quantity_in_stock} ${item.unit || ''}` : <span className="text-gray-500">N/A</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">{getStockBadge(getStockStatus(item))}</TableCell>
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
                            setConfirmDeleteId(item.store_product_id);
                            setConfirmDeleteItemType("store_product");
                          }}
                          disabled={deleteItemMutation.isPending}
                          className="text-red-500 hover:bg-red-50"
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

      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        storeId={adminStore?.id}
      />
      <EditItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        item={selectedItem}
        currentStoreId={adminStore?.id}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this item from this store's inventory?
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
                  deleteItemMutation.mutate({ id: confirmDeleteId });
                }}
                disabled={deleteItemMutation.isPending}
              >
                {deleteItemMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
