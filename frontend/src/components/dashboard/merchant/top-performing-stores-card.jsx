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
import { Store as StoreIcon, DollarSign } from "lucide-react"; // Renamed Store to StoreIcon to avoid conflict
import { BASE_URL } from "@/lib/constants";

export default function TopPerformingStoresCard() {
  const { data: topStores = [], isLoading, error } = useQuery({
    queryKey: ["top-performing-stores"],
    queryFn: () =>
      fetch(`${BASE_URL}/dashboard/top_performing_stores`).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch top performing stores");
        }
        return res.json();
      }),
  });

  // Function to format currency
  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(value);

  // Function to format large numbers (M for millions, K for thousands)
  const formatLargeNumber = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value;
  };

  if (isLoading) {
    return (
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-blue-600" /> Top Performing Stores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-gray-500">Loading top stores data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="w-5 h-5 text-blue-600" /> Top Performing Stores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-red-600">
          <p>Error loading top stores: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="xl:col-span-2"> {/* Span 2 columns for better visibility */}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StoreIcon className="w-5 h-5 text-blue-600" /> Top Performing Stores
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topStores.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Store Name</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStores.map((store, index) => (
                <TableRow key={store.store_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{store.store_name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(store.total_revenue)} ({formatLargeNumber(store.total_revenue)})
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <p>No sales data available to determine top performing stores.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
