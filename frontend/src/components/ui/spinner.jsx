// src/components/ui/spinner.jsx
import * as React from "react";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility for class merging

/**
 * A customizable spinner component.
 * Displays a rotating circle animation to indicate loading or processing.
 *
 * @param {object} props - Component props.
 * @param {string} [props.size='md'] - The size of the spinner.
 * Can be 'sm' (h-4 w-4), 'md' (h-6 w-6), 'lg' (h-8 w-8), or 'xl' (h-10 w-10).
 * @param {string} [props.className] - Additional Tailwind CSS classes to apply.
 * @returns {JSX.Element} The Spinner component.
 */
const Spinner = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-10 w-10",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-t-2 border-gray-900 border-t-transparent", // Default spinner style
        sizeClasses[size], // Apply size based on prop
        className // Apply any additional custom classes
      )}
      role="status" // Accessibility role
      aria-label="Loading" // Accessibility label
    >
      <span className="sr-only">Loading...</span>{" "}
      {/* Visually hidden text for screen readers */}
    </div>
  );
};

export { Spinner };