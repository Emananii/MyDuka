import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import AddStockTransferModal from "@/components/stock-transfers/add-stock-transfer-modal";
import ViewStockTransferModal from "@/components/stock-transfers/view-stock-transfer-modal";
import { BASE_URL } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export default function StockTransfers() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState(null);
  const [currentlyViewingId, setCurrentlyViewingId] = useState(null);
  const { toast } = useToast();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [sortKey, setSortKey] = useState("date"); // default sort
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"

  const { data: transfers = [] } = useQuery({
    queryKey: ["stock_transfers"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/stock_transfers`);
      if (!res.ok) throw new Error("Failed to fetch stock transfers");
      return res.json();
    },
  });

  const { data: stores = [] } = useQuery({
    queryKey: ["store_locations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/store/locations`);
      if (!res.ok) throw new Error("Failed to fetch store locations");
      return res.json();
    },
  });

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const getSortedTransfers = (list) => {
    const sorted = [...list].sort((a, b) => {
      let aValue = a[sortKey];
      let bValue = b[sortKey];

      if (sortKey === "date") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortKey === "location") {
        aValue = getLocationName(a.location_id).toLowerCase();
        bValue = getLocationName(b.location_id).toLowerCase();
      } else if (sortKey === "type") {
        aValue = a.transfer_type;
        bValue = b.transfer_type;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const fetchTransferDetails = async (id) => {
    setCurrentlyViewingId(id);
    try {
      const res = await fetch(`${BASE_URL}/stock_transfers/${id}`);
      if (!res.ok) throw new Error("Failed to fetch stock transfer details");
      const data = await res.json();
      setViewingTransfer(data);
    } catch (err) {
      toast({
        title: "Fetch error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCurrentlyViewingId(null);
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getLocationName = (id) => {
    const location = stores.find((b) => b.id === id);
    return location?.name || "Unknown";
  };

  const filteredTransfers = getSortedTransfers(
    transfers.filter((transfer) => {
      const transferDate = new Date(transfer.date);
      const from = startDate ? new Date(startDate) : null;
      const to = endDate ? new Date(endDate) : null;

      const matchesDateRange =
        (!from || transferDate >= from) && (!to || transferDate <= to);

      const matchesLocation =
        !selectedLocationId || transfer.location_id == selectedLocationId;

      return matchesDateRange && matchesLocation;
    })
  );

  const renderSortArrow = (key) => {
    if (sortKey !== key) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Stock Transfers</h1>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Transfer
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Filter Transfers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">Location</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All Locations</option>
                {stores.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead onClick={() => handleSort("id")} className="cursor-pointer">
                  ID{renderSortArrow("id")}
                </TableHead>
                <TableHead onClick={() => handleSort("date")} className="cursor-pointer">
                  Date{renderSortArrow("date")}
                </TableHead>
                <TableHead onClick={() => handleSort("type")} className="cursor-pointer">
                  Type{renderSortArrow("type")}
                </TableHead>
                <TableHead onClick={() => handleSort("location")} className="cursor-pointer">
                  Location{renderSortArrow("location")}
                </TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.length > 0 ? (
                filteredTransfers.map((transfer) => (
                  <TableRow
                    key={transfer.id}
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => fetchTransferDetails(transfer.id)}
                  >
                    <TableCell>{transfer.id}</TableCell>
                    <TableCell>{formatDate(transfer.date)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          transfer.transfer_type === "IN"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {transfer.transfer_type}
                      </span>
                    </TableCell>
                    <TableCell>{getLocationName(transfer.location_id)}</TableCell>
                    <TableCell>{transfer.notes || "-"}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchTransferDetails(transfer.id);
                        }}
                        disabled={currentlyViewingId === transfer.id}
                      >
                        {currentlyViewingId === transfer.id
                          ? "Loading..."
                          : "View Details"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No stock transfers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AddStockTransferModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {viewingTransfer && (
        <ViewStockTransferModal
          isOpen={!!viewingTransfer}
          onClose={() => setViewingTransfer(null)}
          transfer={viewingTransfer}
        />
      )}
    </div>
  );
}