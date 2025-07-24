// src/components/POS/CartDisplay.jsx
import React from 'react';
import SaleItemRow from './sale-item-row'; // Assuming SaleItemRow will be created in the same folder

/**
 * CartDisplay Component
 * Displays the list of items currently in the shopping cart and calculates the running total.
 *
 * @param {object} props
 * @param {Array<object>} props.cartItems - An array of cart item objects. Each item should have:
 * - `store_product_id`: Unique ID for the product in the store.
 * - `name`: Product name.
 * - `price`: Price of the product.
 * - `quantity`: Quantity of the product in the cart.
 * @param {function(number, number): void} props.onUpdateQuantity - Callback to update an item's quantity.
 * (storeProductId, newQuantity)
 * @param {function(number): void} props.onRemoveItem - Callback to remove an item from the cart.
 * (storeProductId)
 */
export default function CartDisplay({ cartItems, onUpdateQuantity, onRemoveItem }) {
  // Calculate the total amount of all items in the cart
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col h-full">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Shopping Cart</h2>

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        {cartItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items in cart. Add products to start a sale!</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <SaleItemRow
                key={item.store_product_id} // Unique key for each item in the cart
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-xl font-bold text-gray-800">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {/* Additional lines for tax, discount, etc., can go here if applicable */}
      </div>
    </div>
  );
}