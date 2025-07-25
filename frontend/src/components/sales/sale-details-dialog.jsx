// src/components/sales/sale-details-dialog.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added for accessibility if needed
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter, // Added for subtotal display
} from "@/components/ui/table"; // Assuming shadcn/ui table components
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient"; // Assuming apiRequest handles fetching
import { BASE_URL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils"; // For currency formatting
import { format } from "date-fns"; // For date formatting
import { Loader2 } from 'lucide-react'; // For loading spinner

/**
 * SaleDetailsDialog Component
 * Displays a modal with comprehensive details of a specific sale.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controls the visibility of the dialog.
 * @param {function(): void} props.onClose - Callback function to close the dialog.
 * @param {number | null} props.saleId - The ID of the sale to display details for.
 * If null, the dialog will not attempt to fetch data.
 */
export default function SaleDetailsDialog({ isOpen, onClose, saleId }) {
  const {
    data: sale,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['saleDetails', saleId],
    queryFn: () => apiRequest("GET", `${BASE_URL}/sales/${saleId}`),
    enabled: !!saleId && isOpen, // Only fetch if saleId is provided and dialog is open
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
  });

  // Handle various states: loading, error, or no sale data
  let content;
  if (isLoading) {
    content = (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
        <p className="text-gray-600">Loading sale details...</p>
      </div>
    );
  } else if (isError) {
    content = (
      <div className="text-center py-10 text-red-700">
        <p>Error loading sale details: {error?.message || "An unknown error occurred"}</p>
        <p className="text-sm text-gray-500 mt-2">Please try again or check your network connection.</p>
      </div>
    );
  } else if (!sale) {
    content = (
      <div className="text-center py-10 text-gray-500">
        <p>No sale details available.</p>
      </div>
    );
  } else {
    // Sale data is available, display details
    content = (
      <div className="space-y-6">
        {/* Sale Summary */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
          <div>
            <strong>Invoice No.:</strong> <span className="text-gray-700">{sale.invoice_number || 'N/A'}</span>
          </div>
          <div>
            <strong>Date:</strong> <span className="text-gray-700">{sale.created_at ? format(new Date(sale.created_at), 'PPP p') : 'N/A'}</span>
          </div>
          <div>
            <strong>Cashier:</strong> <span className="text-gray-700">{sale.cashier?.name || 'N/A'}</span>
          </div>
          <div>
            <strong>Store:</strong> <span className="text-gray-700">{sale.store?.name || 'N/A'}</span>
          </div>
          <div>
            <strong>Payment Method:</strong> <span className="text-gray-700">{sale.payment_method || 'N/A'}</span>
          </div>
          <div>
            <strong>Status:</strong> <span className="text-gray-700 capitalize">{sale.status || 'N/A'}</span>
          </div>
        </div>

        {/* Sale Items Table */}
        <div>
          <h4 className="font-semibold text-md mb-2 text-gray-800">Items:</h4>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.sale_items && sale.sale_items.length > 0 ? (
                  sale.sale_items.map((item) => (
                    <TableRow key={item.product_id || Math.random()}> {/* Using product_id or random for key */}
                      <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity} {item.unit || ''}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                      No items found for this sale.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {/* Optional: Table Footer for Grand Total of items */}
              {sale.sale_items && (
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell colSpan={3} className="text-right">Grand Total:</TableCell>
                    <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>

        {/* You can add more details here if your sale object has them, e.g., discounts, taxes, customer info */}
        {/*
        <div className="text-sm">
            <strong>Notes:</strong> {sale.notes || 'None'}
        </div>
        */}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-800">
            Sale Details #{saleId || ''}
          </DialogTitle>
          <DialogDescription>
            View comprehensive information about this transaction.
          </DialogDescription>
        </DialogHeader>

        {content} {/* Render the dynamic content here */}
      </DialogContent>
    </Dialog>
  );
}