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
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/context/UserContext"; // Import useUser to get admin's store_id

// Import the chart components
import SalesTrendChart from "@/components/dashboard/merchant/sales-trend-chart";
import ProfitTrendChart from "@/components/dashboard/merchant/profit-trend-chart";
import TopPerformingStoresCard from "@/components/dashboard/merchant/top-performing-stores-card";


export default function AdminDashboard() {
  const { user, isLoading: userLoading } = useUser(); // Get current user and their loading state

  // The selectedStoreId is now derived directly from the logged-in admin's user object
  // It will be null if user or user.store_id is not yet available
  const adminStoreId = user?.store_id;

  // Fetch dashboard summary data for the admin's associated store
  const { data: stats = {}, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin-dashboard-summary", adminStoreId],
    queryFn: () => {
        // Always include store_id query parameter based on the admin's assigned store
        const url = `${BASE_URL}/dashboard/summary?store_id=${adminStoreId}`;
        return apiRequest("GET", url);
    },
    // Enable fetching only when user data is loaded and adminStoreId is available
    enabled: !userLoading && !!adminStoreId,
  });

  // Fetch dashboard movements data for the admin's associated store
  const { data: movements = [], isLoading: movLoading, error: movError } = useQuery({
    queryKey: ["admin-dashboard-movements", adminStoreId],
    queryFn: () => {
        const url = `${BASE_URL}/dashboard/movements?store_id=${adminStoreId}`;
        return apiRequest("GET", url);
    },
    // Enable fetching only when user data is loaded and adminStoreId is available
    enabled: !userLoading && !!adminStoreId,
  });

  // Fetch the specific store details for the admin's assigned store
  // This is needed to display the store name in the dashboard title
  const { data: adminStoreDetails, isLoading: adminStoreDetailsLoading, error: adminStoreDetailsError } = useQuery({
    queryKey: ["admin-store-details", adminStoreId],
    queryFn: () => apiRequest("GET", `${BASE_URL}/api/stores/${adminStoreId}`),
    enabled: !userLoading && !!adminStoreId, // Only fetch if adminStoreId is available
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });


  const isLoading = userLoading || statsLoading || movLoading || adminStoreDetailsLoading;
  const error = statsError || movLoading || adminStoreDetailsError;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <p className="text-red-600 text-lg">Error loading data: {error.message}</p>
      </div>
    );
  }

  // Display a loading state if any data is still loading
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <p className="text-lg text-gray-500">
          Loading Admin Dashboard...
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

  // Dashboard title will now show the name of the admin's assigned store
  const dashboardTitle = adminStoreDetails?.name ? `Dashboard for ${adminStoreDetails.name}` : "Admin Dashboard";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{dashboardTitle}</h1>
        {/* StoreSelect dropdown is removed as per requirement */}
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

        {/* Top Performing Stores Card (This usually shows global performance, or can be adapted) */}
        {/* Removed merchantId prop as it's not relevant for an admin dashboard directly */}
        <TopPerformingStoresCard />
      </div>

      {/* Sales and Profit Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass adminStoreId to charts so they fetch store-specific data */}
        <SalesTrendChart storeId={adminStoreId} />
        <ProfitTrendChart storeId={adminStoreId} />
      </div>
    </div>
  );
}