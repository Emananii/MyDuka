// src/components/POS/CheckoutSummary.jsx
import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button"; // Assuming this path is correct for your Button component
// You might need these icons if your payment buttons will have them
// import { DollarSign, CreditCard, Smartphone } from 'lucide-react';

/**
 * Helper function to format currency for Kenyan Shillings (KES).
 * Adapted from your example.
 */
const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return "KES 0.00"; // Changed to KES for Kenya context
  return new Intl.NumberFormat("en-KE", { // 'en-KE' for Kenyan locale formatting
    style: "currency",
    currency: "KES",
  }).format(parsed);
};

/**
 * CheckoutSummary Component
 * Displays the cart total and provides options to process the sale.
 *
 * @param {object} props
 * @param {Array<object>} props.cartItems - An array of cart item objects, each with `price` and `quantity`.
 * @param {function(string): void} props.onProcessSale - Callback to trigger sale processing.
 * Takes a payment method string (e.g., 'paid'). Your POSInterfacePage will map this to the Sale model's `payment_status`.
 * @param {boolean} props.isProcessing - Indicates if a sale is currently being processed.
 */
export default function CheckoutSummary({ cartItems, onProcessSale, isProcessing }) {
  // Calculate the grand total from cart items
  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cartItems]);

  const isCartEmpty = cartItems.length === 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Checkout</h2>

      {/* Total Display */}
      <div className="flex justify-between items-center mb-6 py-4 border-t border-b border-gray-200">
        <span className="text-2xl font-bold text-gray-700">Total:</span>
        <span className="text-3xl font-extrabold text-blue-600">{formatCurrency(total)}</span>
      </div>

      {/* Payment Buttons */}
      <div className="flex flex-col space-y-3 mt-auto"> {/* mt-auto pushes buttons to the bottom */}
        <Button
          onClick={() => onProcessSale("paid")} // Example: Pass 'paid' status for cash
          disabled={isProcessing || isCartEmpty}
          className="w-full py-3 text-lg" // Larger buttons for POS
        >
          {/* <DollarSign className="w-5 h-5 mr-2" /> If using icons */}
          Pay Cash
        </Button>

        <Button
          onClick={() => onProcessSale("paid")} // Example: Pass 'paid' status for M-Pesa
          disabled={isProcessing || isCartEmpty}
          variant="secondary"
          className="w-full py-3 text-lg"
        >
          {/* <Smartphone className="w-5 h-5 mr-2" /> If using icons */}
          Pay M-Pesa
        </Button>

        <Button
          onClick={() => onProcessSale("paid")} // Example: Pass 'paid' status for Card
          disabled={isProcessing || isCartEmpty}
          variant="secondary"
          className="w-full py-3 text-lg"
        >
          {/* <CreditCard className="w-5 h-5 mr-2" /> If using icons */}
          Pay Card
        </Button>

        {/* You could add more payment options here (e.g., Credit, Split Payment) */}

        {isProcessing && (
          <p className="text-center text-blue-500 mt-2">Processing sale...</p>
        )}
      </div>
    </div>
  );
}