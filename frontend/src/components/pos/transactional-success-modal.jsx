// src/components/POS/TransactionSuccessModal.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle } from 'lucide-react'; // Using lucide-react for icons
import { formatCurrency } from '@/lib/utils'; // Assuming you'll move formatCurrency to a common utils file
// If not using a common utils file, you can define formatCurrency directly here:
/*
const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return "KES 0.00";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(parsed);
};
*/

/**
 * TransactionSuccessModal Component
 * Displays a modal confirming a successful transaction, showing a summary,
 * and providing options like printing a receipt.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {function(): void} props.onClose - Callback function to close the modal.
 * @param {object | null} props.saleDetails - The details of the successfully completed sale
 * (conforms to saleDetailsSchema).
 * Can be null if no sale details are available.
 * @param {function(): void} [props.onPrintReceipt] - Optional callback to trigger printing the receipt.
 */
export default function TransactionSuccessModal({ isOpen, onClose, saleDetails, onPrintReceipt }) {
  // Fallback for saleDetails if it's null or undefined
  const sale = saleDetails || {
    id: 'N/A',
    total: 0,
    payment_status: 'N/A',
    cashier: { name: 'N/A' },
    store: { name: 'N/A' },
    sale_items: [],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md"> {/* Adjust max-width as needed */}
        <DialogHeader>
          <DialogTitle className="flex items-center text-green-600">
            <CheckCircle className="w-6 h-6 mr-2" /> Transaction Successful!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-gray-700">
          <p className="text-lg font-semibold text-center">
            Sale ID: <span className="text-blue-600">{sale.id}</span>
          </p>
          <div className="flex justify-between items-center text-xl font-bold border-t border-b py-2 my-2">
            <span>Total:</span>
            <span className="text-green-700">{formatCurrency(sale.total)}</span>
          </div>

          <div className="space-y-2 text-sm">
            <p><strong>Payment Status:</strong> <span className="capitalize">{sale.payment_status}</span></p>
            <p><strong>Cashier:</strong> {sale.cashier?.name}</p>
            <p><strong>Store:</strong> {sale.store?.name}</p>
          </div>

          {sale.sale_items && sale.sale_items.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-md mb-2">Items:</h3>
              <ul className="space-y-1 text-sm max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 rounded-md p-2">
                {sale.sale_items.map(item => (
                  <li key={item.store_product_id || item.id} className="flex justify-between">
                    <span>{item.quantity} x {item.store_product?.name || 'Unknown Product'}</span>
                    <span>{formatCurrency(item.price_at_sale * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          {onPrintReceipt && ( // Only show print button if onPrintReceipt callback is provided
            <Button variant="outline" onClick={onPrintReceipt}>
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}