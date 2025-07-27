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
 * @param {string} [props.allowedRole='cashier'] - The specific role to filter users by (e.g., 'cashier'). Defaults to 'cashier'.
 */
export function CashierSelect({
  selectedCashierId,
  onSelectCashier,
  label = "Filter by Cashier",
  includeAllOption = true,
  storeId = null, // Prop to filter cashiers by store
  allowedRole = 'cashier', // Default to 'cashier' if not provided
}) {
  const {
    data: cashiers,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["cashiersList", storeId, allowedRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeId) {
        params.append('store_id', String(storeId));
      }
      if (allowedRole) {
        params.append('role', allowedRole);
      }
      params.append('is_active', 'true'); // Only fetch active users

      const queryString = params.toString();
      const res = await apiRequest("GET", `${BASE_URL}/api/users/?${queryString}`);
      
      // ⭐ IMPORTANT FIX: Adjust this line based on your actual API response structure ⭐
      // If your API returns { users: [...] }, then use res.users
      // If your API returns an array directly, then use res
      return Array.isArray(res?.users) ? res.users : (Array.isArray(res) ? res : []);
    },
    // ⭐ FIX: Ensure enabled is correct for when to run the query ⭐
    // Only fetch if an allowedRole is set, and if the role is 'cashier', require a storeId.
    // This prevents fetching all users if storeId is null for a cashier-specific filter.
    enabled: !!allowedRole && (allowedRole === 'cashier' ? !!storeId : true),
    staleTime: 5 * 60 * 1000, // Cashiers list might change, keep fresh for 5 min
    onError: (err) => {
        console.error("Failed to fetch cashiers:", err);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Label htmlFor="cashier-select" className="text-sm">{label}:</Label> {/* Added htmlFor for accessibility */}
        <span className="text-sm">Loading cashiers...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <Label htmlFor="cashier-select" className="text-sm">{label}:</Label> {/* Added htmlFor for accessibility */}
        <span className="text-sm">Error: {error?.message || "Failed to load cashiers"}</span>
      </div>
    );
  }

  // Ensure cashiers is an array before mapping
  const cashiersToDisplay = cashiers || [];

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="cashier-select" className="text-sm">{label}:</Label>
      <Select
        // ⭐ FIX: Ensure selectedCashierId is correctly handled for "all" and null/undefined ⭐
        value={selectedCashierId === null || selectedCashierId === undefined || selectedCashierId === "all"
          ? "all"
          : String(selectedCashierId)
        }
        onValueChange={onSelectCashier}
      >
        <SelectTrigger id="cashier-select" className="w-[180px] h-9 text-sm">
          <SelectValue placeholder="Select a cashier" />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All Cashiers</SelectItem>
          )}
          {cashiersToDisplay.length === 0 && !isLoading && !isError ? (
            <SelectItem value="no-options" disabled>
              No {allowedRole}s found
            </SelectItem>
          ) : (
            cashiersToDisplay.map((cashier) => (
              <SelectItem key={cashier.id} value={String(cashier.id)}>
                {cashier.full_name || cashier.username || `Cashier ${cashier.id}`} {/* ⭐ IMPORTANT FIX: Use correct name field ⭐ */}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}