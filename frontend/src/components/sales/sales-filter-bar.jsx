// src/components/sales/sales-filter-bar.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// DateRangePicker is no longer directly used for simple date inputs
// StoreSelect is still used if showStoreFilter is true
import { StoreSelect } from './store-select';
import { CashierSelect } from './cashier-select'; // Your CashierSelect
import { Search, XCircle } from 'lucide-react'; // Added XCircle for reset button
import { Card, CardContent } from "@/components/ui/card"; // Import Card components
import { format, parseISO } from 'date-fns'; // Import format and parseISO for date handling

/**
 * SalesFilterBar Component
 * Provides a set of filters for sales data, including date range, store, cashier, and general search.
 * It's designed to be flexible based on the user's role and available options.
 *
 * @param {object} props
 * @param {object} props.filters - Current filter values:
 * - `search`: string (General search term)
 * - `dateRange`: { from: Date | undefined, to: Date | undefined }
 * - `storeId`: string | number | null (ID of selected store, or 'all')
 * - `cashierId`: string | number | null (ID of selected cashier, or 'all')
 * @param {function(string, any): void} props.onFilterChange - Callback to update a specific filter.
 * (filterKey: string, newValue: any)
 * @param {boolean} [props.showStoreFilter=false] - Whether to show the Store filter.
 * @param {boolean} [props.showCashierFilter=false] - Whether to show the Cashier filter.
 * @param {boolean} [props.showSearchFilter=true] - Whether to show the general search input.
 * @param {Array<object>} [props.cashiers=[]] - Optional: List of cashier objects for the CashierSelect dropdown.
 * @param {boolean} [props.isLoadingCashiers=false] - Optional: Loading state for cashiers, to disable dropdown.
 * @param {boolean} [props.isSalesLoading=false] - Optional: Loading state for main sales query, to disable filter interactions.
 */
export default function SalesFilterBar({
  filters,
  onFilterChange,
  showStoreFilter = false,
  showCashierFilter = false,
  showSearchFilter = true,
  cashiers = [],
  isLoadingCashiers = false,
  isSalesLoading = false, // Added prop for overall sales loading
}) {

  // Convert Date objects in filters.dateRange to YYYY-MM-DD strings for input type="date"
  const startDateString = filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : '';
  const endDateString = filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : '';

  const handleStartDateChange = (e) => {
    const dateValue = e.target.value; // YYYY-MM-DD string
    const newDate = dateValue ? parseISO(dateValue) : undefined;
    // Ensure that if 'from' is set, 'to' is not earlier than 'from'
    const updatedTo = filters.dateRange?.to && newDate && filters.dateRange.to < newDate ? newDate : filters.dateRange?.to;
    onFilterChange('dateRange', { from: newDate, to: updatedTo });
  };

  const handleEndDateChange = (e) => {
    const dateValue = e.target.value; // YYYY-MM-DD string
    const newDate = dateValue ? parseISO(dateValue) : undefined;
    // Ensure that if 'to' is set, 'from' is not later than 'to'
    const updatedFrom = filters.dateRange?.from && newDate && filters.dateRange.from > newDate ? newDate : filters.dateRange?.from;
    onFilterChange('dateRange', { from: updatedFrom, to: newDate });
  };

  // Determine if any filter is active to enable/disable the reset button
  const isFilterActive =
    filters.search !== '' ||
    filters.storeId !== null ||
    filters.cashierId !== null ||
    (filters.dateRange && (filters.dateRange.from || filters.dateRange.to));

  const handleResetFilters = () => {
    onFilterChange('reset', true); // Pass a reset flag to the parent
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Filter Sales</h2>
          <Button
            variant="outline"
            onClick={handleResetFilters}
            disabled={!isFilterActive || isSalesLoading}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" /> Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {showSearchFilter && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="sales-search" className="text-sm text-gray-600">Search Sales</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="sales-search"
                  placeholder="Search by product, sale ID..."
                  value={filters.search || ''}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  className="pl-9 text-sm"
                  disabled={isSalesLoading}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="start-date" className="text-sm text-gray-600">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDateString}
              onChange={handleStartDateChange}
              className="border rounded px-2 py-1 text-sm"
              disabled={isSalesLoading}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="end-date" className="text-sm text-gray-600">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDateString}
              onChange={handleEndDateChange}
              className="border rounded px-2 py-1 text-sm"
              disabled={isSalesLoading}
            />
          </div>

          {showStoreFilter && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="store-select" className="text-sm text-gray-600">Filter by Store</Label>
              <StoreSelect
                id="store-select"
                selectedStoreId={filters.storeId}
                onSelectStore={(id) => onFilterChange('storeId', id === 'all' ? null : Number(id))}
                includeAllOption={true}
                disabled={isSalesLoading}
                // Removed redundant label prop here
              />
            </div>
          )}

          {showCashierFilter && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="cashier-select" className="text-sm text-gray-600">Filter by Cashier</Label>
              <CashierSelect
                id="cashier-select"
                selectedCashierId={filters.cashierId}
                onSelectCashier={(id) => onFilterChange('cashierId', id === 'all' ? null : Number(id))}
                includeAllOption={true}
                storeId={filters.storeId === null || filters.storeId === 'all' ? null : Number(filters.storeId)}
                cashiers={cashiers}
                isLoading={isLoadingCashiers}
                allowedRole="cashier"
                disabled={isSalesLoading}
                // Removed redundant label prop here
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}