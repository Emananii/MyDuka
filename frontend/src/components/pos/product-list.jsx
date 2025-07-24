// src/components/POS/ProductList.jsx
import React from 'react';
// Correct path for ProductCard assuming it's in the same directory (src/components/POS/)
import ProductCard from './product-card';
// Correct named import for Spinner and using the alias
import { Spinner } from '@/components/ui/spinner';
// Assuming Alert is a named export from src/components/ui/alert.jsx and follows Shadcn UI prop patterns
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Assuming these exports exist

/**
 * ProductList Component
 * Renders a scrollable list/grid of products, typically results from a search.
 * It handles loading, error, and no-results states.
 *
 * @param {object} props
 * @param {Array<object>} props.products - An array of product objects (posProductDisplaySchema[]).
 * Each product should contain properties required by ProductCard (e.g., store_product_id, name, price, quantity_in_stock).
 * @param {boolean} props.isLoading - True if products are currently being loaded from the API.
 * @param {boolean} props.isError - True if an error occurred during product loading.
 * @param {Error | null} props.error - The error object if isError is true.
 * @param {function(object): void} props.onAddToCart - Callback to add a product to the cart when clicked.
 * @param {string} props.searchTerm - The current search term, used for 'no results' messages.
 */
export default function ProductList({ products, isLoading, isError, error, onAddToCart, searchTerm }) {
  // Common styling for container to match other UI components
  const containerClasses = "bg-white rounded-lg shadow-md p-6 flex flex-col h-full";

  if (isLoading) {
    return (
      <div className={`${containerClasses} justify-center items-center`}>
        {/* Using the correctly imported Spinner component */}
        <Spinner size="lg" className="text-blue-500" />
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`${containerClasses} justify-center items-center`}>
        {/* Adjusted Alert usage assuming Shadcn UI pattern */}
        <Alert variant="destructive">
          <AlertTitle>Error Loading Products</AlertTitle>
          <AlertDescription>
            {error?.message || "Failed to load products. Please try again later."}
          </AlertDescription>
        </Alert>
        {/* Removed redundant message as it's in AlertDescription */}
      </div>
    );
  }

  // Check if products array is empty after loading and without errors
  if (!products || products.length === 0) {
    return (
      <div className={`${containerClasses} justify-center items-center text-center`}>
        <p className="text-gray-500 text-lg">
          {searchTerm.trim() ? (
            <>No products found for "<span className="font-semibold">{searchTerm}</span>".</>
          ) : (
            <>Start typing in the search bar to find products, or browse below.</>
          )}
        </p>
        {/* Potentially add a 'browse all' button here if applicable */}
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Available Products</h2>
      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar"> {/* Custom scrollbar styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard
              key={product.store_product_id} // Crucial for unique identification in lists
              product={product} // Pass the entire product object
              onAddToCart={() => onAddToCart(product)} // Callback for adding to cart
            />
          ))}
        </div>
      </div>
    </div>
  );
}