// src/pages/sales/merchant-sales-page.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';
import { apiRequest } from '@/lib/queryClient';
import { BASE_URL } from '@/lib/constants';
import { saleHistoryListSchema, saleDetailsSchema } from '@/shared/schema'; // Your schemas

// Components
import SalesFilterBar from '@/components/sales/sales-filter-bar';
import SalesTable from '@/components/sales/sales-table';
import SaleDetailsDialog from '@/components/sales/sale-details-dialog';
import { Loader2 } from 'lucide-react';
import { subDays, format } from 'date-fns';

export default function MerchantSalesPage() {
  const { user: currentUser, isLoading: isLoadingUser } = useUser();
  const { toast } = useToast();

  // State for filters
  const [filters, setFilters] = useState(() => {
    // Default filter for Merchant: last 30 days
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29); // Last 30 days inclusive
    return {
      search: '',
      dateRange: {
        from: thirtyDaysAgo,
        to: today,
      },
      storeId: null,    // Merchant sees all stores by default
      cashierId: null,  // Merchant sees all cashiers by default
    };
  });

  const [viewingSaleId, setViewingSaleId] = useState(null);

  // Memoize filters for useQuery dependency, converting Dates to strings for API
  const queryFilters = useMemo(() => {
    return {
      search: filters.search || undefined,
      store_id: filters.storeId || undefined,
      cashier_id: filters.cashierId || undefined,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
    };
  }, [filters]);

  // Fetch sales data
  const {
    data: salesResponse,
    isLoading: isLoadingSales,
    isError: isErrorSales,
    error: salesError,
  } = useQuery({
    queryKey: ['merchantSales', queryFilters],
    queryFn: async () => {
      const queryString = new URLSearchParams(queryFilters).toString();
      const res = await apiRequest("GET", `${BASE_URL}/sales?${queryString}`);
      // Validate only the 'sales' array part of the response
      return {
        sales: saleHistoryListSchema.parse(res.sales),
        total: res.total,
        page: res.page,
        pages: res.pages,
        per_page: res.per_page,
      };
    },
    enabled: !isLoadingUser && currentUser?.role === 'merchant',
    staleTime: 60 * 1000, // 1 minute stale time
    onError: (err) => {
      toast({
        title: "Error fetching sales",
        description: err.message || "Could not load sales history.",
        variant: "destructive",
      });
    },
  });

  const sales = salesResponse?.sales || [];

  // Callback for filter changes from SalesFilterBar
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      // Handle dateRange specifically as it's an object
      if (key === 'dateRange') {
        return { ...prev, dateRange: value };
      }
      // Handle 'search' and other direct key-value filters
      if (key === 'search') { // ⭐ Explicitly handle search key ⭐
          return { ...prev, search: value };
      }
      // Handle storeId and cashierId, allowing null to clear filters
      if (key === 'storeId' || key === 'cashierId') {
        return { ...prev, [key]: value === 'all' ? null : value };
      }

      // Handle a potential 'reset' action if your filter bar has one
      if (key === 'reset') {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 29);
        return {
          search: '',
          dateRange: { from: thirtyDaysAgo, to: today },
          storeId: null,
          cashierId: null,
        };
      }
      return { ...prev, [key]: value }; // General case for other filters
    });
  }, []);

  const handleRowClick = (sale) => {
    setViewingSaleId(sale.id);
  };

  const closeSaleDetailsDialog = () => {
    setViewingSaleId(null);
  };

  // --- Conditional Rendering for User Role ---
  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen-minus-header text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'merchant') {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg">
        Access Denied: You do not have permission to view this page. Only Merchants can access this view.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">Overall Sales Performance</h1>

      {/* Sales Filter Bar for Merchant */}
      <SalesFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        showSearchFilter={true}
        showStoreFilter={true}
        showCashierFilter={true}
      />

      {/* Sales Table */}
      <SalesTable
        sales={sales}
        isLoading={isLoadingSales}
        isError={isErrorSales}
        error={salesError}
        onRowClick={handleRowClick}
      />

      {/* Pagination (Future: if your backend returns pagination links and you want to implement it) */}
      {/*
      {salesResponse && salesResponse.pages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-2">
          <Button
            variant="outline"
            onClick={() => handleFilterChange('page', salesResponse.page - 1)}
            disabled={salesResponse.page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-700">Page {salesResponse.page} of {salesResponse.pages}</span>
          <Button
            variant="outline"
            onClick={() => handleFilterChange('page', salesResponse.page + 1)}
            disabled={salesResponse.page >= salesResponse.pages}
          >
            Next
          </Button>
        </div>
      )}
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