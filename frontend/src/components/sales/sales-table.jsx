// src/components/sales/SalesTable.jsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Assuming shadcn/ui table components
import { formatCurrency } from "@/lib/utils"; // For currency formatting
import { format } from "date-fns"; // For date formatting

/**
 * SalesTable Component
 * Displays a paginated table of sales with sorting and filtering capabilities.
 *
 * @param {object} props
 * @param {Array<object>} props.sales - An array of sale objects to display.
 * Each sale object should ideally have:
 * - `id`: number (Sale ID)
 * - `total`: number (Total amount of the sale)
 * - `created_at`: string (ISO date string of when the sale was created)
 * - `cashier`: object (with `name` property)
 * - `store`: object (with `name` property)
 * @param {boolean} props.isLoading - Whether the data is currently being loaded.
 * @param {boolean} props.isError - Whether there was an error fetching the data.
 * @param {object | null} props.error - The error object if `isError` is true.
 * @param {function(object): void} props.onRowClick - Callback function when a sale row is clicked.
 * Receives the clicked sale object as an argument.
 */
export default function SalesTable({ sales, isLoading, isError, error, onRowClick }) {

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg shadow-sm">
        <p className="text-gray-600">Loading sales data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center h-48 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm">
        <p>Error loading sales: {error?.message || "An unknown error occurred"}</p>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-lg shadow-sm">
        <p className="text-gray-500">No sales found for the selected criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Sale ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Store</TableHead>
            {/* Add more columns here as needed, e.g., Payment Status, Number of Items */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow
              key={sale.id}
              onClick={() => onRowClick(sale)}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium">#{sale.id}</TableCell>
              <TableCell>{format(new Date(sale.created_at), 'PPP p')}</TableCell> {/* e.g., Jan 1, 2023, 10:30 AM */}
              <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
              {/* Ensure sale.cashier and sale.store objects exist and have a name property */}
              <TableCell>{sale.cashier?.name || 'N/A'}</TableCell>
              <TableCell>{sale.store?.name || 'N/A'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}