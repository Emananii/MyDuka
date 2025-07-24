// src/components/POS/ProductSearchInput.jsx
import React from 'react';
import { Input } from "@/components/ui/input"; // Assuming this path is correct for your Input component
// You might also want a search icon, for example, from lucide-react
// import { Search } from 'lucide-react';

/**
 * ProductSearchInput Component
 * Provides a search input field for products.
 * The actual search logic (e.g., debouncing, API call) is handled by the parent component.
 *
 * @param {object} props
 * @param {string} props.value - The current value of the search input, controlled by the parent.
 * @param {function(string): void} props.onSearchChange - Callback function triggered when the input value changes.
 * It receives the new search term as a string.
 */
export default function ProductSearchInput({ value, onSearchChange }) {
  const handleChange = (e) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4"> {/* Adjusted padding and margin */}
      <label htmlFor="product-search" className="sr-only">Search Products</label>
      <div className="relative">
        {/* You could optionally add a search icon here if your design requires it */}
        {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /> */}
        <Input
          id="product-search"
          type="text"
          placeholder="Search products by name or SKU..."
          value={value}
          onChange={handleChange}
          className="w-full pl-4 pr-4 py-2 text-base" // Adjust padding if you add an icon
        />
      </div>
    </div>
  );
}