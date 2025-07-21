import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRightLeft, ShoppingCart } from "lucide-react";

export function RecentActivityCard() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["/dashboard/summary"], // ✅ Unified endpoint
  });

  const formatTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInHours = Math.floor((now - then) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const { recent_purchases = [], recent_transfers = [] } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 🛒 Recent Purchases */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Purchases</h3>
        </div>
        <CardContent className="p-6 space-y-4">
          {recent_purchases.length > 0 ? (
            recent_purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {purchase.supplier?.name || "Unknown Supplier"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ksh {purchase.total_cost?.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatTimeAgo(purchase.purchase_date)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No recent purchases</p>
          )}
        </CardContent>
      </Card>

      {/* 🔄 Recent Transfers */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Stock Transfers</h3>
        </div>
        <CardContent className="p-6 space-y-4">
          {recent_transfers.length > 0 ? (
            recent_transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                    <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 capitalize">
                      {transfer.transfer_type === "OUT"
                        ? "Transfer Out"
                        : transfer.transfer_type === "IN"
                        ? "Transfer In"
                        : "Transfer"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transfer.location?.name || "Unknown Location"}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatTimeAgo(transfer.date)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">No recent transfers</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
