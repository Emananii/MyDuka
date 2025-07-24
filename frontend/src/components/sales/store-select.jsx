// src/components/sales/store-select.jsx
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
import { Label } from "@/components/ui/label"; // For accessible labels
import { Loader2 } from "lucide-react"; // For loading indicator

/**
 * StoreSelect Component
 * A dropdown to select a store, fetching available stores from the backend.
 *
 * @param {object} props
 * @param {string | number | null} props.selectedStoreId - The ID of the currently selected store. Use null for "All Stores".
 * @param {function(string): void} props.onSelectStore - Callback when a store is selected. Receives the selected store ID (as a string).
 * Pass "all" to indicate "All Stores".
 * @param {string} [props.label="Filter by Store"] - Optional label for the select input.
 * @param {boolean} [props.includeAllOption=true] - Whether to include an "All Stores" option.
 */
export function StoreSelect({
  selectedStoreId,
  onSelectStore,
  label = "Filter by Store",
  includeAllOption = true,
}) {
  const {
    data: stores,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["storesList"], // Unique query key for caching store data
    queryFn: () => apiRequest("GET", `${BASE_URL}/stores`), // Assuming /api/stores endpoint exists
    staleTime: 10 * 60 * 1000, // Stores list doesn't change often, keep fresh for 10 min
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <Label>{label}:</Label>
        <span>Loading stores...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <Label>{label}:</Label>
        <span>Error: {error?.message || "Failed to load stores"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="store-select">{label}:</Label>
      <Select
        value={selectedStoreId ? String(selectedStoreId) : (includeAllOption ? "all" : "")}
        onValueChange={onSelectStore}
      >
        <SelectTrigger id="store-select" className="w-[180px]">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">All Stores</SelectItem>
          )}
          {stores && stores.map((store) => (
            <SelectItem key={store.id} value={String(store.id)}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}