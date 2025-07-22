import React from 'react';

/**
 * SaleItemRow Component
 * Displays a single item in the shopping cart with quantity controls and a remove option.
 *
 * @param {object} props
 * @param {object} props.item - The cart item object, expected to have:
 * `store_product_id`: The unique ID of the store product.
 * `name`: The name of the product.
 * `price`: The price per unit of the product.
 * `quantity`: The current quantity of the product in the cart.
 * @param {function(number, number): void} props.onUpdateQuantity - Callback to update the item's quantity.
 * (storeProductId, newQuantity)
 * @param {function(number): void} props.onRemoveItem - Callback to remove the item from the cart.
 * (storeProductId)
 */
export default function SaleItemRow({ item, onUpdateQuantity, onRemoveItem }) {
  const itemSubtotal = item.price * item.quantity;

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onUpdateQuantity(item.store_product_id, newQuantity);
    }
  };

  const handleIncreaseQuantity = () => {
    onUpdateQuantity(item.store_product_id, item.quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (item.quantity > 1) { // Prevent quantity from going below 1 via this button
      onUpdateQuantity(item.store_product_id, item.quantity - 1);
    } else {
      // If quantity is 1 and decreased, remove the item
      onRemoveItem(item.store_product_id);
    }
  };

  const handleRemoveClick = () => {
    onRemoveItem(item.store_product_id);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md shadow-sm border border-gray-100">
      {/* Product Name & Price */}
      <div className="flex-1 min-w-0 pr-4">
        <h3 className="text-lg font-medium text-gray-900 truncate">{item.name}</h3>
        <p className="text-sm text-gray-600">Price: ${item.price.toFixed(2)}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center space-x-2">
        {/* Decrease Button */}
        <button
          onClick={handleDecreaseQuantity}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          type="button"
          aria-label="Decrease quantity"
        >
          -
        </button>
        {/* Quantity Input */}
        <input
          type="number"
          min="0" // Allow 0 to enable direct removal by typing 0
          value={item.quantity}
          onChange={handleQuantityChange}
          className="flex h-9 w-16 rounded-md border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Quantity of ${item.name}`}
        />
        {/* Increase Button */}
        <button
          onClick={handleIncreaseQuantity}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          type="button"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {/* Item Subtotal */}
      <div className="w-24 text-right pl-4">
        <span className="font-semibold text-gray-900">${itemSubtotal.toFixed(2)}</span>
      </div>

      {/* Remove Button */}
      <div className="ml-4">
        <button
          onClick={handleRemoveClick}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 w-9"
          type="button"
          aria-label="Remove item"
        >
          {/* Using a simple X or icon if you have one */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    </div>
  );
}