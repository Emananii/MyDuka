// src/components/dashboard/admin/ProfitPerformanceChartModal.jsx
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"; // Assuming Shadcn UI dialog components
import { Button } from "@/components/ui/button"; // Assuming Shadcn UI button
import { TrendingUp } from "lucide-react"; // For the icon
import { BASE_URL } from "@/lib/constants";
import { useUser } from "@/context/UserContext"; // To get user's token

export default function ProfitPerformanceChartModal() {
  const { user } = useUser();
  const token = localStorage.getItem("token"); // Get token for authorized requests
  const API_BASE_URL = `${BASE_URL}/api`; // Consistent API base URL

  const { data: profitData = [], isLoading, error } = useQuery({
    queryKey: ["profit-performance-trend"],
    // Enable this query only for admin role when auth is back
    // enabled: user?.role === "admin",
    queryFn: () =>
      fetch(`${API_BASE_URL}/report/profit-performance`, {
        headers: { Authorization: `Bearer ${token}` }, // Send token
      }).then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            console.warn("No profit performance data available.");
            return []; // Return empty array if 404 (no data)
          }
          throw new Error("Failed to fetch profit performance data");
        }
        return res.json();
      }),
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value);

  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric" }).format(date);
  };

  const formatYAxisTicks = (tickValue) => {
    if (tickValue >= 1000000) {
      return `${(tickValue / 1000000).toFixed(1)}M`;
    }
    if (tickValue >= 1000) {
      return `${(tickValue / 1000).toFixed(1)}K`;
    }
    return tickValue;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> View Profit Performance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-6"> {/* Adjust max-width */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" /> Profit Performance Trend
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading profit data...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-64 text-red-600">
              <p>Error loading data: {error.message}</p>
            </div>
          )}
          {!isLoading && !error && profitData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}> {/* Increased height for modal */}
              <LineChart
                data={profitData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tickFormatter={formatXAxis} />
                <YAxis tickFormatter={formatYAxisTicks} />
                <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatXAxis} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Total Profit"
                  stroke="#8884d8" // Purple color for profit
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : !isLoading && !error && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No profit data available for trend analysis.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}