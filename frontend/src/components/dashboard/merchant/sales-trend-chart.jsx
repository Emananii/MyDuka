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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { BASE_URL } from "@/lib/constants";

export default function SalesTrendChart() {
  const { data: salesData = [], isLoading, error } = useQuery({
    queryKey: ["sales-trend-daily"],
    queryFn: () =>
      fetch(`${BASE_URL}/dashboard/sales_trend_daily`).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch daily sales trend");
        }
        return res.json();
      }),
  });

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value);

  const formatXAxis = (tickItem) => {
    // Format date from "YYYY-MM-DD" to "MMM DD"
    const date = new Date(tickItem);
    return new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric" }).format(date);
  };

  // NEW: Function to format large numbers for Y-axis ticks
  const formatYAxisTicks = (tickValue) => {
    if (tickValue >= 1000000) {
      return `${(tickValue / 1000000).toFixed(1)}M`;
    }
    if (tickValue >= 1000) {
      return `${(tickValue / 1000).toFixed(1)}K`;
    }
    return tickValue;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Daily Sales Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading sales data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" /> Daily Sales Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-red-600">
          <p>Error loading sales data: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="xl:col-span-2"> {/* Span 2 columns for better graph visibility */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" /> Daily Sales Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={salesData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis tickFormatter={formatYAxisTicks} /> {/* Applied new formatter */}
              <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatXAxis} />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Total Sales"
                stroke="#4CAF50" // Green color for sales
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>No sales data available for trend analysis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
