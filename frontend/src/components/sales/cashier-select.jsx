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
 * @param {Array<object>} [props.cashiers=[]] - Optional: Pre-fetched list of cashier objects. If provided, the component uses this instead of fetching internally.
 * @param {boolean} [props.isLoading=false] - Optional: Loading state passed from parent. Used to disable the select.
 * @param {boolean} [props.disabled=false] - Optional: General disable prop for the select input.
 */
export function CashierSelect({
  selectedCashierId,
  onSelectCashier,
  label = "Filter by Cashier",
  includeAllOption = true,
  storeId = null, // Prop to filter cashiers by store
  allowedRole = 'cashier', // Default to 'cashier' if not provided
  cashiers: propCashiers = [], // Renamed to avoid conflict with `data: cashiers` from useQuery
  isLoading: propIsLoading = false, // Renamed to avoid conflict with `isLoading` from useQuery
  disabled = false, // Added for general disable
}) {
  // Use a ref to store the result of the internal query
  const {
    data: internallyFetchedCashiers,
    isLoading: isInternalLoading,
    isError: isInternalError,
    error: internalError,
  } = useQuery({
    queryKey: ["cashiersList", storeId, allowedRole],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Only append store_id if it's not null.
      // If storeId is null, the backend should interpret this as "all stores" for the given role.
      if (storeId !== null) { // ⭐ FIX: Check for explicit null, not just truthiness ⭐
        params.append('store_id', String(storeId));
      }
      if (allowedRole) {
        params.append('role', allowedRole);
      }
      params.append('is_active', 'true'); // Only fetch active users

      const queryString = params.toString();
      const res = await apiRequest("GET", `${BASE_URL}/api/users/?${queryString}`);
      
      return Array.isArray(res?.users) ? res.users : (Array.isArray(res) ? res : []);
    },
    // ⭐ FIX: Changed enabled condition ⭐
    // The query should run if a role is specified.
    // When storeId is null, it means "fetch all cashiers for this role across all stores".
    enabled: !!allowedRole,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
        console.error("Failed to fetch cashiers:", err);
    }
  });

  // Determine which list of cashiers to use: propCashiers (from parent) or internallyFetchedCashiers
  const cashiersToRender = propCashiers.length > 0 ? propCashiers : internallyFetchedCashiers;
  // Determine overall loading state
  const overallLoading = propIsLoading || isInternalLoading;
  const overallError = isInternalError ? internalError : null;


  if (overallLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Label htmlFor="cashier-select" className="text-sm">{label}:</Label>
        <span className="text-sm">Loading {allowedRole}s...</span>
      </div>
    );
  }

  if (overallError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <Label htmlFor="cashier-select" className="text-sm">{label}:</Label>
        <span className="text-sm">Error: {overallError?.message || `Failed to load ${allowedRole}s`}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="cashier-select" className="text-sm">{label}:</Label> {/* Keep this label */}
      <Select
        value={selectedCashierId === null || selectedCashierId === undefined || selectedCashierId === "all"
          ? "all"
          : String(selectedCashierId)
        }
        onValueChange={onSelectCashier}
        disabled={disabled || overallLoading} // Disable if parent says so, or if internal data is loading
      >
        <SelectTrigger id="cashier-select" className="w-[180px] h-9 text-sm">
          <SelectValue placeholder={`Select a ${allowedRole}`} />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All {allowedRole}s</SelectItem>
          )}
          {cashiersToRender.length === 0 && !overallLoading && !overallError ? (
            <SelectItem value="no-options" disabled>
              No {allowedRole}s found
            </SelectItem>
          ) : (
            cashiersToRender.map((user) => ( // Renamed 'cashier' to 'user' for broader use
              <SelectItem key={user.id} value={String(user.id)}>
                {user.full_name || user.username || `User ${user.id}`} {/* Use appropriate name field */}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}