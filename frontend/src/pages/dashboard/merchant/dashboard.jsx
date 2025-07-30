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

// Import the new chart components
import SalesTrendChart from "@/components/dashboard/merchant/sales-trend-chart";
import ProfitTrendChart from "@/components/dashboard/merchant/profit-trend-chart";
// NEW: Import the TopPerformingStoresCard component
import TopPerformingStoresCard from "@/components/dashboard/merchant/top-performing-stores-card";

export default function Dashboard() {
  const { data: stats = {}, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => fetch(`${BASE_URL}/dashboard/summary`).then((r) => r.json())
  });

  const { data: movements = [], isLoading: movLoading } = useQuery({
    queryKey: ["dashboard-movements"],
    queryFn: () => fetch(`${BASE_URL}/dashboard/movements`).then((r) => r.json())
  });

  const isLoading = statsLoading || movLoading;
  if (isLoading) return <p>Loading...</p>;
  if (statsError) return <p className="text-red-600">Error: {statsError.message}</p>;

  const {
    total_items,
    total_stock,
    low_stock_count,
    out_of_stock_count,
    low_stock_items = [],
    out_of_stock_items = [],
    in_stock_items = [],
    recent_purchases = [],
    recent_transfers = [],
    inventory_value,
    total_purchase_value,
    supplier_spending_trends = []
  } = stats;

  const formatCurrency = (amt) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amt);

  const formatDate = (date) =>
    new Intl.DateTimeFormat("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(date));

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  const getStockStatus = (qty) =>
    qty === 0 ? "out-of-stock" : qty <= 5 ? "low-stock" : "in-stock";

  const getBadge = (status) => {
    if (status === "out-of-stock") return <Badge variant="destructive">Out of Stock</Badge>;
    if (status === "low-stock")
      return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  const allMovements = Array.isArray(movements) ? movements : [];

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>

      {/* Summary Cards (Keep at top) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <SummaryCard label="Total Items" value={total_items} icon={<Package className="w-6 h-6 text-blue-600" />} color="bg-blue-100" />
        <SummaryCard label="Total Stock" value={total_stock} icon={<Boxes className="w-6 h-6 text-green-600" />} color="bg-green-100" />
        <SummaryCard label="Low Stock" value={low_stock_count} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-100" />
        <SummaryCard label="Out of Stock" value={out_of_stock_count} icon={<AlertTriangle className="w-6 h-6 text-red-600" />} color="bg-red-100" />
        <SummaryCard label="Inventory Value" value={inventory_value} icon={<DollarSign className="w-6 h-6 text-purple-600" />} color="bg-purple-100" isCurrency wide />
        <SummaryCard label="Purchase Value" value={total_purchase_value} icon={<TrendingUp className="w-6 h-6 text-orange-600" />} color="bg-orange-100" isCurrency wide />
      </div>

      {/* Inventory Status (Keep here) */}
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
                {low_stock_items.concat(in_stock_items || []).slice(0, 5).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.stock_level}</TableCell>
                    <TableCell>{getBadge(getStockStatus(item.stock_level))}</TableCell>
                  </TableRow>
                ))}
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
              <p className="text-sm text-gray-500 text-center">No out-of-stock items</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movements and Recent Activity (Keep here) */}
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
                {allMovements.map((m) => (
                  <TableRow key={`${m.type}-${m.id}`}>
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
                ))}
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
              ) : <p className="text-sm text-gray-500">No recent purchases</p>}
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
              ) : <p className="text-sm text-gray-500">No recent transfers</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* NEW SECTION: Supplier Spending Trends and Top Performing Stores (side-by-side) */}
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
                    <TableHead>#</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier_spending_trends.map((supplier, index) => (
                    <TableRow key={supplier.supplier_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{supplier.supplier_name}</TableCell>
                      <TableCell>{formatCurrency(supplier.total_spent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-gray-500">No supplier data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Performing Stores Card */}
        <TopPerformingStoresCard />
      </div>

      {/* Charts Section (Moved to bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTrendChart />
        <ProfitTrendChart />
      </div>
    </div>
  );
}
