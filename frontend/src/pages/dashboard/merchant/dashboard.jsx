import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  HandCoins,
  Boxes,
  Truck,
  History
} from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient"; // Import apiRequest
import { useUser } from "@/context/UserContext"; // Import useUser to get merchant ID

// Import components for store selection
import { StoreSelect } from "@/components/sales/store-select";

// Import the chart components
import SalesTrendChart from "@/components/dashboard/merchant/sales-trend-chart";
import ProfitTrendChart from "@/components/dashboard/merchant/profit-trend-chart";
import TopPerformingStoresCard from "@/components/dashboard/merchant/top-performing-stores-card";

// Function to fetch stores for the current merchant
const fetchMerchantStores = async (merchantId) => {
  if (!merchantId) return []; // Don't fetch if no merchantId
  // Assuming /api/store/ endpoint returns stores accessible by the authenticated user (merchant)
  const response = await apiRequest("GET", `${BASE_URL}/api/store/`);
  return response.stores || []; // Ensure it returns an array
};

export default function MerchantDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const merchantId = user?.id;

  // Initialize selectedStoreId to null.
  // 'null' will represent the "All Stores" state.
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  // Fetch list of stores for the dropdown (filtered by merchant automatically by backend)
  const { data: stores = [], isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ["merchant-stores-list", merchantId],
    queryFn: () => fetchMerchantStores(merchantId),
    enabled: !!merchantId,
    staleTime: 10 * 60 * 1000,
  });

  // Set initial selected store.
  // If there are stores and no store is yet selected (selectedStoreId is null),
  // decide between "All Stores" or the first store if only one exists.
  useEffect(() => {
    if (!storesLoading && stores.length > 0 && selectedStoreId === null) {
      if (stores.length === 1) {
        setSelectedStoreId(String(stores[0].id)); // Auto-select the only store
      } else {
        // If multiple stores, keep selectedStoreId as null to default to "All Stores"
        // No explicit setSelectedStoreId(null) call needed here as it's already null initially
      }
    }
  }, [stores, storesLoading]); // Removed selectedStoreId from dependencies to avoid loop

  // Handle store selection change
  const handleStoreSelect = (value) => {
    // If "all" is selected from the dropdown, set selectedStoreId to null
    // Otherwise, set it to the actual store ID value
    setSelectedStoreId(value === "all" ? null : value);
  };

  // Fetch dashboard summary data for the selected store
  const { data: stats = {}, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["merchant-dashboard-summary", selectedStoreId],
    queryFn: () => {
        // If selectedStoreId is null, the backend should return summary for all merchant's stores
        const url = selectedStoreId
            ? `${BASE_URL}/dashboard/summary?store_id=${selectedStoreId}`
            : `${BASE_URL}/dashboard/summary`;
        return apiRequest("GET", url);
    },
    // Query is enabled when stores are loaded AND
    // either a specific store is selected, OR "All Stores" is selected (null),
    // OR there are no stores at all (to show empty state).
    enabled: !storesLoading && (selectedStoreId !== undefined), // Use undefined check for initial state
  });

  // Fetch dashboard movements data for the selected store
  const { data: movements = [], isLoading: movLoading, error: movError } = useQuery({
    queryKey: ["merchant-dashboard-movements", selectedStoreId],
    queryFn: () => {
        // If selectedStoreId is null, the backend should return movements for all merchant's stores
        const url = selectedStoreId
            ? `${BASE_URL}/dashboard/movements?store_id=${selectedStoreId}`
            : `${BASE_URL}/dashboard/movements`;
        return apiRequest("GET", url);
    },
    // Same enabled logic as for stats query
    enabled: !storesLoading && (selectedStoreId !== undefined), // Use undefined check for initial state
  });

  const isLoading = userLoading || storesLoading || statsLoading || movLoading;
  const error = storesError || statsError || movError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <p className="text-red-600 text-lg">Error loading data: {error.message}</p>
      </div>
    );
  }

  // Display a loading state or prompt to select a store
  // Only show "Please select a store" if no stores exist, or if stores are loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <p className="text-lg text-gray-500">
          Loading dashboard data...
        </p>
      </div>
    );
  }

  // Destructure with default empty arrays/values for safety
  const {
    total_items = 0,
    total_stock = 0,
    low_stock_count = 0,
    out_of_stock_count = 0,
    low_stock_items = [],
    out_of_stock_items = [],
    in_stock_items = [],
    recent_purchases = [],
    recent_transfers = [],
    inventory_value = 0,
    total_purchase_value = 0,
    supplier_spending_trends = []
  } = stats;

  const formatCurrency = (amt) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amt);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric"
      }).format(date);
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const now = new Date();
      const then = new Date(dateString);
      const diffMs = now.getTime() - then.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      return `${Math.floor(diffHours / 24)} days ago`;
    } catch (e) {
      console.error("Error formatting time ago:", e);
      return "Invalid Date";
    }
  };

  const getStockStatus = (qty) =>
    qty === 0 ? "out-of-stock" : qty <= 5 ? "low-stock" : "in-stock";

  const getBadge = (status) => {
    if (status === "out-of-stock") return <Badge variant="destructive">Out of Stock</Badge>;
    if (status === "low-stock")
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
  };

  const allMovementsArray = Array.isArray(movements) ? movements : [];

  const SummaryCard = ({ label, value, icon, color, isCurrency = false, wide = false }) => {
    const formattedValue = isCurrency
      ? formatCurrency(value)
      : value;

    const cardClass = wide ? "xl:col-span-2" : "";

    return (
      <Card className={cardClass}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{label}</p>
              <p
                className="font-bold text-gray-900 leading-tight break-words"
                style={{
                  fontSize: "clamp(1rem, 2vw, 1.5rem)",
                  lineHeight: "1.2",
                  wordBreak: "break-word"
                }}
                title={formattedValue}
              >
                {formattedValue}
              </p>
            </div>
            <div className={`w-12 h-12 ${color} flex items-center justify-center rounded-lg`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Find the selected store's name for the dashboard title
  const currentStore = stores.find(store => String(store.id) === selectedStoreId);
  // Dynamically set the dashboard title based on selected store or "All Stores"
  const dashboardTitle = selectedStoreId === null ? "Dashboard for All Stores" : (currentStore ? `Dashboard for ${currentStore.name}` : "Merchant Dashboard");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{dashboardTitle}</h1>
        <div className="w-full sm:w-auto">
          <StoreSelect
            stores={stores}
            selectedStoreId={selectedStoreId}
            onSelectStore={handleStoreSelect}
            includeAllOption={true}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <SummaryCard label="Total Items" value={total_items} icon={<Package className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
        <SummaryCard label="Total Stock" value={total_stock} icon={<Boxes className="w-6 h-6 text-green-600" />} color="bg-green-100" />
        <SummaryCard label="Low Stock" value={low_stock_count} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-100" />
        <SummaryCard label="Out of Stock" value={out_of_stock_count} icon={<AlertTriangle className="w-6 h-6 text-red-600" />} color="bg-red-100" />
        <SummaryCard label="Inventory Value" value={inventory_value} icon={<DollarSign className="w-6 h-6 text-purple-600" />} color="bg-purple-100" isCurrency wide />
        <SummaryCard label="Purchase Value" value={total_purchase_value} icon={<TrendingUp className="w-6 h-6 text-orange-600" />} color="bg-orange-100" isCurrency wide />
      </div>

      {/* Inventory Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" /> Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low_stock_items.length > 0 ? (
                  low_stock_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.stock_level}</TableCell>
                      <TableCell>{getBadge(getStockStatus(item.stock_level))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">No low stock items for this store</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> Out of Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            {out_of_stock_items.length ? (
              out_of_stock_items.map((item) => (
                <div key={item.id} className="flex text-center text-sm py-2 justify-center">
                  <span className="inline-block border-b border-gray-300 pb-1">
                    {item.name}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center">No out-of-stock items for this store</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" /> Recent Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Source / Destination</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMovementsArray.length > 0 ? (
                  allMovementsArray.map((m) => (
                    <TableRow key={`${m.type}-${m.id || Math.random()}`}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.type}</Badge></TableCell>
                      <TableCell>{m.quantity}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {m.source_or_destination || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {m.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500">No recent movements for this store</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Recent Purchases</h4>
              {recent_purchases.length ? (
                <ul className="space-y-2">
                  {recent_purchases.map((p) => (
                    <li key={p.id} className="flex justify-between text-sm border-b pb-1">
                      <span>{p.notes || "No notes"}</span>
                      <span className="text-gray-500">{formatTimeAgo(p.purchase_date)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No recent purchases for this store</p>}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Recent Transfers</h4>
              {recent_transfers.length ? (
                <ul className="space-y-2">
                  {recent_transfers.map((t) => (
                    <li key={t.id} className="flex justify-between text-sm border-b pb-1">
                      <span>{t.notes || "No notes"}</span>
                      <span className="text-gray-500">{formatTimeAgo(t.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No recent transfers for this store</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Spending Trends and Top Performing Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Spending Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-yellow-600" />
              Top Suppliers by Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplier_spending_trends.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Amount Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier_spending_trends.map((supplier, index) => (
                    <TableRow key={supplier.supplier_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(supplier.total_spent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No supplier spending data for this store</p>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Stores Card (This will now show performance among the merchant's stores) */}
        <TopPerformingStoresCard merchantId={merchantId} /> {/* Pass merchantId */}
      </div>

      {/* Sales and Profit Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass selectedStoreId to charts so they fetch store-specific data */}
        <SalesTrendChart storeId={selectedStoreId} />
        <ProfitTrendChart storeId={selectedStoreId} />
      </div>
    </div>
  );
}