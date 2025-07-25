// src/components/POS/product-card.jsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"; // Your Card components
import { Button } from "@/components/ui/button"; // Your Button component
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"; // Your HoverCard components
import { cn } from "@/lib/utils"; // For conditional classNames
import { Info } from "lucide-react"; // Icon for hover info

/**
 * Helper function to format currency for Kenyan Shillings (KES).
 * Assuming this is available globally or in a utils file.
 */
const formatCurrency = (amount) => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return "KES 0.00";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(parsed);
};

// Placeholder for a generic product image if none is available or image fails to load
const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1731939818071-560a98da89c2?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";


/**
 * ProductCard Component
 * Displays a single product with its name, price, and stock.
 * Provides an "Add to Cart" button and a HoverCard for more details.
 *
 * @param {object} props
 * @param {object} props.product - The product object to display, conforming to posProductDisplaySchema.
 * Expected properties:
 * - `store_product_id`: number (unique ID for the product in this store)
 * - `product_name`: string
 * - `price`: number
 * - `quantity_in_stock`: number
 * - `sku`: string | null
 * - `unit`: string
 * - `low_stock_threshold`: number
 * - `last_updated`: string | null
 * - `image_url`: string | null (NEWLY ADDED PROPERTY)
 * @param {function(object): void} props.onAddToCart - Callback to add the product to the cart.
 */
export default function ProductCard({ product, onAddToCart }) {
  const isOutOfStock = product.quantity_in_stock <= 0;
  const isLowStock = product.quantity_in_stock > 0 && product.quantity_in_stock <= product.low_stock_threshold;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card
          className={cn(
            "relative flex flex-col justify-between h-full cursor-pointer transition-all duration-200 ease-in-out",
            "hover:shadow-lg hover:border-blue-300", // Hover effect
            isOutOfStock && "opacity-60 cursor-not-allowed", // Dim if out of stock
            isLowStock && "border-yellow-400 ring-1 ring-yellow-400" // Highlight if low stock
          )}
        >
          {/* Image Section - ADDED THIS BLOCK */}
          <div className="relative w-full h-36 bg-gray-100 flex items-center justify-center overflow-hidden rounded-t-lg">
            <img
              src={product.image_url || DEFAULT_PRODUCT_IMAGE}
              alt={product.product_name || "Product Image"}
              className="w-full h-full object-cover" // Ensure image fills the space without distortion
              onError={(e) => {
                e.currentTarget.onerror = null; // Prevents infinite loop on error
                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE; // Fallback image on error
              }}
            />
          </div>
          {/* END Image Section */}

          <CardHeader className="pb-2 pt-3"> {/* Adjusted padding-top slightly after image */}
            <CardTitle className="text-lg font-semibold leading-tight line-clamp-2"> {/* line-clamp for multiline titles */}
              {product.product_name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 line-clamp-1"> {/* line-clamp for SKU */}
              {product.sku || "No SKU"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow pt-0 pb-4">
            <p className="text-xl font-bold text-blue-600 mb-2">
              {formatCurrency(product.price)}
            </p>
            <p className={cn(
                "text-sm font-medium",
                isOutOfStock ? "text-red-600" : (isLowStock ? "text-yellow-600" : "text-green-600")
            )}>
              Stock: {isOutOfStock ? "Out of Stock" : `${product.quantity_in_stock} ${product.unit}`}
            </p>
          </CardContent>
          <div className="p-4 pt-0">
            <Button
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              className="w-full"
            >
              {isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>

          {/* Info icon for HoverCard trigger, positioned absolutely */}
          <div className="absolute top-2 right-2 z-10"> {/* Added z-10 to ensure it's above the image */}
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </div>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm">
        <div className="flex justify-between space-x-4">
          <div className="space-y-1">
            <h4 className="text-base font-semibold">{product.product_name}</h4>
            <p className="text-gray-700">SKU: {product.sku || "N/A"}</p>
            <p className="text-gray-700">Unit: {product.unit}</p>
            <p className="text-gray-700">Threshold: {product.low_stock_threshold}</p>
            <p className="text-gray-700">
              Last Updated:{" "}
              {product.last_updated
                ? new Date(product.last_updated).toLocaleString()
                : "N/A"}
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}