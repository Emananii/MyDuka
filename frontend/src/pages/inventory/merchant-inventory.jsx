
import { useState } from "react";
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

// Define the API prefix based on your Flask blueprint
const API_PREFIX = "/api/inventory"; // This should match your Flask blueprint's url_prefix

export default function Inventory() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    // Use a more specific query key, avoiding the full URL string directly
    // This allows react-query to better manage cache based on relevant data,
    // although using the full URL as key technically works.
    queryKey: ["products", API_PREFIX], // Example: ["products", "/api/inventory"]
    queryFn: async () => {
      // Fetch from the correct endpoint by combining BASE_URL, API_PREFIX, and the resource path
      const res = await fetch(`${BASE_URL}${API_PREFIX}/products`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to fetch products: ${res.statusText}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", API_PREFIX], // Example: ["categories", "/api/inventory"]
    queryFn: async () => {
      // Fetch from the correct endpoint
      const res = await fetch(`${BASE_URL}${API_PREFIX}/categories`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to fetch categories: ${res.statusText}`);
      }
      const data = await res.json();
      // Ensure data structure matches what your backend returns for categories
      // It looks like your backend returns an array directly, so Array.isArray check is good.
      return Array.isArray(data) ? data : data.categories || [];
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => apiRequest("DELETE", `${BASE_URL}${API_PREFIX}/products/${id}`),
    onSuccess: () => {
      // Invalidate using the same key as the products query
      queryClient.invalidateQueries({ queryKey: ["products", API_PREFIX] });
      toast({ title: "Success", description: "Item deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
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

  const getStockStatus = (item) => {
    if (item.stock_level === 0) return "out-of-stock";
    if (item.stock_level <= 5) return "low-stock";
    return "in-stock";
  };

  const getStockBadge = (status) => {
    switch (status) {
      case "out-of-stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "low-stock":
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  const filteredAndSortedItems = items
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || item.category?.id?.toString() === categoryFilter;
      const stockStatus = getStockStatus(item);
      const matchesStock = stockFilter === "all" || stockStatus === stockFilter;
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });

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
                    // Ensure cat.id is converted to string for SelectItem value
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
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
                <TableHead>Stock Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedItems.length ? (
                filteredAndSortedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>{item.sku}</TableCell>
                    <TableCell className="flex items-center gap-3">
                      <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={item.image_url || "/placeholder.png"}
                          alt={item.name}
                          className="w-10 h-10 rounded object-cover border"
                        />
                      </a>
                      {item.name}
                    </TableCell>
                    <TableCell>{item.category?.name}</TableCell>
                    <TableCell>{item.stock_level} {item.unit}</TableCell>
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
                          onClick={() => setConfirmDeleteId(item.id)}
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
                    No inventory items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AddItemModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <EditItemModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} item={selectedItem} />

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <p className="text-sm text-gray-800 mb-4">Are you sure you want to delete this item?</p>
            <div className="flex justify-end gap-4">
              <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteItemMutation.mutate(confirmDeleteId);
                  setConfirmDeleteId(null);
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