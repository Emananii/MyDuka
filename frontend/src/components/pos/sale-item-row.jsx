// src/components/POS/SaleItemRow.jsx
import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils'; // Import formatCurrency from utils

// Placeholder for a generic product image if none is available or image fails to load
const DEFAULT_CART_IMAGE = "https://picsum.photos/id/1084/60/60?grayscale&blur=1"; // A small, generic, slightly blurred image

/**
 * SaleItemRow Component
 * Displays a single item in the shopping cart with its image, name, price,
 * quantity controls, and a remove option.
 *
 * @param {object} props
 * @param {object} props.item - The cart item object. Expected to have:
 * `store_product_id`: Unique ID for the product in the store.
 * `name`: Product name.
 * `price`: Price of the product.
 * `quantity`: The current quantity of the product in the cart.
 * `image_url`: string | null (URL to the product image thumbnail).
 * `unit`: string (added for display)
 * `sku`: string (added for display)
 * @param {function(number, number): void} props.onUpdateQuantity - Callback to update an item's quantity.
 * (storeProductId, newQuantity)
 * @param {function(number): void} props.onRemoveItem - Callback to remove an item from the cart.
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
    if (item.quantity <= 1) { // If quantity is 1 or less, remove item on decrement
      onRemoveItem(item.store_product_id);
    } else {
      onUpdateQuantity(item.store_product_id, item.quantity - 1);
    }
  };

  const handleRemoveClick = () => {
    onRemoveItem(item.store_product_id);
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Product Image Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-200 flex items-center justify-center">
        <img
          src={item.image_url || DEFAULT_CART_IMAGE}
          alt={item.name || "Product"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null; // Prevent infinite loop on error
            e.currentTarget.src = DEFAULT_CART_IMAGE; // Fallback on error
          }}
        />
      </div>

      {/* Product Name and Price - ADJUSTED WIDTH HERE */}
      <div className="flex-grow flex flex-col justify-center pr-2" style={{ minWidth: '120px' }}> {/* Added inline style for min-width */}
        <h3 className="text-base font-medium text-gray-800 line-clamp-2">{item.name}</h3>
        <p className="text-sm text-gray-500">{formatCurrency(item.price)} per {item.unit || 'unit'}</p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecreaseQuantity}
          disabled={item.quantity <= 0}
          className="h-7 w-7"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min="0"
          value={item.quantity}
          onChange={handleQuantityChange}
          className="w-12 text-center h-7 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={`Quantity of ${item.name}`}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleIncreaseQuantity}
          className="h-7 w-7"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Item Subtotal */}
      <div className="flex-shrink-0 w-24 text-right pl-3">
        <span className="font-semibold text-gray-800 text-base">
          {formatCurrency(itemSubtotal)}
        </span>
      </div>

      {/* Remove Button */}
      <div className="flex-shrink-0 ml-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemoveClick}
          className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 w-8"
          aria-label={`Remove ${item.name} from cart`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}