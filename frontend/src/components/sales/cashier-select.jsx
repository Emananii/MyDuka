// src/components/sales/cashier-select.jsx
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BASE_URL } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react"; // Importing the Loader2 icon

/**
 * CashierSelect Component
 * A dropdown to select a specific cashier, fetching active cashiers from the backend.
 *
 * @param {object} props
 * @param {string | number | null} props.selectedCashierId - The ID of the currently selected cashier. Use null for "All Cashiers".
 * @param {function(string): void} props.onSelectCashier - Callback when a cashier is selected. Receives the selected cashier ID (as a string).
 * Pass "all" to indicate "All Cashiers".
 * @param {string} [props.label="Filter by Cashier"] - Optional label for the select input.
 * @param {boolean} [props.includeAllOption=true] - Whether to include an "All Cashiers" option.
 * @param {number | null} [props.storeId=null] - Optional store ID to filter cashiers by. Pass null to get cashiers from all stores.
 */
export function CashierSelect({
  selectedCashierId,
  onSelectCashier,
  label = "Filter by Cashier",
  includeAllOption = true,
  storeId = null, // Prop to filter cashiers by store
}) {
  const {
    data: cashiers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cashiersList", storeId], // Include storeId in query key for re-fetching when store changes
    queryFn: async () => {
      // Construct query string to filter by role='cashier' and optionally by store_id
      const params = new URLSearchParams({ role: 'cashier', is_active: 'true' });
      if (storeId) {
        params.append('store_id', String(storeId));
      }
      const queryString = params.toString();
      const res = await apiRequest("GET", `${BASE_URL}/api/users/`);
      // Assuming your /users endpoint returns a list of users directly.
      // It's recommended to filter this list more rigorously on the backend by role for security.
      return res; // `res` is expected to be the array of cashiers
    },
    staleTime: 5 * 60 * 1000, // Cashiers list might change, keep fresh for 5 min
    onError: (err) => {
        console.error("Failed to fetch cashiers:", err);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Label className="text-sm">{label}:</Label> {/* Added text-sm */}
        <span className="text-sm">Loading cashiers...</span> {/* Added text-sm */}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <Label className="text-sm">{label}:</Label> {/* Added text-sm */}
        <span className="text-sm">Error: {error?.message || "Failed to load cashiers"}</span> {/* Added text-sm */}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="cashier-select" className="text-sm">{label}:</Label> {/* Added text-sm */}
      <Select
        value={selectedCashierId ? String(selectedCashierId) : (includeAllOption ? "all" : "")}
        onValueChange={onSelectCashier}
      >
        <SelectTrigger id="cashier-select" className="w-[180px] h-9 text-sm"> {/* Added h-9 text-sm for consistency */}
          <SelectValue placeholder="Select a cashier" />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All Cashiers</SelectItem>
          )}
          {cashiers && cashiers.map((cashier) => (
            <SelectItem key={cashier.id} value={String(cashier.id)}>
              {cashier.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}