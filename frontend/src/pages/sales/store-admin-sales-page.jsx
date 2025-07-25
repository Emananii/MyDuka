// src/pages/sales/store-admin-sales-page.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext'; // Assuming you have a UserContext
import { apiRequest } from '@/lib/queryClient';
import { BASE_URL } from '@/lib/constants';
import { saleHistoryListSchema, saleDetailsSchema } from '@/shared/schema'; // Your schemas

// Components
import SalesFilterBar from '@/components/sales/sales-filter-bar';
import SalesTable from '@/components/sales/sales-table';
import SaleDetailsDialog from '@/components/sales/sale-details-dialog';
import { Loader2 } from 'lucide-react'; // For loading user context
import { subDays, format } from 'date-fns'; // For date calculations and formatting

export default function StoreAdminSalesPage() {
  const { user: currentUser, isLoading: isLoadingUser } = useUser(); // Get logged-in user from context
  const { toast } = useToast();

  // State for filters, initialized based on admin's store and a default date range
  const [filters, setFilters] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 29); // Default to last 30 days for admin
    return {
      search: '',
      dateRange: {
        from: thirtyDaysAgo,
        to: today,
      },
      storeId: currentUser?.store_id || null, // Default to current admin's store_id
      cashierId: null,  // Admin can filter by any cashier in their store
    };
  });

  const [viewingSaleId, setViewingSaleId] = useState(null); // State for opening sale details dialog

  // Memoize filters for useQuery dependency, converting Dates to strings for API
  const queryFilters = useMemo(() => {
    // Ensure store_id is always present in filters for admin
    const adminStoreId = currentUser?.store_id || filters.storeId; // Use current user's store_id if available

    return {
      search: filters.search || undefined,
      store_id: adminStoreId || undefined, // IMPORTANT: Always send the admin's store_id
      cashier_id: filters.cashierId || undefined,
      start_date: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
    };
  }, [filters, currentUser]); // currentUser is a dependency here as store_id comes from it

  // Fetch sales data
  const {
    data: salesResponse,
    isLoading: isLoadingSales,
    isError: isErrorSales,
    error: salesError,
  } = useQuery({
    queryKey: ['adminSales', queryFilters],
    queryFn: async () => {
      // If no admin store_id is available, return empty data
      if (!queryFilters.store_id) {
        return { sales: [], total: 0, page: 1, pages: 1, per_page: 10 };
      }
      const queryString = new URLSearchParams(queryFilters).toString();
      const res = await apiRequest("GET", `${BASE_URL}/sales?${queryString}`);
      return {
        sales: saleHistoryListSchema.parse(res.sales),
        total: res.total,
        page: res.page,
        pages: res.pages,
        per_page: res.per_page,
      };
    },
    // Only enable query if user loaded, is an admin, AND a store_id is set
    enabled: !isLoadingUser && currentUser?.role === 'admin' && !!queryFilters.store_id,
    staleTime: 60 * 1000, // 1 minute stale time
    onError: (err) => {
      toast({
        title: "Error fetching sales",
        description: err.message || "Could not load sales history for your store.",
        variant: "destructive",
      });
    },
  });

  const sales = salesResponse?.sales || []; // Extract the actual sales array for the table

  // Callback for filter changes from SalesFilterBar
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => {
      if (key === 'dateRange') {
        return { ...prev, dateRange: value };
      }
      if (key === 'reset') {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 29);
        return {
          search: '',
          dateRange: { from: thirtyDaysAgo, to: today },
          storeId: currentUser?.store_id || null, // Reset to current admin's store_id
          cashierId: null,
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

  // --- Conditional Rendering for User Role ---
  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen-minus-header text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p>Loading user data...</p>
      </div>
    );
  }

  // Access control: only allow 'admin' role
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-6 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg">
        Access Denied: You do not have permission to view this page. Only Store Admins can access this view.
      </div>
    );
  }

  // If admin doesn't have a store_id assigned, they can't see store sales
  if (!currentUser.store_id) {
    return (
      <div className="p-6 text-center text-orange-600 bg-orange-50 border border-orange-200 rounded-lg">
        Your admin account is not assigned to a specific store. Please contact a Merchant.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-800">Sales for {currentUser.store?.name || `Store ID ${currentUser.store_id}`}</h1>

      {/* Sales Filter Bar for Store Admin */}
      <SalesFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        showSearchFilter={true}
        showStoreFilter={false}    // Admin filters sales only for their store, doesn't select other stores
        showCashierFilter={true}   // Admin can filter by cashiers within their store
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