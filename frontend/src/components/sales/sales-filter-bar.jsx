// src/components/sales/sales-filter-bar.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from './date-range-picker';
import { StoreSelect } from './store-select';
import { CashierSelect } from './cashier-select'; // <--- CORRECT IMPORT for CashierSelect
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
 */
export default function SalesFilterBar({
  filters,
  onFilterChange,
  showStoreFilter = false,
  showCashierFilter = false,
  showSearchFilter = true,
}) {

  // No longer directly converting dateRange to string here, as DateRangePicker handles display.
  // The 'formattedDateRange' variable was unused, so removed for cleaner code.

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
      {showSearchFilter && (
        <div className="space-y-1">
          <Label htmlFor="sales-search">Search Sales</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="sales-search"
              placeholder="Search by product, sale ID..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="space-y-1">
        <Label htmlFor="date-range">Date Range</Label>
        <DateRangePicker
          date={filters.dateRange}
          onSelect={(range) => onFilterChange('dateRange', range)}
          className="w-full"
        />
      </div>

      {showStoreFilter && (
        <div className="space-y-1">
          <StoreSelect
            selectedStoreId={filters.storeId}
            onSelectStore={(id) => onFilterChange('storeId', id === 'all' ? null : Number(id))}
            label="Filter by Store"
            includeAllOption={true}
          />
        </div>
      )}

      {showCashierFilter && (
        <div className="space-y-1">
          <CashierSelect
            selectedCashierId={filters.cashierId}
            onSelectCashier={(id) => onFilterChange('cashierId', id === 'all' ? null : Number(id))}
            label="Filter by Cashier"
            includeAllOption={true}
            // Pass the current storeId so CashierSelect can filter cashiers by that store
            // Only pass if a specific store is selected, not if 'All Stores' is chosen
            storeId={filters.storeId === null || filters.storeId === 'all' ? null : Number(filters.storeId)}
          />
        </div>
      )}

      {/* Add a Clear Filters Button if desired */}
      {/* Example of how to add a clear filters button if needed: */}
      {/* <div className="flex justify-end col-span-full mt-auto"> */} {/* `col-span-full` ensures it takes full width below other filters */}
      {/* <Button variant="outline" onClick={() => onFilterChange('reset', true)}>Clear Filters</Button> */}
      {/* </div> */}
    </div>
  );
}