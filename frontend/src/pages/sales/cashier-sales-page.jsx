// src/pages/sales/cashier-sales-page.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
// Assuming you have a UserContext to get logged-in user details
import { useUser } from '@/context/UserContext'; // Adjust path if your UserContext is elsewhere
import { apiRequest } from '@/lib/queryClient';
import { BASE_URL } from '@/lib/constants';
import { saleHistoryListSchema, saleDetailsSchema } from '@/shared/schema'; // Your schemas

// Components
import SalesFilterBar from '@/components/sales/sales-filter-bar'; // Your new filter bar
import SalesTable from '@/components/sales/sales-table'; // Your sales table
import SaleDetailsDialog from '@/components/sales/sale-details-dialog'; // Your sale details dialog
import { Button } from '@/components/ui/button'; // Assuming shadcn Button

import { subDays, format } from 'date-fns'; // For date calculations

export default function CashierSalesPage() {
  const { user: currentUser } = useUser(); // Get logged-in user from context
  const { toast } = useToast();

  // State for filters
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const fourteenDaysAgo = subDays(today, 13); // Last 14 days inclusive (today + 13 prev days)
    return {
      search: '',
      dateRange: {
        from: fourteenDaysAgo,
        to: today,
      },
      // Note: We intentionally start with cashierId as null.
      // The useEffect below will update it once the user is loaded.
      cashierId: null,
    };
  });

  // ⭐ FIX: Add a useEffect to sync the cashierId filter once the user is loaded.
  // This solves the race condition where the initial state might be null.
  useEffect(() => {
    if (currentUser?.id) {
      setFilters(prev => ({
        ...prev,
        cashierId: currentUser.id,
      }));
    }
  }, [currentUser?.id]);

  const [viewingSaleId, setViewingSaleId] = useState(null); // State for opening sale details dialog

  // Memoize filters for useQuery dependency
  const queryFilters = React.useMemo(() => {
    return {
      cashier_id: filters.cashierId,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      // Backend should handle 'search' param for Sales based on requirement
      search: filters.search || undefined,
    };
  }, [filters]);

  // Fetch sales data
  const {
    data: salesData, // This will be the object { sales: [...], total: N, page: N, pages: N, per_page: N }
    isLoading: isLoadingSales,
    isError: isErrorSales,
    error: salesError,
  } = useQuery({
    queryKey: ['cashierSales', queryFilters],
    queryFn: async () => {
      // If cashier ID is not available (e.g., user not loaded yet), return empty data
      if (!queryFilters.cashier_id) {
        return { sales: [], total: 0, page: 1, pages: 1, per_page: 10 };
      }
      const queryString = new URLSearchParams(queryFilters).toString();
      const res = await apiRequest("GET", `${BASE_URL}/sales?${queryString}`);
      // Your /sales endpoint returns a dict with 'sales' list, total, pages etc.
      // Validate only the 'sales' array part.
      return {
        sales: saleHistoryListSchema.parse(res.sales), // Validate the array inside 'sales' key
        total: res.total,
        page: res.page,
        pages: res.pages,
        per_page: res.per_page,
      };
    },
    enabled: !!currentUser?.id, // Only enable query if currentUser ID is available
    staleTime: 60 * 1000, // 1 minute stale time
    onError: (err) => {
      toast({
        title: "Error fetching sales",
        description: err.message || "Could not load your sales history.",
        variant: "destructive",
      });
    },
  });

  const sales = salesData?.sales || []; // Extract the actual sales array

  // Callback for filter changes from SalesFilterBar
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      if (key === 'dateRange') {
        return { ...prev, dateRange: value };
      } else if (key === 'reset') {
        // Reset to initial 14-day filter for cashier
        const today = new Date();
        const fourteenDaysAgo = subDays(today, 13);
        return {
          search: '',
          dateRange: {
            from: fourteenDaysAgo,
            to: today,
          },
          cashierId: currentUser?.id || null,
        };
      }
      return { ...prev, [key]: value };
    });
  }, [currentUser]); // currentUser is a dependency for reset logic

  const handleRowClick = (sale) => {
    setViewingSaleId(sale.id);
  };

  const closeSaleDetailsDialog = () => {
    setViewingSaleId(null);
  };

  // If user context is not loaded yet, or if current user is not a cashier
  if (!currentUser) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading user data...
      </div>
    );
  }

  if (currentUser.role !== 'cashier') {
    return (
      <div className="p-6 text-center text-red-600">
        Access Denied: You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">Your Sales History</h1>

      {/* Filter Bar - only date range and search for cashier */}
      <SalesFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        showStoreFilter={false} // Cashier doesn't filter by store
        showCashierFilter={false} // Cashier doesn't filter by other cashiers
      />

      {/* Sales Table */}
      <SalesTable
        sales={sales}
        isLoading={isLoadingSales}
        isError={isErrorSales}
        error={salesError}
        onRowClick={handleRowClick}
      />

      {/* Pagination (Future: if your backend returns pagination links) */}
      {/*
      <div className="flex justify-center mt-4">
        <Button disabled={salesData?.page <= 1} onClick={() => handleFilterChange('page', salesData.page - 1)}>Previous</Button>
        <span className="mx-2">Page {salesData?.page} of {salesData?.pages}</span>
        <Button disabled={salesData?.page >= salesData?.pages} onClick={() => handleFilterChange('page', salesData.page + 1)}>Next</Button>
      </div>
      */}

      {/* Sale Details Dialog */}
      {viewingSaleId && (
        <SaleDetailsDialog
          isOpen={!!viewingSaleId}
          onClose={closeSaleDetailsDialog}
          saleId={viewingSaleId}
        />
      )}
    </div>
  );
}
